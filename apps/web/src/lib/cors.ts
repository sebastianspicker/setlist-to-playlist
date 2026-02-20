import type { NextRequest } from "next/server";

/**
 * Shared CORS helper for API routes (DCI-044).
 * Set ALLOWED_ORIGIN in production; when unset, only localhost/127.0.0.1 are allowed (DCI-001). DCI-037: trim and use single origin.
 * DCI-062: Strip trailing slash from configured origin so it matches browser Origin (no path).
 */
export function getAllowOrigin(origin: string | null): string | null {
  const configured = (process.env.ALLOWED_ORIGIN ?? "").trim();
  const isLocalOrigin =
    origin &&
    (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
  if (configured) {
    const single = configured.split(",")[0].trim().replace(/\/$/, "");
    return single || null;
  }
  return isLocalOrigin ? origin : null;
}

export function corsHeaders(request: NextRequest, contentType = "application/json"): HeadersInit {
  const origin = request.headers.get("origin");
  const allowOrigin = getAllowOrigin(origin);
  const headers: HeadersInit = { "Content-Type": contentType };
  if (allowOrigin) {
    (headers as Record<string, string>)["Access-Control-Allow-Origin"] = allowOrigin;
  }
  return headers;
}

/**
 * CORS headers for OPTIONS (204 No Content). DCI-053: No Content-Type for 204. DCI-054: Include Allow-Methods and Allow-Headers for preflight.
 */
export function corsHeadersForOptions(request: NextRequest): HeadersInit {
  const origin = request.headers.get("origin");
  const allowOrigin = getAllowOrigin(origin);
  const headers: Record<string, string> = {};
  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return headers;
}
