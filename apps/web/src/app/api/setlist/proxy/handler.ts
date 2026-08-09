import { handleSetlistProxy } from '@repo/api';
import { NextRequest } from 'next/server';
import { isErr, MAX_SETLIST_INPUT_LENGTH, SETLIST_MESSAGES } from '@repo/shared';
import { jsonResponse } from '@/lib/api-response';
import { createInMemoryRateLimiter } from '@/lib/rate-limit';
import { checkRateLimit, internalError, optionsNoContent } from '../../_helpers';

const SETLIST_PROXY_RATE_LIMIT = createInMemoryRateLimiter(20, 60_000);
const CACHE_HIT = { 'Cache-Control': 'private, max-age=3600' } as const;
const CACHE_NO_STORE = { 'Cache-Control': 'no-store' } as const;

export function handleSetlistOptions(request: NextRequest) {
  return optionsNoContent(request);
}

function setlistInput(request: NextRequest): string {
  return request.nextUrl.searchParams.get('id') || request.nextUrl.searchParams.get('url') || '';
}

function invalidInputResponse(
  request: NextRequest,
  id: string,
  rateHeaders: Record<string, string>
) {
  if (!id) {
    return jsonResponse({ error: 'Missing id or url query parameter.' }, 400, request, {
      ...rateHeaders,
      ...CACHE_NO_STORE,
    });
  }
  if (id.length > MAX_SETLIST_INPUT_LENGTH) {
    return jsonResponse({ error: SETLIST_MESSAGES.INPUT_TOO_LONG }, 400, request, {
      ...rateHeaders,
      ...CACHE_NO_STORE,
    });
  }
  return null;
}

function setlistResultResponse(
  result: Awaited<ReturnType<typeof handleSetlistProxy>>,
  request: NextRequest,
  rateHeaders: Record<string, string>
) {
  if (!isErr(result)) {
    return jsonResponse(result.value.body, 200, request, { ...rateHeaders, ...CACHE_HIT });
  }

  const payload =
    result.error.status >= 500
      ? { error: 'setlist.fm is temporarily unavailable', code: result.error.error.code }
      : result.error.error;
  return jsonResponse(payload, result.error.status, request, {
    ...rateHeaders,
    ...CACHE_NO_STORE,
  });
}

function getSetlistResponse(request: NextRequest) {
  const { rateHeaders, rateLimitedResponse } = checkRateLimit(
    request,
    SETLIST_PROXY_RATE_LIMIT,
    CACHE_NO_STORE
  );
  if (rateLimitedResponse) return rateLimitedResponse;

  const id = setlistInput(request);
  return invalidInputResponse(request, id, rateHeaders) ?? { id, rateHeaders };
}

export async function handleSetlistGet(request: NextRequest) {
  const preflight = getSetlistResponse(request);
  if ('id' in preflight === false) return preflight;

  try {
    const result = await handleSetlistProxy(preflight.id);
    return setlistResultResponse(result, request, preflight.rateHeaders);
  } catch {
    return internalError(request);
  }
}
