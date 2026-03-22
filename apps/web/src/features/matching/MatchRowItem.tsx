'use client';

import React from 'react';
import type { AppleMusicTrack } from '@/lib/musickit';
import type { MatchRow } from './types';
import { TrackSearchPanel } from './TrackSearchPanel';
import type { TrackSearchContext } from './useTrackSearch';

export interface MatchRowItemProps {
  row: MatchRow;
  index: number;
  isSearching: boolean;
  searchContext: TrackSearchContext | null;
  onOpenSearch: (index: number) => void;
  onSkip: (index: number) => void;
  onSearchQueryChange: (value: string) => void;
  onSearch: (index: number) => void;
  onChoose: (index: number, track: AppleMusicTrack) => void;
}

export const MatchRowItem = React.memo(function MatchRowItem({
  row,
  index,
  isSearching,
  searchContext,
  onOpenSearch,
  onSkip,
  onSearchQueryChange,
  onSearch,
  onChoose,
}: MatchRowItemProps) {
  return (
    <li className="matching-row">
      <div className="matching-row-main">
        <div className="matching-track-meta">
          <strong>{row.setlistEntry?.name ?? '—'}</strong>
          {row.setlistEntry?.artist && (
            <span className="muted-inline"> — {row.setlistEntry.artist}</span>
          )}
        </div>
        <div className="matching-track-result">
          {row.appleTrack ? (
            <span>
              → {row.appleTrack.name}
              {row.appleTrack.artistName && (
                <span className="muted-inline"> · {row.appleTrack.artistName}</span>
              )}
            </span>
          ) : row.status === 'skipped' ? (
            <span className="muted-inline">Skipped</span>
          ) : (
            <span className="muted-inline">No match</span>
          )}
        </div>
        <div className="matching-row-actions">
          <button
            type="button"
            onClick={() => onOpenSearch(index)}
            aria-label={`Change match for ${row.setlistEntry?.name ?? 'track'}`}
            className="premium-button secondary mini"
          >
            Change
          </button>
          <button
            type="button"
            onClick={() => onSkip(index)}
            aria-label="Skip track"
            className="premium-button secondary mini"
          >
            Skip
          </button>
        </div>
      </div>

      {isSearching && searchContext && (
        <TrackSearchPanel
          index={index}
          searchQuery={searchContext.searchQuery}
          searching={searchContext.searching}
          searchError={searchContext.searchError}
          searchResults={searchContext.searchResults}
          onSearchQueryChange={onSearchQueryChange}
          onSearch={() => onSearch(index)}
          onChoose={(track) => onChoose(index, track)}
        />
      )}
    </li>
  );
});
