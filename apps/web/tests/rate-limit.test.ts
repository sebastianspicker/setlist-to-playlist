import { describe, it, expect, vi, afterEach } from 'vitest';
import { createInMemoryRateLimiter, extractClientKeyFromHeaders } from '../src/lib/rate-limit';

describe('createInMemoryRateLimiter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('limits when requests exceed threshold', () => {
    const limiter = createInMemoryRateLimiter(2, 60_000);
    expect(limiter.take('ip-1').limited).toBe(false);
    expect(limiter.take('ip-1').limited).toBe(false);
    expect(limiter.take('ip-1').limited).toBe(true);
  });

  it('tracks buckets per key', () => {
    const limiter = createInMemoryRateLimiter(1, 60_000);
    expect(limiter.take('ip-a').limited).toBe(false);
    expect(limiter.take('ip-b').limited).toBe(false);
    expect(limiter.take('ip-a').limited).toBe(true);
  });

  describe('memory leak prevention', () => {
    it('cleans up expired buckets when size exceeds cleanupThreshold', () => {
      const windowMs = 100;
      // Use a low cleanupThreshold so we can trigger cleanup easily
      const limiter = createInMemoryRateLimiter(10, windowMs, { cleanupThreshold: 5 });

      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Fill 5 buckets — under threshold, no cleanup yet
      for (let i = 0; i < 5; i++) {
        limiter.take(`key-${i}`);
      }

      // Advance time past the window so all existing buckets are expired
      vi.spyOn(Date, 'now').mockReturnValue(now + windowMs + 1);

      // Adding a 6th unique key pushes size to 6 > 5, triggering cleanup.
      // The 5 expired buckets should be swept, leaving only the new one.
      const result = limiter.take('key-new');
      expect(result.limited).toBe(false);

      // Verify expired keys were cleaned: requesting them should start fresh
      // (remaining === maxRequests - 1 means it's a new window, not a continuation)
      const check = limiter.take('key-0');
      expect(check.limited).toBe(false);
      expect(check.remaining).toBe(9); // maxRequests(10) - 1 = 9 → fresh bucket
    });

    it('does not clean up non-expired buckets', () => {
      const windowMs = 60_000;
      const limiter = createInMemoryRateLimiter(10, windowMs, { cleanupThreshold: 3 });

      // Create 3 buckets (at threshold)
      limiter.take('a');
      limiter.take('b');
      limiter.take('c');

      // 4th bucket triggers cleanup, but none are expired
      limiter.take('d');

      // All previous keys should still have their state
      const resultA = limiter.take('a');
      expect(resultA.remaining).toBe(8); // 10 - 2 = 8 (second request to 'a')
    });

    it('evicts oldest entries (FIFO) when size exceeds maxBuckets after cleanup', () => {
      const windowMs = 60_000;
      // Set both thresholds low for testing: cleanup at >3, hard cap at 4
      const limiter = createInMemoryRateLimiter(10, windowMs, {
        cleanupThreshold: 3,
        maxBuckets: 4,
      });

      // Insert 5 unique keys — none are expired, so the sweep won't help.
      // After inserting the 4th key (size=4 > 3), cleanup runs but nothing expires.
      // Size is still 4 which is at the cap, not over, so no FIFO eviction.
      limiter.take('k1');
      limiter.take('k2');
      limiter.take('k3');
      limiter.take('k4');

      // Now the 5th triggers cleanup again. None expired. Size=5 > maxBuckets=4.
      // Oldest entry ('k1') should be evicted via FIFO.
      limiter.take('k5');

      // 'k1' was evicted, so it should start a fresh window
      const result = limiter.take('k1');
      expect(result.remaining).toBe(9); // fresh bucket: 10 - 1 = 9

      // 'k2' may or may not have been evicted depending on exact size.
      // Let's check 'k3' which should still be alive (it was the 3rd inserted).
      // After evicting 1 entry (5 - 4 = 1 excess), only 'k1' is gone.
      const resultK3 = limiter.take('k3');
      expect(resultK3.remaining).toBe(8); // second hit: 10 - 2 = 8
    });

    it('does not trigger cleanup when below threshold', () => {
      const windowMs = 100;
      const limiter = createInMemoryRateLimiter(10, windowMs, { cleanupThreshold: 100 });

      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Add 5 buckets, well below threshold of 100
      for (let i = 0; i < 5; i++) {
        limiter.take(`key-${i}`);
      }

      // Advance time past window
      vi.spyOn(Date, 'now').mockReturnValue(now + windowMs + 1);

      // Add one more — still below threshold, so no cleanup
      limiter.take('extra');

      // Expired buckets should still be there (but they'll be reset on access
      // because of the existing expiry-on-read logic). The important thing is
      // the map was not swept. Access key-0: it will get a fresh window because
      // the per-key check already handles expiry. This test mainly verifies
      // we don't crash or behave oddly below the threshold.
      const result = limiter.take('key-0');
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(9);
    });
  });
});

describe('extractClientKeyFromHeaders', () => {
  it('uses first x-forwarded-for value when TRUST_PROXY=1', () => {
    vi.stubEnv('TRUST_PROXY', '1');
    const headers = new Headers({
      'x-forwarded-for': '1.1.1.1, 2.2.2.2',
    });
    expect(extractClientKeyFromHeaders(headers)).toBe('1.1.1.1');
  });

  it('falls back to x-real-ip and fallback when TRUST_PROXY=1', () => {
    vi.stubEnv('TRUST_PROXY', '1');
    expect(extractClientKeyFromHeaders(new Headers({ 'x-real-ip': '3.3.3.3' }))).toBe('3.3.3.3');
    expect(extractClientKeyFromHeaders(new Headers(), 'fallback-key')).toBe('fallback-key');
  });

  it('ignores forwarded IP headers when TRUST_PROXY is unset', () => {
    vi.unstubAllEnvs();
    const headers = new Headers({
      'x-forwarded-for': '1.1.1.1, 2.2.2.2',
      'x-real-ip': '3.3.3.3',
    });
    expect(extractClientKeyFromHeaders(headers, 'fallback-key')).toBe('fallback-key');
  });
});
