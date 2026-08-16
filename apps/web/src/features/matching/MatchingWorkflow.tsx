'use client';

import { useEffect } from 'react';
import type { Setlist } from '@repo/core';
import { isValidAppleMusicTrack } from '@/lib/musickit';
import { MatchingLedger } from './MatchingLedger';
import { MatchingSummary } from './MatchingSummary';
import type { MatchRow } from './types';
import { useCatalogMatchSuggestions } from './useCatalogMatchSuggestions';
import { useCatalogTrackSearch } from './useCatalogTrackSearch';

export interface MatchingWorkflowProps {
  setlist: Setlist;
  onProceedToCreatePlaylist: (matches: MatchRow[]) => void;
  initialDraft?: MatchRow[] | null;
  onMatchesChange?: (matches: MatchRow[]) => void;
}

export function MatchingWorkflow({
  setlist,
  onProceedToCreatePlaylist,
  initialDraft,
  onMatchesChange,
}: MatchingWorkflowProps) {
  const { matches, loadingSuggestions, suggestionError, setMatch, autoMatchAll, skipUnmatched } =
    useCatalogMatchSuggestions(setlist, initialDraft);
  const {
    searchContext,
    setSearchQuery,
    openSearch,
    runSearch,
    chooseTrack,
    skipTrack,
    closeSearch,
  } = useCatalogTrackSearch({ matches, setMatch });
  const matchedCount = matches.filter((match) => isValidAppleMusicTrack(match.appleTrack)).length;
  const settledCount = matches.filter((match) => match.status !== 'pending').length;
  const isSettled = settledCount === matches.length && !loadingSuggestions;
  const canProceed = matchedCount > 0 && isSettled;
  useEffect(() => {
    onMatchesChange?.(matches);
  }, [matches, onMatchesChange]);
  return (
    <section aria-label="Match tracks" className="matching-section">
      <MatchingLedger
        matches={matches}
        loadingSuggestions={loadingSuggestions}
        suggestionError={suggestionError}
        matchedCount={matchedCount}
        settledCount={settledCount}
        isSettled={isSettled}
        searchContext={searchContext}
        onOpenSearch={openSearch}
        onSkip={skipTrack}
        onSearchQueryChange={setSearchQuery}
        onSearch={runSearch}
        onChoose={chooseTrack}
        onCancelSearch={closeSearch}
      />
      <MatchingSummary
        matches={matches}
        loadingSuggestions={loadingSuggestions}
        matchedCount={matchedCount}
        isSettled={isSettled}
        canProceed={canProceed}
        onAutoMatchAll={autoMatchAll}
        onSkipUnmatched={skipUnmatched}
        onProceed={() => {
          onProceedToCreatePlaylist(matches);
        }}
      />
    </section>
  );
}
