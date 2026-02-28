import { SETLIST_FM_BASE_URL } from "@repo/shared";

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

/** 
 * Defines a structural upper limit for the local memory cache to avoid performance degradation.
 * Exceeding this threshold triggers an O(n) eviction process exactly once.
 */
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
  // DCI-037: Removed expensive JSON.stringify(body).length check. 
  // With CACHE_EVICT_THRESHOLD at 200, the risk of OOM from standard setlist JSON is negligible.

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

/**
 * Main logical handler to fetch setlist data from the external Setlist.fm API instance.
 * @param setlistId The cleaned identifier string (e.g. '63de4613').
 * @param apiKey The secret authorization token provided for Setlist.fm.
 */
export async function fetchSetlistFromApi(
  setlistId: string,
  apiKey: string
): Promise<FetchSetlistResult> {
  // Always query our local memory cache first to severely reduce repeated outbound calls and save rate limit points.
  const cached = getCached(setlistId);
  if (cached !== null) return { ok: true, body: cached };

  const url = `${SETLIST_FM_BASE_URL}/setlist/${encodeURIComponent(setlistId)}`;
  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    Accept: "application/json",
  };

  let lastStatus = 0;
  let lastMessage = "";

  // Iteratively fetch the API up to the allowed retry limit since Setlist.fm can rigidly reject too frequent requests instantly (HTTP 429).
  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    const res = await fetch(url, { headers });
    lastStatus = res.status;

    if (res.ok) {
      let body: unknown;
      try {
        body = (await res.json()) as unknown;
        // Verify JSON was parsed as a structural object since parsing primitive types is valid in standard JSON but invalid for our logic.
        if (!body || typeof body !== "object") {
          throw new Error("Invalid structure");
        }
      } catch {
        return {
          ok: false,
          status: 502,
          message: "Invalid response from setlist.fm (non-JSON body).",
        };
      }

      // Store the successful data in memory to serve future identical requests efficiently.
      setCached(setlistId, body);
      return { ok: true, body };
    }

    // Encountering an error response: Record the response body for troubleshooting. 
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { message?: string };
      lastMessage = json.message ?? (text || res.statusText);
    } catch {
      lastMessage = text || res.statusText;
    }

    // Rate Limit Condition: When we encounter an HTTP 429, pause processing iteratively by waiting via the designated backoff interval.
    if (res.status === 429) {
      if (attempt < MAX_RETRIES_429) {
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS));
        continue;
      }
      return {
        ok: false,
        status: 429,
        message: lastMessage || "setlist.fm rate limit exceeded. Please try again in a moment.",
      };
    }

    // All other HTTP status codes (404, 500, etc) immediately terminate the retry loop.
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
