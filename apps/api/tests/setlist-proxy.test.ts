import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseSetlistIdFromInput } from "@repo/core";
import { API_ERROR, isErr, isOk } from "@repo/shared";
import { handleSetlistProxy } from "../src/routes/setlist/proxy.js";
import { saveEnv, restoreEnv } from "./helpers/env.js";

const SETLIST_ENV_KEYS = ["SETLISTFM_API_KEY"];

describe("parseSetlistIdFromInput", () => {
  it("returns raw ID when input is a plain setlist ID", () => {
    expect(parseSetlistIdFromInput("63de4613")).toBe("63de4613");
    expect(parseSetlistIdFromInput("  abc123  ")).toBe("abc123");
  });

  it("extracts ID from setlist.fm URL (suffix before .html)", () => {
    const url =
      "https://www.setlist.fm/setlist/the-beatles/1964/hollywood-bowl-hollywood-ca-63de4613.html";
    expect(parseSetlistIdFromInput(url)).toBe("63de4613");
  });

  it("extracts short ID (4-5 hex chars) from URL (DCI-005)", () => {
    expect(
      parseSetlistIdFromInput("https://www.setlist.fm/setlist/artist/2024/venue-abc1.html")
    ).toBe("abc1");
    expect(
      parseSetlistIdFromInput("https://www.setlist.fm/setlist/artist/venue-dead1f.html")
    ).toBe("dead1f");
  });

  it("returns null for empty or invalid input", () => {
    expect(parseSetlistIdFromInput("")).toBeNull();
    expect(parseSetlistIdFromInput("   ")).toBeNull();
    expect(parseSetlistIdFromInput("not-a-valid-id!!!")).toBeNull();
  });

  it("returns null for malicious SSRF hostnames (DCI-060)", () => {
    expect(parseSetlistIdFromInput("https://setlist.fm.evil.com/setlist/a/b-c1.html")).toBeNull();
    expect(parseSetlistIdFromInput("https://evilsetlist.fm/setlist/a/b-c1.html")).toBeNull();
    expect(parseSetlistIdFromInput("https://setlist.fm@evil.com/setlist/a/b-c1.html")).toBeNull();
  });
});

describe("handleSetlistProxy", () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = saveEnv(SETLIST_ENV_KEYS);
  });

  afterEach(() => {
    restoreEnv(SETLIST_ENV_KEYS, savedEnv);
    vi.restoreAllMocks();
  });

  it("returns 503 when SETLISTFM_API_KEY is not set", async () => {
    delete process.env.SETLISTFM_API_KEY;
    const result = await handleSetlistProxy("63de4613");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.status).toBe(503);
      expect(result.error.error.error).toContain("API key");
      expect(result.error.error.code).toBe(API_ERROR.SERVICE_UNAVAILABLE);
    }
  });

  it("returns 400 when id/url is invalid", async () => {
    process.env.SETLISTFM_API_KEY = "test-key";
    const result = await handleSetlistProxy("!!!");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.status).toBe(400);
      expect(result.error.error.error).toContain("Invalid");
      expect(result.error.error.code).toBe(API_ERROR.BAD_REQUEST);
    }
  });

  it("returns setlist body when fetch succeeds (mocked)", async () => {
    process.env.SETLISTFM_API_KEY = "test-key";
    const mockSetlist = {
      id: "63de4613",
      artist: { name: "The Beatles" },
      venue: { name: "Hollywood Bowl" },
      set: [],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSetlist),
        } as Response)
      )
    );

    const result = await handleSetlistProxy("63de4613");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.body).toEqual(mockSetlist);
    }
  });

  it("returns 404 when setlist not found", async () => {
    process.env.SETLISTFM_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
          statusText: "Not Found",
        } as Response)
      )
    );

    const result = await handleSetlistProxy("deadbeef"); // valid ID format, API returns 404
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.status).toBe(404);
      expect(result.error.error.code).toBe(API_ERROR.NOT_FOUND);
    }
  });

  it("returns rate-limit message on 429 after retries", async () => {
    process.env.SETLISTFM_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          text: () => Promise.resolve("Too Many Requests"),
          statusText: "Too Many Requests",
        } as Response)
      )
    );

    const result = await handleSetlistProxy("63de4614"); // different ID so cache is not used
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.status).toBe(429);
      expect(result.error.error.error).toMatch(/rate limit|too many requests/i);
      expect(result.error.error.code).toBe(API_ERROR.RATE_LIMIT);
    }
  });
});
