/**
 * Type guard: true when value is an object with a string `message` property (Error-like).
 */
export function isErrorLike(value: unknown): value is { message: string } {
  return (
    value != null &&
    typeof value === 'object' &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

/**
 * Extract a safe user-facing message from an unknown error.
 * Uses type guards (Error, isErrorLike) instead of type assertions.
 * Callers must not throw Error(sensitiveData); this returns err.message as-is.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (isErrorLike(err)) return err.message;
  if (err != null) return String(err);
  return fallback;
}

/**
 * Return a generic, safe error message suitable for end-user display.
 * Unlike {@link getErrorMessage}, this never exposes raw Error messages
 * which may contain internal details (stack traces, file paths, SQL, etc.).
 * Only errors with an explicit `code` property (API errors) have their
 * message forwarded; all others return a generic fallback.
 */
export function getSafeErrorMessage(
  err: unknown,
  fallback = 'An unexpected error occurred'
): string {
  if (
    err != null &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as Record<string, unknown>).code === 'string' &&
    isErrorLike(err)
  ) {
    return err.message;
  }
  return fallback;
}
