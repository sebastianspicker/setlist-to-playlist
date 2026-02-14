import { describe, it, expect } from "vitest";
import { mapSetlistFmToSetlist } from "../src/setlist/mapper";
import type { SetlistFmResponse } from "../src/setlist/setlistfm-types";

const fixture: SetlistFmResponse = {
  id: "63de4613",
  versionId: "7be1aaa0",
  eventDate: "23-08-1964",
  artist: {
    name: "The Beatles",
    mbid: "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",
    sortName: "Beatles, The",
    url: "https://www.setlist.fm/setlists/the-beatles-23d6a88b.html",
  },
  venue: {
    id: "6bd6ca6e",
    name: "Compaq Center",
    city: { name: "Hollywood", country: { code: "US" } },
    url: "https://www.setlist.fm/venue/compaq-center-san-jose-ca-usa-6bd6ca6e.html",
  },
  tour: { name: "North American Tour 1964" },
  set: [
    {
      name: "Set 1",
      song: [
        { name: "Yesterday", info: "", tape: false },
        { name: "Help! (live)", tape: true },
      ],
    },
    {
      name: "Encore",
      encore: 1,
      song: [{ name: "Twist and Shout", tape: false }],
    },
  ],
  info: "Recorded and published as 'The Beatles at the Hollywood Bowl'",
  url: "https://www.setlist.fm/setlist/the-beatles/1964/hollywood-bowl-hollywood-ca-63de4613.html",
};

describe("mapSetlistFmToSetlist", () => {
  it("maps fixture to Setlist with correct artist, venue, date, id", () => {
    const result = mapSetlistFmToSetlist(fixture);
    expect(result.id).toBe("63de4613");
    expect(result.artist).toBe("The Beatles");
    expect(result.venue).toBe("Compaq Center");
    expect(result.eventDate).toBe("23-08-1964");
  });

  it("preserves set structure and track order", () => {
    const result = mapSetlistFmToSetlist(fixture);
    expect(result.sets).toHaveLength(2);
    expect(result.sets[0]).toHaveLength(2);
    expect(result.sets[0][0].name).toBe("Yesterday");
    expect(result.sets[0][0].artist).toBe("The Beatles");
    expect(result.sets[0][1].name).toBe("Help! (live)");
    expect(result.sets[1]).toHaveLength(1);
    expect(result.sets[1][0].name).toBe("Twist and Shout");
  });

  it("handles minimal response (no venue, no sets)", () => {
    const minimal: SetlistFmResponse = {
      id: "abc",
      eventDate: "01-01-2020",
      artist: { name: "Unknown" },
    };
    const result = mapSetlistFmToSetlist(minimal);
    expect(result.id).toBe("abc");
    expect(result.artist).toBe("Unknown");
    expect(result.venue).toBeUndefined();
    expect(result.sets).toEqual([]);
  });

  it("throws on invalid response shape (DCI-018)", () => {
    expect(() => mapSetlistFmToSetlist(null as unknown as SetlistFmResponse)).toThrow(
      "Invalid setlist response"
    );
    expect(() => mapSetlistFmToSetlist(undefined as unknown as SetlistFmResponse)).toThrow(
      "Invalid setlist response"
    );
    expect(() => mapSetlistFmToSetlist({} as SetlistFmResponse)).toThrow(
      "Invalid setlist response: missing artist"
    );
  });
});
