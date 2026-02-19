import { SETLIST_FM_BASE_URL } from "@repo/shared";

/** Extract setlist ID from setlist.fm URL or return trimmed input as raw ID. */
export function parseSetlistIdFromInput(idOrUrl: string): string | null {
  const trimmed = idOrUrl.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.includes("setlist.fm")
  ) {
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      // DCI-060: only accept URLs whose host is setlist.fm (reject third-party domains containing "setlist.fm" in path)
      if (!url.hostname.toLowerCase().includes("setlist.fm")) return null;
      const path = url.pathname;
      // e.g. /setlist/.../63de4613.html or .../abc1.html (DCI-005: allow 4-12 hex chars)
      const match = path.match(/-([a-f0-9]{4,12})\.html$/i);
      if (match) return match[1];
      // fallback: last path segment without .html
      const segment = path.split("/").filter(Boolean).pop() ?? "";
      const withoutHtml = segment.replace(/\.html$/i, "");
      const idPart = withoutHtml.split("-").pop();
      if (idPart && /^[a-f0-9]{4,12}$/i.test(idPart)) return idPart;
      if (withoutHtml && /^[a-f0-9-]+$/i.test(withoutHtml)) return withoutHtml;
    } catch {
      return null;
    }
    return null;
  }

  // raw ID (alphanumeric, possibly with hyphens)
  if (/^[a-f0-9-]{4,64}$/i.test(trimmed)) return trimmed;
  return null;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, { body: unknown; expires: number }>();

function getCached(id: string): unknown | null {
  const entry = cache.get(id);
  if (!entry || Date.now() > entry.expires) {
    if (entry) cache.delete(id);
    return null;
  }
  return entry.body;
}

/** DCI-038: Evict expired entries. DCI-048: Only run eviction when over threshold to avoid O(n) on every write. */
const CACHE_EVICT_THRESHOLD = 200;

function evictExpired(): void {
  const now = Date.now();
  const toDelete: string[] = [];
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expires) toDelete.push(key);
  }
  toDelete.forEach((k) => cache.delete(k));
}

function setCached(id: string, body: unknown): void {
  cache.set(id, { body, expires: Date.now() + CACHE_TTL_MS });
  if (cache.size > CACHE_EVICT_THRESHOLD) {
    evictExpired();
  }
}

const MAX_RETRIES_429 = 2;
const BACKOFF_MS = 1000;

export type FetchSetlistResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; message: string };

export async function fetchSetlistFromApi(
  setlistId: string,
  apiKey: string
): Promise<FetchSetlistResult> {
  const cached = getCached(setlistId);
  if (cached !== null) return { ok: true, body: cached };

  const url = `${SETLIST_FM_BASE_URL}/setlist/${encodeURIComponent(setlistId)}`;
  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    Accept: "application/json",
  };

  let lastStatus = 0;
  let lastMessage = "";

  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    const res = await fetch(url, { headers });
    lastStatus = res.status;

    if (res.ok) {
      let body: unknown;
      try {
        body = (await res.json()) as unknown;
      } catch {
        return {
          ok: false,
          status: 502,
          message: "Invalid response from setlist.fm (non-JSON body).",
        };
      }
      setCached(setlistId, body);
      return { ok: true, body };
    }

    const text = await res.text();
    try {
      const json = JSON.parse(text) as { message?: string };
      lastMessage = json.message ?? (text || res.statusText);
    } catch {
      lastMessage = text || res.statusText;
    }

    if (res.status === 429 && attempt < MAX_RETRIES_429) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS * (attempt + 1)));
      continue;
    }

    break;
  }

  if (lastStatus === 429) {
    return {
      ok: false,
      status: 429,
      message: "setlist.fm rate limit exceeded. Please try again in a moment.",
    };
  }

  return {
    ok: false,
    status: lastStatus,
    message: lastMessage || `setlist.fm returned ${lastStatus}`,
  };
}
