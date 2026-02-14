import { handleSetlistProxy } from "api";
import { NextRequest } from "next/server";
import { corsHeaders, corsHeadersForOptions } from "@/lib/cors";

const MAX_SETLIST_INPUT_LENGTH = 2000;

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeadersForOptions(request) });
}

/**
 * GET /api/setlist/proxy?id=... or ?url=...
 * Returns setlist JSON from setlist.fm (API key server-side only). CORS restricted to frontend origin.
 * DCI-061: Reject id/url longer than MAX_SETLIST_INPUT_LENGTH. DCI-052: try/catch so errors return JSON with CORS.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? request.nextUrl.searchParams.get("url") ?? "";
  if (!id) {
    return new Response(
      JSON.stringify({ error: "Missing id or url query parameter" }),
      { status: 400, headers: corsHeaders(request) }
    );
  }
  if (id.length > MAX_SETLIST_INPUT_LENGTH) {
    return new Response(
      JSON.stringify({
        error: "Input too long. Use setlist ID or a shorter setlist.fm URL (max 2000 characters).",
      }),
      { status: 400, headers: corsHeaders(request) }
    );
  }

  try {
    const result = await handleSetlistProxy(id);
    const status = "error" in result ? result.status : result.status;
    const body = "error" in result ? { error: result.error } : result.body;
    return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
  } catch {
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
