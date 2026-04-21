import { SETLIST_FM_BASE_URL } from '@repo/shared';

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

/** Evict expired entries when cache exceeds this size. */
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
  // Skip caching oversized responses to prevent memory bloat.
  if (JSON.stringify(body).length > 500_000) return;

  cache.set(id, { body, expires: Date.now() + CACHE_TTL_MS });
  if (cache.size > CACHE_EVICT_THRESHOLD) {
    evictExpired();
  }
  if (cache.size > CACHE_EVICT_THRESHOLD) {
    const excess = cache.size - CACHE_EVICT_THRESHOLD;
    const keys = [...cache.keys()];
    for (let i = 0; i < excess; i++) cache.delete(keys[i]);
  }
}

const MAX_RETRIES_429 = 2;
const BACKOFF_MS = 1000;

export type FetchSetlistResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; message: string };

/** Fetch a setlist from the setlist.fm API, with caching and 429 retry. */
export async function fetchSetlistFromApi(
  setlistId: string,
  apiKey: string
): Promise<FetchSetlistResult> {
  const cached = getCached(setlistId);
  if (cached !== null) return { ok: true, body: cached };

  const url = `${SETLIST_FM_BASE_URL}/setlist/${encodeURIComponent(setlistId)}`;
  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    Accept: 'application/json',
  };

  let lastStatus = 0;
  let lastMessage = '';

  // Retry up to MAX_RETRIES_429 times on 429; break immediately on any other non-OK status.
  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    const res = await fetch(url, { headers });
    lastStatus = res.status;

    if (res.ok) {
      let body: unknown;
      try {
        body = (await res.json()) as unknown;
        // Setlist responses must be objects, not JSON primitives.
        if (!body || typeof body !== 'object') {
          throw new Error('Invalid structure');
        }
      } catch {
        return {
          ok: false,
          status: 502,
          message: 'Invalid response from setlist.fm (non-JSON body).',
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

    if (res.status === 429) {
      if (attempt < MAX_RETRIES_429) {
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS));
        continue;
      }
      return {
        ok: false,
        status: 429,
        message: lastMessage || 'setlist.fm rate limit exceeded. Please try again in a moment.',
      };
    }

    break; // non-429 errors don't benefit from retrying
  }

  return {
    ok: false,
    status: lastStatus,
    message: lastMessage || `setlist.fm returned ${lastStatus}`,
  };
}
