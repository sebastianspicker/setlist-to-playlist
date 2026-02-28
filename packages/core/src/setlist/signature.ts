import type { Setlist } from "./types.js";

/**
 * Stable string signature for detecting meaningful setlist changes in UI effects.
 */
export function getSetlistSignature(setlist: Setlist): string {
  const sets = (setlist.sets ?? []).map((set) => (Array.isArray(set) ? set : []));
  const tracks = sets
    .flat()
    .map((entry) =>
      [entry?.name ?? "", entry?.artist ?? setlist.artist ?? "", entry?.info ?? ""].join("|")
    )
    .join("||");
  return [setlist.id ?? "", setlist.artist ?? "", setlist.eventDate ?? "", tracks].join("::");
}
