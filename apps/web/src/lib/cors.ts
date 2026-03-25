import type { NextRequest } from 'next/server';

/**
 * Shared CORS helper for API routes.
 * Set ALLOWED_ORIGIN in production (comma-separated list); when unset, only localhost/127.0.0.1 are allowed.
 * Strips trailing slashes so values match the browser Origin header.
 * Rejects "*" to avoid allowing any origin (insecure).
 */
export function getAllowOrigin(origin: string | null): string | null {
  const configured = (process.env.ALLOWED_ORIGIN ?? '').trim();
  const isLocalOrigin =
    origin &&
    origin !== 'null' &&
    (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'));
  if (configured) {
    const origins = configured
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter((o) => o && o !== 'null' && o !== '*');
    if (origins.length === 0) return null;
    if (origin && origins.includes(origin)) return origin;
    return null;
  }
  return isLocalOrigin ? origin : null;
}

export function corsHeaders(request: NextRequest, contentType = 'application/json'): HeadersInit {
  const origin = request.headers.get('origin');
  const allowOrigin = getAllowOrigin(origin);
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    Vary: 'Origin',
  };
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
  }
  return headers;
}

/**
 * CORS headers for OPTIONS (204 No Content). No Content-Type for 204; includes Allow-Methods and Allow-Headers for preflight.
 */
export function corsHeadersForOptions(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin');
  const allowOrigin = getAllowOrigin(origin);
  const headers: Record<string, string> = {
    Vary: 'Origin',
  };
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}
