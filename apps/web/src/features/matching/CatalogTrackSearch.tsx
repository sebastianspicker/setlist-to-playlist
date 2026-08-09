'use client';

import { StatusText } from '@/components/StatusText';
import type { AppleMusicTrack } from '@/lib/musickit';
import { TrackSearchControls } from './TrackSearchControls';
import { TrackSearchResults } from './TrackSearchResults';

export interface CatalogTrackSearchProps {
  index: number;
  searchQuery: string;
  searching: boolean;
  searchError: boolean;
  searchResults: AppleMusicTrack[];
  hasSearched: boolean;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onChoose: (track: AppleMusicTrack) => void;
  onCancel: () => void;
}

export function CatalogTrackSearch(props: CatalogTrackSearchProps) {
  const {
    index,
    searchQuery,
    searching,
    searchError,
    searchResults,
    hasSearched,
    onSearchQueryChange,
    onSearch,
    onChoose,
    onCancel,
  } = props;
  const inputId = `search-track-${index}`;
  const resultsId = `search-results-${index}`;

  return (
    <div
      className="track-search-panel"
      role="search"
      aria-label="Search Apple Music for a catalog track"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
      }}
    >
      <TrackSearchControls
        inputId={inputId}
        resultsId={resultsId}
        searchQuery={searchQuery}
        searching={searching}
        onSearchQueryChange={onSearchQueryChange}
        onSearch={onSearch}
        onCancel={onCancel}
      />
      {searching && <StatusText className="inline-status">Searching…</StatusText>}
      {searchError && !searching && (
        <p role="alert" className="error-text">
          Search failed. Check your connection and try again.
        </p>
      )}
      <TrackSearchResults
        resultsId={resultsId}
        searchResults={searchResults}
        hasSearched={hasSearched}
        searching={searching}
        searchError={searchError}
        onChoose={onChoose}
      />
    </div>
  );
}
