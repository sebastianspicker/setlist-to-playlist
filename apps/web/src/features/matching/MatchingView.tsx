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
      <FlowStepIndicator step={3} total={4} label="Match songs" />
      <SectionTitle>Match songs</SectionTitle>
      <p className="muted-block">
        We found Apple Music tracks for each song. Review the matches below — tap <strong>Change</strong> to pick a different version, or <strong>Skip</strong> songs you do not want in the playlist.
      </p>

      <MatchingBulkActions
        loading={loadingSuggestions}
        onAutoMatchAll={() => void autoMatchAll()}
        onSkipUnmatched={skipUnmatched}
        onReset={resetMatches}
      />

      {loadingSuggestions && (
        <StatusText style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>
          Searching Apple Music for matching songs…
        </StatusText>
      )}

      {suggestionError && !loadingSuggestions && (
        <p role="alert" className="warning-banner">
          Some songs could not be matched automatically. Use the <strong>Search</strong> button next to unmatched songs to find them manually.
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

      {matches.length > 0 && !loadingSuggestions && (
        <div className="matching-summary">
          <p className="muted-block" style={{ margin: 0 }}>
            {matches.filter((m) => m.appleTrack !== null).length} of {matches.length} songs matched
          </p>
        </div>
      )}

      <div className="matching-proceed">
        <LoadingButton
          onClick={() => onProceedToCreatePlaylist(matches)}
          disabled={!canProceed}
          title="Continue to create the playlist in Apple Music"
          className="proceed-button"
        >
          Create playlist
        </LoadingButton>
        {!canProceed && (
          <p className="muted-block" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Match at least one song to continue.
          </p>
        )}
      </div>
    </section>
  );
}
