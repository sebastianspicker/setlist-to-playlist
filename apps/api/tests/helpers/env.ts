/**
 * Save current env values for given keys. Use with restoreEnv in afterEach to avoid leaking env between tests.
 */
export function saveEnv(keys: string[]): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const key of keys) {
    saved[key] = process.env[key];
  }
  return saved;
}

/**
 * Restore env from a previous saveEnv call.
 */
export function restoreEnv(keys: string[], saved: Record<string, string | undefined>): void {
  for (const key of keys) {
    if (saved[key] !== undefined) {
      process.env[key] = saved[key];
    } else {
      delete process.env[key];
    }
  }
}
