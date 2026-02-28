import { describe, it, expect } from "vitest";
import { getSetlistSignature } from "../src/setlist/signature";

describe("getSetlistSignature", () => {
  it("is stable for same input", () => {
    const setlist = {
      id: "abc",
      artist: "Artist",
      eventDate: "2025-01-01",
      sets: [[{ name: "Song", artist: "Artist" }]],
    };
    const a = getSetlistSignature(setlist);
    const b = getSetlistSignature(setlist);
    expect(a).toBe(b);
  });

  it("changes when tracks change", () => {
    const base = {
      id: "abc",
      artist: "Artist",
      eventDate: "2025-01-01",
      sets: [[{ name: "Song A", artist: "Artist" }]],
    };
    const changed = {
      ...base,
      sets: [[{ name: "Song B", artist: "Artist" }]],
    };
    expect(getSetlistSignature(base)).not.toBe(getSetlistSignature(changed));
  });
});
