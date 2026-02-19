import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { corsHeaders } from "./cors";

/**
 * JSON response with CORS headers for API routes (App Router pattern).
 * Uses NextResponse.json for correct Content-Type and status.
 */
export function jsonResponse(
  body: unknown,
  status: number,
  request: NextRequest,
  extraHeaders?: Record<string, string>
): NextResponse {
  const headers = new Headers(corsHeaders(request));
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
  }
  return NextResponse.json(body, { status, headers });
}
