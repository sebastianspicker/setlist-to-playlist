import { handleHealth } from "api";
import { NextRequest, NextResponse } from "next/server";
import { corsHeadersForOptions } from "@/lib/cors";
import { jsonResponse } from "@/lib/api-response";

/** DCI-043: OPTIONS for CORS preflight so cross-origin health checks succeed. DCI-053/054: use corsHeadersForOptions (no Content-Type, include Allow-Methods/Headers). */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeadersForOptions(request) });
}

/**
 * GET /api/health – liveness check for deployment and load balancers.
 * Returns 200 and { status: "ok", timestamp: "..." }.
 */
export async function GET(request: NextRequest) {
  return jsonResponse(handleHealth(), 200, request);
}
