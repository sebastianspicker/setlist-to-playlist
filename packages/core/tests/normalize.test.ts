import { describe, it, expect } from "vitest";
import { normalizeTrackName } from "../src/matching/normalize";

describe("normalizeTrackName", () => {
  it("strips parentheticals", () => {
    expect(normalizeTrackName("Song (live)")).toBe("Song");
    expect(normalizeTrackName("Song (acoustic)")).toBe("Song");
  });

  it("strips unbalanced trailing parentheses (DCI-059)", () => {
    expect(normalizeTrackName("Song (live")).toBe("Song");
    expect(normalizeTrackName("Song (acoustic")).toBe("Song");
  });

  it("strips feat. and ft. segments", () => {
    expect(normalizeTrackName("Song feat. Other Artist")).toBe("Song");
    expect(normalizeTrackName("Song ft. Other Artist")).toBe("Song");
  });

  it("strips feat. segment when it contains a hyphen (DCI-008)", () => {
    expect(normalizeTrackName("Song feat. Artist A - Artist B")).toBe("Song");
  });

  it("returns empty for empty input", () => {
    expect(normalizeTrackName("")).toBe("");
  });

  it("normalizes spaces", () => {
    expect(normalizeTrackName("  Hello   World  ")).toBe("Hello World");
  });
});
