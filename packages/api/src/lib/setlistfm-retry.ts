const BACKOFF_MS = 1000;
const MAX_RETRY_AFTER_DELAY_MS = 2000;

const parseRetryAfterMs = (value: string | null): number | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10) * 1000;
  if (/^[+-]\d+$/.test(trimmed)) return null;

  const timestamp = Date.parse(trimmed);
  return Number.isNaN(timestamp) ? null : Math.max(0, timestamp - Date.now());
};

export const getRetryDelayMs = (res: Response): number => {
  const retryAfterValue =
    typeof res.headers?.get === 'function' ? res.headers.get('retry-after') : null;
  const retryAfterMs = parseRetryAfterMs(retryAfterValue);
  const baseDelayMs = Math.min(retryAfterMs ?? BACKOFF_MS, MAX_RETRY_AFTER_DELAY_MS);
  // Keep concurrent callers from retrying at the same instant after a shared 429 response.
  const jitterMs = Math.floor(Math.random() * 100);
  return Math.max(0, baseDelayMs) + jitterMs;
};

export const waitForRetry = (delayMs: number, signal: AbortSignal): Promise<boolean> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    const finish = (completed: boolean) => {
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', onAbort);
      resolve(completed);
    };
    const onAbort = () => finish(false);
    const timeoutId = setTimeout(() => finish(true), delayMs);
    signal.addEventListener('abort', onAbort, { once: true });
  });
