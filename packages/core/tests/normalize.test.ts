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

  it("preserves valid parentheses (DCI-061)", () => {
    expect(normalizeTrackName("(Don't Fear) The Reaper")).toBe("(Don't Fear) The Reaper");
    expect(normalizeTrackName("Interstate Love Song (2019 Remastered)")).toBe("Interstate Love Song");
  });

  it("refines feat. removal to preserve trailing metadata (DCI-063)", () => {
    expect(normalizeTrackName("Song feat. Artist A (live)")).toBe("Song");
    expect(normalizeTrackName("Song feat. Artist A - Radio Edit")).toBe("Song Radio Edit");
  });
});
