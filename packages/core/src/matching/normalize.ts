const METADATA_PREFIXES = [
  'live',
  'acoustic',
  'remaster',
  'remastered',
  'radio edit',
  'bonus track',
  'live version',
];

const FEAT_WITH_METADATA_RE =
  /\s*(?:feat|ft)\.?\s+[^(\n]*?\s*-\s*(live|acoustic|remaster(?:ed)?|radio\s+edit|bonus\s+track|live\s+version)\b\s*/gi;

function startsWithMetadata(value: string): boolean {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^\d{4}\s+/, '');
  return METADATA_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function stripMetadataParentheticals(value: string): string {
  const replaceMetadata = (match: string) =>
    startsWithMetadata(match.slice(1, match.endsWith(')') ? -1 : undefined)) ? ' ' : match;

  return value
    .replace(/\([^)]{0,500}\)/g, replaceMetadata)
    .replace(/\([^)]{0,500}$/, replaceMetadata);
}

function stripFeaturing(value: string): string {
  const marker = /\s(?:feat|ft)\.?\s+/i.exec(value);
  if (!marker?.index) return value;

  const start = marker.index;
  const remaining = value.slice(start + marker[0].length);
  const boundary = remaining.search(/[(\n]/);
  return boundary < 0
    ? value.slice(0, start)
    : value.slice(0, start) + ' ' + remaining.slice(boundary);
}

/** Strip metadata (feat., live, remaster, etc.) from a track name for search. */
export function normalizeTrackName(name: string): string {
  if (!name || typeof name !== 'string') return '';

  // 1. Strip parentheticals containing metadata (including optional year prefix, e.g. "(2019 Remastered)")
  let s = stripMetadataParentheticals(name);

  // 2. feat. segment before trailing dash: if "feat. X - <metadata>", keep the metadata; otherwise remove entire feat. segment
  s = s.replace(FEAT_WITH_METADATA_RE, ' $1 ');
  s = stripFeaturing(s);

  // 3. Trailing dash metadata after feat. (live, remastered, radio edit, etc.).
  s = s
    .replace(/\s*-\s*live\s*$/i, '')
    .replace(/\s*-\s*remastered\s*$/i, '')
    .replace(/\s*-\s*\d{4}\s+remaster(?:ed)?\s*$/i, '')
    .replace(/\s*-\s*radio\s+edit\s*$/i, '')
    .replace(/\s*-\s*bonus\s+track\s*$/i, '')
    .replace(/\s*-\s*live\s+version\s*$/i, '');

  // 4. Normalize spaces and dashes
  s = s.replace(/[\s\-–—]+/g, ' ').trim();

  return s;
}
