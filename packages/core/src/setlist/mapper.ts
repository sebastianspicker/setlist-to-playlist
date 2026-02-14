import type { Setlist, SetlistEntry } from "./types.js";
import type { SetlistFmResponse, SetlistFmSong } from "./setlistfm-types.js";

/**
 * Map a setlist.fm API response to our domain Setlist model.
 * Preserves set structure and order; each song becomes a SetlistEntry.
 * DCI-018: Validate response shape; throw on invalid input.
 */
export function mapSetlistFmToSetlist(raw: SetlistFmResponse): Setlist {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid setlist response");
  }
  if (!raw.artist || typeof raw.artist !== "object") {
    throw new Error("Invalid setlist response: missing artist");
  }
  const artistName = raw.artist?.name ?? "";
  const venueName = raw.venue?.name;
  const eventDate = raw.eventDate;

  const sets: SetlistEntry[][] = [];
  const fmSets = Array.isArray(raw.set) ? raw.set : [];

  for (const fmSet of fmSets) {
    if (!fmSet || typeof fmSet !== "object") continue;
    const songs = Array.isArray(fmSet.song) ? fmSet.song : [];
    // DCI-035: guard each song item (null/non-object) so s.name does not throw
    const entries: SetlistEntry[] = songs
      .filter((s): s is SetlistFmSong => s != null && typeof s === "object" && "name" in s)
      .map((s) => ({
        name: s.name ?? "",
        artist: artistName || undefined,
        info: s.info ?? undefined,
      }));
    if (entries.length > 0) sets.push(entries);
  }

  return {
    id: raw.id ?? "",
    artist: artistName,
    venue: venueName,
    eventDate,
    sets,
  };
}
