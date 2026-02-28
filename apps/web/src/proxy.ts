import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Global proxy to enforce security headers in Next.js 16+.
 */
export function proxy(_request: NextRequest) {
  const response = NextResponse.next();

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js-cdn.music.apple.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.mzstatic.com;
    connect-src 'self' https://api.music.apple.com https://*.setlist.fm;
    frame-ancestors 'none';
    form-action 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
