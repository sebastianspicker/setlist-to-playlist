export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export interface InMemoryRateLimiter {
  take: (key: string) => RateLimitResult;
}

/** Threshold at which expired-bucket cleanup runs. */
const CLEANUP_THRESHOLD = 1000;

/** Hard cap — if still above this after expiry sweep, drop oldest entries (FIFO). */
const MAX_BUCKETS = 5000;

/**
 * Small in-memory fixed-window rate limiter.
 * Works per-instance and is intended as a lightweight abuse guard.
 *
 * Includes automatic memory-leak prevention:
 * - When the bucket count exceeds {@link CLEANUP_THRESHOLD}, expired entries are swept.
 * - If the count still exceeds {@link MAX_BUCKETS}, the oldest entries (by insertion
 *   order) are removed until the map is back at the limit.
 */
export function createInMemoryRateLimiter(
  maxRequests: number,
  windowMs: number,
  {
    cleanupThreshold = CLEANUP_THRESHOLD,
    maxBuckets = MAX_BUCKETS,
  }: { cleanupThreshold?: number; maxBuckets?: number } = {}
): InMemoryRateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  /** Remove expired buckets and, if still over the hard cap, evict oldest entries. */
  function cleanup(now: number): void {
    // Phase 1: sweep expired entries
    for (const [k, v] of buckets) {
      if (now >= v.resetAt) {
        buckets.delete(k);
      }
    }

    // Phase 2: if still over the hard cap, delete oldest (FIFO) entries
    if (buckets.size > maxBuckets) {
      const excess = buckets.size - maxBuckets;
      let deleted = 0;
      for (const k of buckets.keys()) {
        if (deleted >= excess) break;
        buckets.delete(k);
        deleted++;
      }
    }
  }

  return {
    take(key: string): RateLimitResult {
      const now = Date.now();
      const current = buckets.get(key);
      if (!current || now >= current.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });

        if (buckets.size > cleanupThreshold) {
          cleanup(now);
        }

        return {
          limited: false,
          retryAfterSeconds: Math.ceil(windowMs / 1000),
          remaining: Math.max(0, maxRequests - 1),
        };
      }

      current.count += 1;
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      if (current.count > maxRequests) {
        return { limited: true, retryAfterSeconds, remaining: 0 };
      }
      return {
        limited: false,
        retryAfterSeconds,
        remaining: Math.max(0, maxRequests - current.count),
      };
    },
  };
}

/**
 * Extract a client identifier from request headers for rate limiting.
 *
 * **Important:** This relies on `X-Forwarded-For` and `X-Real-IP` headers,
 * which are only trustworthy when the application sits behind a trusted
 * reverse proxy (e.g., Vercel, nginx, Cloudflare) that sets these headers.
 * Without a trusted proxy, clients can spoof these headers to bypass rate limits.
 */
export function extractClientKeyFromHeaders(headers: Headers, fallback = 'unknown'): string {
  const trustProxy = process.env.TRUST_PROXY === '1';
  if (!trustProxy) {
    return fallback;
  }

  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip') ?? fallback;
}
