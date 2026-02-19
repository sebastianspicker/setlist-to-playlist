import { describe, it, expect } from "vitest";
import { flattenSetlistToEntries } from "../src/setlist/flatten";
import type { Setlist } from "../src/setlist/types";

describe("flattenSetlistToEntries", () => {
  it("flattens sets in order and normalizes artist", () => {
    const setlist: Setlist = {
      id: "abc",
      artist: "The Artist",
      sets: [
        [
          { name: "Track 1", artist: "The Artist" },
          { name: "Track 2" },
        ],
        [{ name: "Encore" }],
      ],
    };
    const entries = flattenSetlistToEntries(setlist);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({ name: "Track 1", artist: "The Artist" });
    expect(entries[1].name).toBe("Track 2");
    expect(entries[1].artist).toBe("The Artist");
    expect(entries[2].name).toBe("Encore");
    expect(entries[2].artist).toBe("The Artist");
  });

  it("skips null and non-array sets", () => {
    const setlist: Setlist = {
      id: "x",
      artist: "A",
      sets: [null, [{ name: "Only" }], undefined] as unknown as Setlist["sets"],
    };
    const entries = flattenSetlistToEntries(setlist);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("Only");
  });

  it("returns empty array for empty or missing sets", () => {
    expect(flattenSetlistToEntries({ id: "x", artist: "A", sets: [] })).toEqual([]);
    expect(flattenSetlistToEntries({ id: "x", artist: "A", sets: undefined })).toEqual([]);
  });
});
