/**
 * Deduplicate track IDs while preserving first-seen order.
 * Empty/whitespace IDs are dropped.
 */
export function dedupeTrackIdsOrdered(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
