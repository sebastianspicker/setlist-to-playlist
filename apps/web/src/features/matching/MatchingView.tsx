'use client';

import type { Setlist } from '@repo/core';
import { FlowStepIndicator } from '@/components/FlowStepIndicator';
import { LoadingButton } from '@/components/LoadingButton';
import { SectionTitle } from '@/components/SectionTitle';
import { StatusText } from '@/components/StatusText';
import { MatchRowItem } from './MatchRowItem';
import { MatchingBulkActions } from './MatchingBulkActions';
import type { MatchRow } from './types';
import { useMatchingSuggestions } from './useMatchingSuggestions';
import { useTrackSearch } from './useTrackSearch';

export interface MatchingViewProps {
  setlist: Setlist;
  onProceedToCreatePlaylist: (matches: MatchRow[]) => void;
}

export function MatchingView({ setlist, onProceedToCreatePlaylist }: MatchingViewProps) {
  const {
    matches,
    loadingSuggestions,
    suggestionError,
    setMatch,
    autoMatchAll,
    resetMatches,
    skipUnmatched,
  } = useMatchingSuggestions(setlist);

  const { searchContext, setSearchQuery, openSearch, runSearch, chooseTrack, skipTrack } =
    useTrackSearch({ matches, setMatch });

  const canProceed = matches.some((m) => m.appleTrack !== null);

  return (
    <section aria-label="Match tracks" className="matching-section">
      <FlowStepIndicator step={3} total={4} label="Matching" />
      <SectionTitle>Matching</SectionTitle>
      <p className="muted-block">
        Confirm or change the Apple Music track for each setlist entry. You can skip entries.
      </p>

      <MatchingBulkActions
        loading={loadingSuggestions}
        onAutoMatchAll={() => void autoMatchAll()}
        onSkipUnmatched={skipUnmatched}
        onReset={resetMatches}
      />

      {loadingSuggestions && (
        <StatusText style={{ marginBottom: '1rem' }}>Fetching suggestions…</StatusText>
      )}

      {suggestionError && !loadingSuggestions && (
        <p role="alert" className="warning-banner">
          Note: Some suggestions could not be loaded. You can manually search for those tracks.
        </p>
      )}

      <ul className="matching-list">
        {matches.map((row, index) => (
          <MatchRowItem
            key={`${row.setlistEntry.name}-${index}`}
            row={row}
            index={index}
            isSearching={searchContext.searchingIndex === index}
            searchContext={searchContext.searchingIndex === index ? searchContext : null}
            onOpenSearch={openSearch}
            onSkip={skipTrack}
            onSearchQueryChange={setSearchQuery}
            onSearch={runSearch}
            onChoose={chooseTrack}
          />
        ))}
      </ul>

      <div style={{ marginTop: '1.5rem' }}>
        <LoadingButton
          onClick={() => onProceedToCreatePlaylist(matches)}
          disabled={!canProceed}
          title="Continue to create the playlist in Apple Music"
        >
          Create playlist →
        </LoadingButton>
        {!canProceed && (
          <p className="muted-block" style={{ marginTop: '0.5rem' }}>
            Match at least one track to create a playlist.
          </p>
        )}
      </div>
    </section>
  );
}
