const METADATA_KEYWORDS =
  "(?:live|acoustic|remaster(?:ed)?|radio\\s+edit|bonus\\s+track|live\\s+version)";

/**
 * Normalizes a track name specifically optimized for music platform search queries (such as Apple Music).
 * It aggressively strips away superfluous metadata often attached to live recordings, remasters, or featured artists.
 * This is a pure function performing no side effects.
 *
 * @param name The raw, unformatted music track title string.
 */
export function normalizeTrackName(name: string): string {
  if (!name || typeof name !== "string") return "";

  // 1. Strip parentheticals containing metadata (including optional year prefix, e.g. "(2019 Remastered)")
  const parenthetical = new RegExp(
    `\\s*\\(\\s*(?:\\d{4}\\s+)?${METADATA_KEYWORDS}[^)]*\\)\\s*`,
    "gi"
  );
  let s = name.replace(parenthetical, " ");
  s = s.replace(
    new RegExp(`\\s*\\(\\s*(?:\\d{4}\\s+)?${METADATA_KEYWORDS}[^)]*$`, "gi"),
    " "
  );

  // 2. feat. segment before trailing dash: if "feat. X - <metadata>", keep the metadata (DCI-063); otherwise remove entire feat. segment (DCI-008)
  const featWithMetadata = new RegExp(
    `\\s*(?:feat|ft)\\.?\\s+[^(\\n]*?\\s*-\\s*(${METADATA_KEYWORDS})\\b\\s*`,
    "gi"
  );
  s = s.replace(featWithMetadata, " $1 ");
  s = s.replace(/\s*(?:feat|ft)\.?\s+[^(\n]+(?:\s*-\s*[^(\n]+)?\s*/gi, " ");

  // 3. Trailing dash-metadata (live, remastered, radio edit, etc.) — after feat. so "X - Radio Edit" is preserved
  s = s
    .replace(/\s*-\s*live\s*$/i, "")
    .replace(/\s*-\s*remastered\s*$/i, "")
    .replace(/\s*-\s*\d{4}\s+remaster(?:ed)?\s*$/i, "")
    .replace(/\s*-\s*radio\s+edit\s*$/i, "")
    .replace(/\s*-\s*bonus\s+track\s*$/i, "")
    .replace(/\s*-\s*live\s+version\s*$/i, "");

  // 4. Normalize spaces and dashes
  s = s.replace(/[\s\-–—]+/g, " ").trim();

  return s;
}
