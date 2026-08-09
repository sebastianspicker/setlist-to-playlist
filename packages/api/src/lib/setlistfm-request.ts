import { SETLIST_FM_BASE_URL } from '@repo/shared';

import { fetchResponseResult, timeoutFailure } from './setlistfm-response.js';
import { getRetryDelayMs, waitForRetry } from './setlistfm-retry.js';
import type { FetchAttemptResult, FetchSetlistResult } from './setlistfm-types.js';

const MAX_RETRIES_429 = 2;
const UPSTREAM_TIMEOUT_MS = 10_000;
const ALLOWED_UPSTREAM_ORIGINS = new Set([new URL(SETLIST_FM_BASE_URL).origin]);

interface FetchAttemptOptions {
  setlistId: string;
  headers: Record<string, string>;
  signal: AbortSignal;
}

const fetchAttempt = async ({
  setlistId,
  headers,
  signal,
}: FetchAttemptOptions): Promise<FetchAttemptResult> => {
  const url = new URL(`${SETLIST_FM_BASE_URL}/setlist/${encodeURIComponent(setlistId)}`);
  if (ALLOWED_UPSTREAM_ORIGINS.has(url.origin)) {
    try {
      return fetchResponseResult(await fetch(url, { headers, signal }), setlistId, signal);
    } catch {
      return signal.aborted
        ? timeoutFailure()
        : {
            kind: 'failure',
            error: { ok: false, status: 502, message: 'Unable to reach setlist.fm.' },
          };
    }
  }

  return {
    kind: 'failure',
    error: { ok: false, status: 502, message: 'Invalid setlist.fm upstream URL.' },
  };
};

export const fetchUncachedSetlist = async (
  setlistId: string,
  apiKey: string,
  cacheResult: (body: unknown) => void
): Promise<FetchSetlistResult> => {
  const headers = { 'x-api-key': apiKey, Accept: 'application/json' };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
      const result = await fetchAttempt({ setlistId, headers, signal: controller.signal });
      if (result.kind === 'success') {
        cacheResult(result.body);
        return { ok: true, body: result.body };
      }
      if (result.kind === 'failure') return result.error;
      if (attempt >= MAX_RETRIES_429) {
        return {
          ok: false,
          status: 429,
          message:
            result.message || 'setlist.fm rate limit exceeded. Please try again in a moment.',
        };
      }
      if (!(await waitForRetry(getRetryDelayMs(result.response), controller.signal))) {
        return { ok: false, status: 504, message: 'setlist.fm request timed out.' };
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  return {
    ok: false,
    status: 429,
    message: 'setlist.fm rate limit exceeded. Please try again in a moment.',
  };
};
