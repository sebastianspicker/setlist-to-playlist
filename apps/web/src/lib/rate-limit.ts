export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export interface InMemoryRateLimiter {
  take: (key: string) => RateLimitResult;
}

/**
 * Small in-memory fixed-window rate limiter.
 * Works per-instance and is intended as a lightweight abuse guard.
 */
export function createInMemoryRateLimiter(
  maxRequests: number,
  windowMs: number
): InMemoryRateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    take(key: string): RateLimitResult {
      const now = Date.now();
      const current = buckets.get(key);
      if (!current || now >= current.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
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

export function extractClientKeyFromHeaders(
  headers: Headers,
  fallback = "unknown"
): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? fallback;
}
