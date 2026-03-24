import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

// CSP directives — Next.js requires 'unsafe-inline' for styles and inline
// scripts it injects at build time. 'unsafe-eval' is added only in dev mode
// for HMR/Fast Refresh. When Next.js ships first-class nonce-based CSP support,
// we should migrate to nonce-based script-src and style-src to eliminate
// 'unsafe-inline'. Track: https://github.com/vercel/next.js/discussions/54907
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://js-cdn.music.apple.com${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://api.music.apple.com https://*.apple.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
];

const csp = cspDirectives.join('; ');

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files, _next, and api routes (which set their own headers)
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)',
  ],
};
