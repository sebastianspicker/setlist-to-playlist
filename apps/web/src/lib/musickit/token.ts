import { type DevTokenResponse, isDevTokenSuccess } from '@repo/shared';
import { devTokenUrl } from '../api';
import { fetchJson } from '../fetch';

const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let pendingFetch: Promise<string> | null = null;

export function isTokenValid(): boolean {
  const buffer = 5 * 60 * 1000;
  return typeof cachedToken === 'string' && Date.now() < tokenExpiresAt - buffer;
}

/**
 * Fetch Developer Token from our API; cache in memory with TTL.
 * Uses a promise singleton to deduplicate concurrent calls when the token
 * is expired, preventing redundant API requests.
 */
export async function fetchDeveloperToken(): Promise<string> {
  if (isTokenValid()) return cachedToken!;
  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    try {
      cachedToken = null;
      tokenExpiresAt = 0;
      const result = await fetchJson<DevTokenResponse>(devTokenUrl());
      if (!result.ok) {
        throw new Error(result.error);
      }
      const data = result.value;
      if (!isDevTokenSuccess(data)) {
        throw new Error(data.error ?? 'Failed to get Developer Token');
      }
      cachedToken = data.token;
      tokenExpiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
      return data.token;
    } catch (err) {
      pendingFetch = null;
      throw err;
    }
  })();

  const token = await pendingFetch;
  pendingFetch = null;
  return token;
}
