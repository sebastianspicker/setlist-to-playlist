import { handleSetlistProxy } from "api";
import { NextRequest } from "next/server";
import { isErr, MAX_SETLIST_INPUT_LENGTH, SETLIST_MESSAGES } from "@repo/shared";
import { jsonResponse } from "@/lib/api-response";
import { internalError, optionsNoContent } from "../../_helpers";

export async function OPTIONS(request: NextRequest) {
  return optionsNoContent(request);
}

/**
 * GET /api/setlist/proxy?id=... or ?url=...
 * Returns setlist JSON from setlist.fm (API key server-side only). CORS restricted to frontend origin.
 * DCI-061: Reject id/url longer than MAX_SETLIST_INPUT_LENGTH. DCI-052: try/catch so errors return JSON with CORS.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? request.nextUrl.searchParams.get("url") ?? "";
  if (!id) {
    return jsonResponse({ error: "Missing id or url query parameter" }, 400, request);
  }
  if (id.length > MAX_SETLIST_INPUT_LENGTH) {
    return jsonResponse({ error: SETLIST_MESSAGES.INPUT_TOO_LONG }, 400, request);
  }

  try {
    const result = await handleSetlistProxy(id);
    if (isErr(result)) {
      return jsonResponse(result.error.error, result.error.status, request);
    }
    return jsonResponse(result.value.body, 200, request);
  } catch {
    return internalError(request);
  }
}
