import { type DevTokenResponse, isDevTokenSuccess } from "@repo/shared";
import { devTokenUrl } from "../api";
import { fetchJson } from "../fetch";

const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function isTokenValid(): boolean {
  const buffer = 5 * 60 * 1000;
  return typeof cachedToken === "string" && Date.now() < tokenExpiresAt - buffer;
}

/** Fetch Developer Token from our API; cache in memory with TTL. */
export async function fetchDeveloperToken(): Promise<string> {
  const valid = cachedToken;
  if (isTokenValid() && typeof valid === "string") return valid;
  cachedToken = null;
  tokenExpiresAt = 0;
  const result = await fetchJson<DevTokenResponse>(devTokenUrl());
  if (!result.ok) {
    throw new Error(result.error);
  }
  const data = result.value;
  if (!isDevTokenSuccess(data)) {
    throw new Error(data.error ?? "Failed to get Developer Token");
  }
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
  return data.token;
}
