/**
 * Extracts the raw setlist ID from either a direct string or a full setlist.fm URL.
 * Strictly validates input formats to avoid sending malformed IDs to the API.
 */
export function parseSetlistIdFromInput(idOrUrl: string): string | null {
  const trimmed = idOrUrl.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.includes("setlist.fm")
  ) {
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      const hostname = url.hostname.toLowerCase();
      if (hostname !== "setlist.fm" && hostname !== "www.setlist.fm") return null;

      const path = url.pathname;

      const match = path.match(/-([a-f0-9]{4,12})\.html$/i);
      if (match) return match[1];

      const segment = path.split("/").filter(Boolean).pop() ?? "";
      const withoutHtml = segment.replace(/\.html$/i, "");
      const idPart = withoutHtml.split("-").pop();
      if (idPart && /^[a-f0-9]{4,12}$/i.test(idPart)) return idPart;
      if (withoutHtml && /^[a-f0-9-]+$/i.test(withoutHtml)) return withoutHtml;
    } catch {
      return null;
    }
    return null;
  }

  if (/^[a-f0-9-]{4,64}$/i.test(trimmed)) return trimmed;
  return null;
}
