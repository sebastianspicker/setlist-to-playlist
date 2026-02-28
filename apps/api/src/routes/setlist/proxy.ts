import { parseSetlistIdFromInput } from "@repo/core";
import { API_ERROR, type Result, SETLIST_MESSAGES, type ApiErrorPayload } from "@repo/shared";
import { fetchSetlistFromApi } from "../../lib/setlistfm.js";

/** Success: body for JSON response. Error: status and message for client. */
export type SetlistProxyResult = Result<
  { body: unknown },
  { status: number; error: ApiErrorPayload }
>;

/**
 * Proxy request to setlist.fm: accept setlist ID or URL, return setlist JSON or error.
 * API key is read from env and never sent to the client.
 */
export async function handleSetlistProxy(
  setlistIdOrUrl: string
): Promise<SetlistProxyResult> {
  const apiKey = process.env.SETLISTFM_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: {
        status: 503,
        error: {
          error: "Setlist.fm API key not configured",
          code: API_ERROR.SERVICE_UNAVAILABLE,
        },
      },
    };
  }

  const setlistId = parseSetlistIdFromInput(setlistIdOrUrl);
  if (!setlistId) {
    return {
      ok: false,
      error: {
        status: 400,
        error: { error: SETLIST_MESSAGES.INVALID_ID_OR_URL, code: API_ERROR.BAD_REQUEST },
      },
    };
  }

  const fetchResult = await fetchSetlistFromApi(setlistId, apiKey);

  if (fetchResult.ok) {
    return { ok: true, value: { body: fetchResult.body } };
  }

  const status =
    fetchResult.status === 404 ? 404 : fetchResult.status >= 500 ? 503 : fetchResult.status;
  const MAX_ERROR_MESSAGE_LENGTH = 500;
  const message =
    typeof fetchResult.message === "string" && fetchResult.message.length > MAX_ERROR_MESSAGE_LENGTH
      ? fetchResult.message.slice(0, MAX_ERROR_MESSAGE_LENGTH) + "…"
      : fetchResult.message;

  const code =
    fetchResult.status === 404
      ? API_ERROR.NOT_FOUND
      : fetchResult.status === 429
        ? API_ERROR.RATE_LIMIT
        : fetchResult.status >= 500
          ? API_ERROR.SERVICE_UNAVAILABLE
          : API_ERROR.BAD_REQUEST;

  return {
    ok: false,
    error: { status, error: { error: message, code } },
  };
}
