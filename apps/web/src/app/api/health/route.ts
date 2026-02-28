import { handleHealth } from "api";
import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-response";
import { optionsNoContent } from "../_helpers";

/** DCI-043: OPTIONS for CORS preflight so cross-origin health checks succeed. DCI-053/054: use corsHeadersForOptions (no Content-Type, include Allow-Methods/Headers). */
export async function OPTIONS(request: NextRequest) {
  return optionsNoContent(request);
}

/**
 * GET /api/health – liveness check for deployment and load balancers.
 * Returns 200 and { status: "ok", timestamp: "..." }.
 */
export async function GET(request: NextRequest) {
  return jsonResponse(handleHealth(), 200, request);
}
