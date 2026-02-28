import { describe, it, expect } from "vitest";
import { dedupeTrackIdsOrdered } from "../src/matching/dedupe-track-ids";

describe("dedupeTrackIdsOrdered", () => {
  it("removes duplicates and preserves first order", () => {
    expect(dedupeTrackIdsOrdered(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });

  it("drops empty and whitespace values", () => {
    expect(dedupeTrackIdsOrdered(["", " ", "a", "  a  ", "b"])).toEqual(["a", "b"]);
  });
});
