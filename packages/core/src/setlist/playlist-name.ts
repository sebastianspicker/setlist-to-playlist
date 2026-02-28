import type { Setlist } from "./types.js";

/**
 * Build a stable default playlist name from setlist metadata.
 */
export function buildPlaylistName(setlist: Setlist): string {
  const parts = ["Setlist", setlist.artist, setlist.eventDate].filter(
    (p) => p != null && String(p).trim() !== ""
  );
  return parts.length > 0 ? parts.join(" – ") : "Setlist";
}
