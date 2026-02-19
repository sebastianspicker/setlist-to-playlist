/**
 * Type guard: true when value is an object with a string `message` property (Error-like).
 */
export function isErrorLike(value: unknown): value is { message: string } {
  return (
    value != null &&
    typeof value === "object" &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string"
  );
}

/**
 * Extract a safe user-facing message from an unknown error.
 * Uses type guards (Error, isErrorLike) instead of type assertions.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (isErrorLike(err)) return err.message;
  if (err != null) return String(err);
  return fallback;
}
