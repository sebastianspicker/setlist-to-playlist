import type { Setlist, SetlistEntry } from "./types.js";

/**
 * Flatten setlist sets into one ordered list of entries.
 * Skips null/non-object entries; normalizes artist from setlist when missing on entry.
 */
export function flattenSetlistToEntries(setlist: Setlist): SetlistEntry[] {
  const entries: SetlistEntry[] = [];
  const artist = setlist.artist;
  for (const set of setlist.sets ?? []) {
    if (!Array.isArray(set)) continue;
    for (const entry of set) {
      if (entry == null || typeof entry !== "object") continue;
      const name = "name" in entry && typeof entry.name === "string" ? entry.name : "";
      const info = "info" in entry && typeof entry.info === "string" ? entry.info : undefined;
      entries.push({ name, artist: ("artist" in entry && typeof entry.artist === "string" ? entry.artist : undefined) ?? artist, info });
    }
  }
  return entries;
}
