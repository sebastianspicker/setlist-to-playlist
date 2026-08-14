import { readTextWithinLimit } from '@repo/shared';

import type {
  FetchAttemptResult,
  FetchSetlistFailure,
  FetchSetlistResult,
} from './setlistfm-types.js';
import { isValidSetlistResponse } from './setlistfm-validation.js';

const MAX_UPSTREAM_RESPONSE_BYTES = 10 * 1024 * 1024;

export const responseTooLarge = (): FetchSetlistFailure => ({
  ok: false,
  status: 502,
  message: 'setlist.fm response was too large.',
});

export const invalidUpstreamResponse = (): FetchSetlistFailure => ({
  ok: false,
  status: 502,
  message: 'Invalid response from setlist.fm.',
});

export const timeoutFailure = (): FetchAttemptResult => ({
  kind: 'failure',
  error: { ok: false, status: 504, message: 'setlist.fm request timed out.' },
});

const readSuccessfulResponse = async (
  res: Response,
  expectedId: string
): Promise<FetchSetlistResult> => {
  try {
    const text = await readTextWithinLimit(res, MAX_UPSTREAM_RESPONSE_BYTES);
    if (text === null) return responseTooLarge();

    const body = JSON.parse(text) as unknown;
    return isValidSetlistResponse(body, expectedId)
      ? { ok: true, body }
      : invalidUpstreamResponse();
  } catch {
    return invalidUpstreamResponse();
  }
};

const parseUpstreamMessage = (text: string, statusText: string): string => {
  try {
    const parsed = JSON.parse(text) as { message?: unknown };
    return typeof parsed.message === 'string' ? parsed.message : text || statusText;
  } catch {
    return text || statusText;
  }
};

const readFailureResponse = async (res: Response): Promise<FetchSetlistFailure> => {
  try {
    const text = await readTextWithinLimit(res, MAX_UPSTREAM_RESPONSE_BYTES);
    if (text === null) return responseTooLarge();
    return { ok: false, status: res.status, message: parseUpstreamMessage(text, res.statusText) };
  } catch {
    return invalidUpstreamResponse();
  }
};

export const fetchResponseResult = async (
  response: Response,
  expectedId: string,
  signal: AbortSignal
): Promise<FetchAttemptResult> => {
  const result = response.ok
    ? await readSuccessfulResponse(response, expectedId)
    : await readFailureResponse(response);
  if (signal.aborted) return timeoutFailure();
  if (result.ok) return { kind: 'success', body: result.body };
  if (result.status === 429) return { kind: 'rate-limit', response, message: result.message };
  return {
    kind: 'failure',
    error: { ...result, message: result.message || `setlist.fm returned ${result.status}` },
  };
};
