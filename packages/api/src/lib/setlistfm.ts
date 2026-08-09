import { fetchUncachedSetlist } from './setlistfm-request.js';
import type { FetchSetlistResult } from './setlistfm-types.js';

export type { FetchSetlistResult } from './setlistfm-types.js';

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_EVICT_THRESHOLD = 200;
const MAX_CACHEABLE_BODY_CHARS = 500_000;
const cache = new Map<string, { body: unknown; expires: number }>();
const inFlight = new Map<string, Promise<FetchSetlistResult>>();

const getCached = (id: string): unknown | null => {
  const entry = cache.get(id);
  if (!entry || Date.now() > entry.expires) {
    if (entry) cache.delete(id);
    return null;
  }
  return entry.body;
};

const evictExpired = (): void => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expires) cache.delete(key);
  }
};

const evictOldest = (): void => {
  let remaining = cache.size - CACHE_EVICT_THRESHOLD;
  for (const key of cache.keys()) {
    cache.delete(key);
    if (--remaining <= 0) return;
  }
};

const setCached = (id: string, body: unknown): void => {
  if (JSON.stringify(body).length > MAX_CACHEABLE_BODY_CHARS) return;
  cache.set(id, { body, expires: Date.now() + CACHE_TTL_MS });
  if (cache.size > CACHE_EVICT_THRESHOLD) evictExpired();
  if (cache.size > CACHE_EVICT_THRESHOLD) evictOldest();
};

/** Fetch a setlist from the setlist.fm API with caching, coalescing, and bounded retries. */
export async function fetchSetlistFromApi(
  setlistId: string,
  apiKey: string
): Promise<FetchSetlistResult> {
  const cached = getCached(setlistId);
  if (cached !== null) return { ok: true, body: cached };

  const existing = inFlight.get(setlistId);
  if (existing) return existing;

  const pending = fetchUncachedSetlist(setlistId, apiKey, (body) => setCached(setlistId, body));
  inFlight.set(setlistId, pending);
  try {
    return await pending;
  } finally {
    if (inFlight.get(setlistId) === pending) inFlight.delete(setlistId);
  }
}
