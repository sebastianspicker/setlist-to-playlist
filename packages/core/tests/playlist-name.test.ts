import { describe, it, expect } from "vitest";
import { buildPlaylistName } from "../src/setlist/playlist-name";

describe("buildPlaylistName", () => {
  it("builds from artist and date", () => {
    expect(
      buildPlaylistName({
        id: "1",
        artist: "The Beatles",
        eventDate: "23-08-1964",
        sets: [],
      })
    ).toBe("Setlist – The Beatles – 23-08-1964");
  });

  it("falls back to base name", () => {
    expect(buildPlaylistName({ id: "1", artist: "", sets: [] })).toBe("Setlist");
  });
});
