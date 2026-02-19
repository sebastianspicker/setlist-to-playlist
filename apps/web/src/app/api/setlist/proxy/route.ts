import { handleSetlistProxy } from "api";
import { NextRequest, NextResponse } from "next/server";
import { MAX_SETLIST_INPUT_LENGTH } from "@repo/shared";
import { corsHeadersForOptions } from "@/lib/cors";
import { jsonResponse } from "@/lib/api-response";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeadersForOptions(request) });
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
    return jsonResponse(
      {
        error:
          "Input too long. Use setlist ID or a shorter setlist.fm URL (max 2000 characters).",
      },
      400,
      request
    );
  }

  try {
    const result = await handleSetlistProxy(id);
    const status = "error" in result ? result.status : result.status;
    const body = "error" in result ? { error: result.error } : result.body;
    return jsonResponse(body, status, request);
  } catch {
    return jsonResponse(
      { error: "An unexpected error occurred. Please try again." },
      500,
      request
    );
  }
}
