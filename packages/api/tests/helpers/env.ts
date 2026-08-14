/**
 * Save current env values for given keys. Use with restoreEnv in afterEach to avoid leaking env between tests.
 */
export function saveEnv(keys: string[]): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const key of keys) {
    Reflect.set(saved, key, Reflect.get(process.env, key));
  }
  return saved;
}

/**
 * Restore env from a previous saveEnv call.
 */
export function restoreEnv(keys: string[], saved: Record<string, string | undefined>): void {
  for (const key of keys) {
    const value = Reflect.get(saved, key) as string | undefined;
    if (value !== undefined) {
      Reflect.set(process.env, key, value);
    } else {
      Reflect.deleteProperty(process.env, key);
    }
  }
}
