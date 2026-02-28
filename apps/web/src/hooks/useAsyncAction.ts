"use client";

import { useCallback, useState } from "react";

export interface UseAsyncActionReturn {
  loading: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

/**
 * Encapsulates loading and error state for an async action (e.g. connect, create playlist).
 * run(fn) executes the async function and sets loading/error in try/finally.
 */
export function useAsyncAction(): UseAsyncActionReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(<T>(fn: () => Promise<T>): Promise<T | undefined> => {
    setError(null);
    setLoading(true);
    return fn()
      .then((value) => value)
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return undefined;
      })
      .finally(() => setLoading(false));
  }, []);

  return { loading, error, setError, run };
}
