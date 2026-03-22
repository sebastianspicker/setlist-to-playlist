import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

// CSP directives — Next.js requires 'unsafe-inline' for styles and 'unsafe-eval' in dev mode.
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

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files, _next, and api routes (which set their own headers)
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)',
  ],
};
