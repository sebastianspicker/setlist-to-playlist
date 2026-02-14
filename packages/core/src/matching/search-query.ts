import { normalizeTrackName } from "./normalize.js";

/** DCI-051: Cap length to avoid very long queries hitting API limits. */
const MAX_QUERY_LENGTH = 200;

/**
 * Build a single query string for Apple Music catalog search from track name and optional artist.
 * Uses normalization (strip feat., live, etc.) so search gets cleaner terms.
 */
export function buildSearchQuery(trackName: string, artistName?: string): string {
  const track = normalizeTrackName(trackName).slice(0, MAX_QUERY_LENGTH);
  const artist = (artistName?.trim() ?? "").slice(0, MAX_QUERY_LENGTH);
  const parts = [track, artist].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
