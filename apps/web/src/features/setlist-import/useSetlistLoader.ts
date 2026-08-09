import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { mapSetlistFmToSetlist } from '@repo/core';
import type { Setlist, SetlistFmResponse } from '@repo/core';
import { getErrorMessage, isOk } from '@repo/shared';
import { setlistProxyUrl } from '@/lib/api';
import { fetchApiJson } from '@/lib/fetch';
import { pushImportHistoryItem, writeImportHistory, type ImportHistoryItem } from './importHistory';
import {
  classifyImportError,
  getInvalidInputError,
  isAbortError,
  type ImportError,
} from './setlistImportErrors';

interface SetlistLoaderState {
  setSetlist: Dispatch<SetStateAction<Setlist | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<ImportError | null>>;
  setHistory: Dispatch<SetStateAction<ImportHistoryItem[]>>;
}

export function useSetlistLoader({
  setSetlist,
  setLoading,
  setError,
  setHistory,
}: SetlistLoaderState) {
  const currentRequestRef = useRef(0);
  const requestCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelLoad = useCallback(() => {
    currentRequestRef.current = 0;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
  }, [setLoading]);

  const handleRequestError = useCallback(
    (message: string): false => {
      setError(classifyImportError(message));
      setSetlist(null);
      return false;
    },
    [setError, setSetlist]
  );

  const saveSetlist = useCallback(
    (response: SetlistFmResponse, input: string): true => {
      const mapped = mapSetlistFmToSetlist(response);
      setSetlist(mapped);
      const item: ImportHistoryItem = { input, setlistId: mapped.id };
      setHistory((previous) => {
        const next = pushImportHistoryItem(previous, item);
        writeImportHistory(next);
        return next;
      });
      return true;
    },
    [setHistory, setSetlist]
  );

  const loadSetlist = useCallback(
    async (rawValue: string): Promise<boolean> => {
      const trimmed = rawValue.trim();
      const validationError = getInvalidInputError(trimmed);
      setError(validationError);
      if (validationError) return false;

      const requestId = ++requestCounterRef.current;
      currentRequestRef.current = requestId;
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setLoading(true);
      try {
        const url = setlistProxyUrl(`id=${encodeURIComponent(trimmed)}`);
        const result = await fetchApiJson<SetlistFmResponse>(url, {
          signal: abortController.signal,
        });
        if (currentRequestRef.current !== requestId) return false;
        if (!isOk(result)) return handleRequestError(result.error);
        return saveSetlist(result.value, trimmed);
      } catch (caught) {
        if (isAbortError(caught) || currentRequestRef.current !== requestId) return false;
        return handleRequestError(getErrorMessage(caught, 'Network error.'));
      } finally {
        if (currentRequestRef.current === requestId) cancelLoad();
      }
    },
    [cancelLoad, handleRequestError, saveSetlist, setError, setLoading]
  );

  return { cancelLoad, loadSetlist };
}
