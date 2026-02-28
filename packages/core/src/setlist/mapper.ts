import type { Setlist, SetlistEntry } from "./types.js";
import type { SetlistFmResponse, SetlistFmSong } from "./setlistfm-types.js";

/** Type guard: safe song item from setlist.fm (DCI-001: no any). Check own keys only to avoid excluding normal objects (they inherit __proto__/constructor). */
function isSetlistFmSong(s: unknown): s is SetlistFmSong {
  if (s == null || typeof s !== "object" || !("name" in s)) return false;
  const o = s as Record<string, unknown>;
  return (
    !Object.prototype.hasOwnProperty.call(o, "__proto__") &&
    !Object.prototype.hasOwnProperty.call(o, "constructor")
  );
}

/** Extract song array from a set object; API may return non-array. */
function getSongsFromSet(fmSet: Record<string, unknown>): unknown[] {
  const song = fmSet.song;
  return Array.isArray(song) ? song : [];
}

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

    // DCI-020: Guard against prototype pollution (own properties only). Cast to record for hasOwnProperty check (SetlistFmSet has no index signature).
    const setObj = fmSet as unknown as Record<string, unknown>;
    if (
      Object.prototype.hasOwnProperty.call(setObj, "__proto__") ||
      Object.prototype.hasOwnProperty.call(setObj, "constructor")
    )
      continue;

    const songs = getSongsFromSet(setObj);

    // DCI-035: guard each song item (null/non-object) so s.name does not throw
    const entries: SetlistEntry[] = songs
      .filter(isSetlistFmSong)
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
