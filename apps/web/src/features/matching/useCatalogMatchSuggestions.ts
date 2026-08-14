'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSetlistSignature } from '@repo/core';
import type { Setlist } from '@repo/core';
import { toInitialMatches } from './matchingSuggestionRows';
import type { MatchRow } from './types';
import { useAutoMatchRunner } from './useAutoMatchRunner';
import { useMatchRowActions } from './useMatchRowActions';

export function useCatalogMatchSuggestions(setlist: Setlist, initialDraft?: MatchRow[] | null) {
  const [restoredDraft] = useState<MatchRow[] | null>(() => initialDraft ?? null);
  const hasInitialDraft = restoredDraft !== null;
  const [matches, setMatches] = useState<MatchRow[]>(
    () => restoredDraft ?? toInitialMatches(setlist)
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(!hasInitialDraft);
  const [suggestionError, setSuggestionError] = useState(false);
  const scheduledSignatureRef = useRef<string | null>(null);
  const { autoMatchAll, invalidateAutoMatch } = useAutoMatchRunner(
    setlist,
    setMatches,
    setLoadingSuggestions,
    setSuggestionError
  );
  const { setMatch, skipUnmatched } = useMatchRowActions(setMatches);
  const signature = useMemo(() => getSetlistSignature(setlist), [setlist]);

  useEffect(() => {
    if (hasInitialDraft || scheduledSignatureRef.current === signature) return;
    let started = false;
    const timeoutId = window.setTimeout(() => {
      started = true;
      scheduledSignatureRef.current = signature;
      void autoMatchAll();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      if (!started && scheduledSignatureRef.current === signature)
        scheduledSignatureRef.current = null;
      invalidateAutoMatch();
    };
  }, [signature, autoMatchAll, hasInitialDraft, invalidateAutoMatch]);

  return { matches, loadingSuggestions, suggestionError, setMatch, autoMatchAll, skipUnmatched };
}
