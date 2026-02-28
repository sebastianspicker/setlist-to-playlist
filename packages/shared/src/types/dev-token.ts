import type { ApiErrorCode } from "./api.js";

/** Apple Developer Token API response: success with token or error payload. */
export type DevTokenResponse =
  | { token: string }
  | { error: string; code?: ApiErrorCode };

export function isDevTokenSuccess(
  data: DevTokenResponse,
): data is { token: string } {
  return "token" in data && typeof data.token === "string";
}
