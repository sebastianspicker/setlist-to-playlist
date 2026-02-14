/**
 * Normalize track name for search: strip "feat.", "live", extra punctuation, parentheticals.
 * Pure function, no I/O.
 */
export function normalizeTrackName(name: string): string {
  if (!name || typeof name !== 'string') return '';

  const s = name
    .replace(/\s*\([^)]*\)\s*/g, ' ') // (live), (acoustic), etc.
    .replace(/\s*-\s*live\s*$/i, '')
    .replace(/\s*feat\.?\s*[^-]+/gi, '')
    .replace(/[\s\-–—]+/g, ' ')
    .trim();

  return s;
}
