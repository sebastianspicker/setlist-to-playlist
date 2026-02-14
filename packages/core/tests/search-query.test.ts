import { describe, it, expect } from "vitest";
import { buildSearchQuery } from "../src/matching/search-query";

describe("buildSearchQuery", () => {
  it("returns normalized track name when no artist", () => {
    expect(buildSearchQuery("Yesterday")).toBe("Yesterday");
    expect(buildSearchQuery("Song (live)")).toBe("Song");
  });

  it("combines track and artist with space", () => {
    expect(buildSearchQuery("Yesterday", "The Beatles")).toBe(
      "Yesterday The Beatles"
    );
  });

  it("normalizes track before combining", () => {
    expect(buildSearchQuery("Help! (live)", "The Beatles")).toBe(
      "Help! The Beatles"
    );
    expect(buildSearchQuery("Song feat. X", "Artist")).toBe("Song Artist");
  });

  it("trims and collapses spaces", () => {
    expect(buildSearchQuery("  Hello  ", "  World  ")).toBe("Hello World");
  });

  it("handles empty artist", () => {
    expect(buildSearchQuery("Track", "")).toBe("Track");
    expect(buildSearchQuery("Track", undefined)).toBe("Track");
  });

  it("handles empty track", () => {
    expect(buildSearchQuery("", "Artist")).toBe("Artist");
  });
});
