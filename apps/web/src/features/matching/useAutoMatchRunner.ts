import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { flattenSetlistToEntries } from '@repo/core';
import type { Setlist } from '@repo/core';
import type { MatchRow } from './types';
import { applyBatchResults, getBatchSearches } from './matchingSuggestionBatch';
import { toPendingRows } from './matchingSuggestionRows';

type SetMatches = Dispatch<SetStateAction<MatchRow[]>>;

export function useAutoMatchRunner(
  setlist: Setlist,
  setMatches: SetMatches,
  setLoadingSuggestions: Dispatch<SetStateAction<boolean>>,
  setSuggestionError: Dispatch<SetStateAction<boolean>>
) {
  const runIdRef = useRef(0);
  const runIdCounter = useRef(0);
  const invalidateAutoMatch = useCallback(() => {
    const nextRunId = runIdCounter.current + 1;
    runIdCounter.current = nextRunId;
    runIdRef.current = nextRunId;
  }, []);

  const autoMatchAll = useCallback(async () => {
    const localRunId = ++runIdCounter.current;
    runIdRef.current = localRunId;
    const entries = flattenSetlistToEntries(setlist);
    if (entries.length === 0) {
      setMatches([]);
      setLoadingSuggestions(false);
      return;
    }

    const searchPromises = new Map<string, Promise<MatchRow['appleTrack']>>();
    setSuggestionError(false);
    setLoadingSuggestions(true);
    setMatches(toPendingRows(entries));
    const batchSize = 5;
    for (let batchStart = 0; batchStart < entries.length; batchStart += batchSize) {
      if (runIdRef.current !== localRunId) return;
      const results = await Promise.allSettled(
        getBatchSearches(entries, batchStart, batchSize, searchPromises)
      );
      if (runIdRef.current !== localRunId) return;
      setMatches((previous) => applyBatchResults(previous, batchStart, results));
      if (results.some((result) => result.status === 'rejected')) setSuggestionError(true);
    }
    if (runIdRef.current === localRunId) setLoadingSuggestions(false);
  }, [setlist, setLoadingSuggestions, setMatches, setSuggestionError]);

  return { autoMatchAll, invalidateAutoMatch };
}
