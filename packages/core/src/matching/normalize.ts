/**
 * Normalize track name for search: strip "feat.", "live", extra punctuation, parentheticals.
 * Pure function, no I/O.
 */
export function normalizeTrackName(name: string): string {
  if (!name || typeof name !== "string") return "";

  // DCI-008: feat./ft. segment can contain hyphens (e.g. "Song feat. A - B"); match until next " - " or end
  // DCI-059: strip balanced parens first, then strip trailing " (…" with no closing ")"
  const s = name
    .replace(/\s*\([^)]*\)\s*/g, " ") // (live), (acoustic), etc.
    .replace(/\s*\([^)]*$/g, " ") // unbalanced trailing parens, e.g. "Song (live"
    .replace(/\s*-\s*live\s*$/i, "")
    .replace(/\s*feat\.?\s*[^-]+(?:-\s*[^-]+)*/gi, "")
    .replace(/\s*ft\.?\s*[^-]+(?:-\s*[^-]+)*/gi, "")
    .replace(/[\s\-–—]+/g, " ")
    .trim();

  return s;
}
