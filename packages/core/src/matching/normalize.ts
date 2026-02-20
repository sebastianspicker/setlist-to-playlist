/**
 * Normalizes a track name specifically optimized for music platform search queries (such as Apple Music).
 * It aggressively strips away superfluous metadata often attached to live recordings, remasters, or featured artists.
 * This is a pure function performing no side effects.
 * 
 * @param name The raw, unformatted music track title string.
 */
export function normalizeTrackName(name: string): string {
  if (!name || typeof name !== "string") return "";

  // Execute a waterfall sequential replacement strategy using Regular Expressions.
  // 1. Removes explicitly enclosed parentheses e.g. "Song (Acoustic)"
  // 2. Removes erroneously left-open parentheticals.
  // 3. Removes appending string segments starting with dashes which indicate alternate metadata versions.
  const s = name
    .replace(/\s*\([^)]*\)\s*/g, " ") // (live), (acoustic), etc.
    .replace(/\s*\([^)]*$/g, " ") // unbalanced trailing parens, e.g. "Song (live"
    .replace(/\s*-\s*live\s*$/i, "")
    .replace(/\s*-\s*remastered\s*$/i, "")
    .replace(/\s*-\s*\d{4}\s+remaster(?:ed)?\s*$/i, "")
    .replace(/\s*-\s*radio\s+edit\s*$/i, "")
    .replace(/\s*-\s*bonus\s+track\s*$/i, "")
    .replace(/\s*-\s*live\s+version\s*$/i, "")
    .replace(/\s*(?:feat|ft)\.?\s+.*/gi, "")
    .replace(/[\s\-–—]+/g, " ")
    .trim();

  return s;
}
