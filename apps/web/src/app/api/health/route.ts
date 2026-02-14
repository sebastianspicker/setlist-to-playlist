import { handleHealth } from "api";
import { NextRequest } from "next/server";
import { corsHeaders, corsHeadersForOptions } from "@/lib/cors";

/** DCI-043: OPTIONS for CORS preflight so cross-origin health checks succeed. DCI-053/054: use corsHeadersForOptions (no Content-Type, include Allow-Methods/Headers). */
export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeadersForOptions(request) });
}

/**
 * GET /api/health – liveness check for deployment and load balancers.
 * Returns 200 and { status: "ok", timestamp: "..." }.
 */
export async function GET(request: NextRequest) {
  const body = handleHealth();
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: corsHeaders(request),
  });
}
