import { describe, it, expect } from "vitest";
import {
  createInMemoryRateLimiter,
  extractClientKeyFromHeaders,
} from "../src/lib/rate-limit";

describe("createInMemoryRateLimiter", () => {
  it("limits when requests exceed threshold", () => {
    const limiter = createInMemoryRateLimiter(2, 60_000);
    expect(limiter.take("ip-1").limited).toBe(false);
    expect(limiter.take("ip-1").limited).toBe(false);
    expect(limiter.take("ip-1").limited).toBe(true);
  });

  it("tracks buckets per key", () => {
    const limiter = createInMemoryRateLimiter(1, 60_000);
    expect(limiter.take("ip-a").limited).toBe(false);
    expect(limiter.take("ip-b").limited).toBe(false);
    expect(limiter.take("ip-a").limited).toBe(true);
  });
});

describe("extractClientKeyFromHeaders", () => {
  it("uses first x-forwarded-for value", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 2.2.2.2",
    });
    expect(extractClientKeyFromHeaders(headers)).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip and fallback", () => {
    expect(extractClientKeyFromHeaders(new Headers({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
    expect(extractClientKeyFromHeaders(new Headers(), "fallback-key")).toBe("fallback-key");
  });
});
