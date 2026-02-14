import {
  parseSetlistIdFromInput,
  fetchSetlistFromApi,
} from "../../lib/setlistfm.js";

export type ProxyResponse =
  | { body: unknown; status: number }
  | { error: string; status: number };

/**
 * Proxy request to setlist.fm: accept setlist ID or URL, return setlist JSON or error.
 * API key is read from env and never sent to the client.
 */
export async function handleSetlistProxy(
  setlistIdOrUrl: string
): Promise<ProxyResponse> {
  const apiKey = process.env.SETLISTFM_API_KEY?.trim();
  if (!apiKey) {
    return { error: "Setlist.fm API key not configured", status: 503 };
  }

  const setlistId = parseSetlistIdFromInput(setlistIdOrUrl);
  if (!setlistId) {
    return {
      error: "Invalid setlist ID or URL. Use a setlist.fm URL or the setlist ID (e.g. 63de4613).",
      status: 400,
    };
  }

  const result = await fetchSetlistFromApi(setlistId, apiKey);

  if (result.ok) {
    return { body: result.body, status: 200 };
  }

  const status =
    result.status === 404 ? 404 : result.status >= 500 ? 503 : result.status;
  const MAX_ERROR_MESSAGE_LENGTH = 500;
  const message =
    typeof result.message === "string" && result.message.length > MAX_ERROR_MESSAGE_LENGTH
      ? result.message.slice(0, MAX_ERROR_MESSAGE_LENGTH) + "…"
      : result.message;
  return {
    error: message,
    status,
  };
}
