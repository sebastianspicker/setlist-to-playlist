import { handleDevToken } from "api";
import { NextRequest } from "next/server";
import { corsHeaders, corsHeadersForOptions } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeadersForOptions(request) });
}

export async function GET(request: NextRequest) {
  try {
    const result = await handleDevToken();
    const status = "error" in result ? 503 : 200;
    const headers = corsHeaders(request) as Record<string, string>;
    headers["Cache-Control"] = "no-store";
    headers["Pragma"] = "no-cache";
    return new Response(JSON.stringify(result), { status, headers });
  } catch {
    const headers = corsHeaders(request) as Record<string, string>;
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers }
    );
  }
}
