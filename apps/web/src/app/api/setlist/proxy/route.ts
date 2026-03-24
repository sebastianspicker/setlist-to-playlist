import { handleSetlistProxy } from 'api';
import { NextRequest } from 'next/server';
import { isErr, MAX_SETLIST_INPUT_LENGTH, SETLIST_MESSAGES, API_ERROR } from '@repo/shared';
import { jsonResponse } from '@/lib/api-response';
import { internalError, optionsNoContent } from '../../_helpers';
import { createInMemoryRateLimiter, extractClientKeyFromHeaders } from '@/lib/rate-limit';

const SETLIST_PROXY_RATE_LIMIT = createInMemoryRateLimiter(20, 60_000);

/** Cache-Control: successful responses may be cached privately for 1 h (matching server TTL). */
const CACHE_HIT = { 'Cache-Control': 'private, max-age=3600' } as const;
/** Cache-Control: error responses must not be cached. */
const CACHE_NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function OPTIONS(request: NextRequest) {
  return optionsNoContent(request);
}

/**
 * GET /api/setlist/proxy?id=... or ?url=...
 * Returns setlist JSON from setlist.fm (API key server-side only). CORS restricted to frontend origin.
 * Rejects id/url longer than MAX_SETLIST_INPUT_LENGTH. Wrapped in try/catch so errors return JSON with CORS headers.
 */
export async function GET(request: NextRequest) {
  const clientKey = extractClientKeyFromHeaders(request.headers);
  const limit = SETLIST_PROXY_RATE_LIMIT.take(clientKey);
  if (limit.limited) {
    return jsonResponse(
      { error: 'Too many requests. Please retry shortly.', code: API_ERROR.RATE_LIMIT },
      429,
      request,
      { 'Retry-After': String(limit.retryAfterSeconds), ...CACHE_NO_STORE }
    );
  }

  const id =
    request.nextUrl.searchParams.get('id') ?? request.nextUrl.searchParams.get('url') ?? '';
  if (!id) {
    return jsonResponse(
      { error: 'Missing id or url query parameter.' },
      400,
      request,
      CACHE_NO_STORE
    );
  }
  if (id.length > MAX_SETLIST_INPUT_LENGTH) {
    return jsonResponse({ error: SETLIST_MESSAGES.INPUT_TOO_LONG }, 400, request, CACHE_NO_STORE);
  }

  try {
    const result = await handleSetlistProxy(id);
    if (isErr(result)) {
      const payload =
        result.error.status >= 500
          ? { error: 'setlist.fm is temporarily unavailable', code: result.error.error.code }
          : result.error.error;
      return jsonResponse(payload, result.error.status, request, CACHE_NO_STORE);
    }
    return jsonResponse(result.value.body, 200, request, CACHE_HIT);
  } catch {
    return internalError(request);
  }
}
