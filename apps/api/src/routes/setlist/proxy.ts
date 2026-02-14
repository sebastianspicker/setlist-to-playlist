/**
 * Optional proxy to setlist.fm API.
 * - Hides SETLISTFM_API_KEY from client
 * - Can add caching and rate limiting
 * - Accepts setlist ID or URL, fetches from setlist.fm, returns JSON
 */
export type ProxyResponse = { body: unknown; status: number } | { error: string; status: number };

export async function handleSetlistProxy(_setlistIdOrUrl: string): Promise<ProxyResponse> {
  const apiKey = process.env.SETLISTFM_API_KEY;
  if (!apiKey) {
    return { error: 'Setlist.fm API key not configured', status: 503 };
  }
  // TODO: parse ID from URL if needed, call setlist.fm API, optionally cache
  return { body: { message: 'Not implemented' }, status: 501 };
}
