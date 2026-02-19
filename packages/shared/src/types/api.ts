/** Common API error codes */
export const API_ERROR = {
  UNAUTHORIZED: "UNAUTHORIZED",
  RATE_LIMIT: "RATE_LIMIT",
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
} as const;

export type ApiErrorCode = (typeof API_ERROR)[keyof typeof API_ERROR];

/**
 * Discriminated union for success vs error results (generic, reusable).
 * Use for API responses or any operation that can fail with a message.
 */
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Type guard: narrow Result to success. */
export function isOk<T, E>(r: Result<T, E>): r is { ok: true; value: T } {
  return r.ok === true;
}

/** Type guard: narrow Result to error. */
export function isErr<T, E>(r: Result<T, E>): r is { ok: false; error: E } {
  return r.ok === false;
}
