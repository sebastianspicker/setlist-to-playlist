"use client";

import { StatusText } from "@/components/StatusText";
import type { AppleMusicTrack } from "@/lib/musickit";

export interface TrackSearchPanelProps {
  index: number;
  searchQuery: string;
  searching: boolean;
  searchError: boolean;
  searchResults: AppleMusicTrack[];
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onChoose: (track: AppleMusicTrack) => void;
}

export function TrackSearchPanel({
  index,
  searchQuery,
  searching,
  searchError,
  searchResults,
  onSearchQueryChange,
  onSearch,
  onChoose,
}: TrackSearchPanelProps) {
  return (
    <div className="track-search-panel">
      <input
        id={`search-track-${index}`}
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        placeholder="Search Apple Music…"
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
        aria-label="Search Apple Music for this track"
        className="premium-input search-input"
      />
      <button
        type="button"
        onClick={onSearch}
        disabled={searching}
        aria-label="Search Apple Music"
        aria-busy={searching}
        className="premium-button secondary"
      >
        {searching ? "Searching…" : "Search"}
      </button>
      {searching && <StatusText className="inline-status">Searching…</StatusText>}
      {searchError && !searching && (
        <p role="alert" className="error-text">
          Search failed, try again.
        </p>
      )}
      {searchResults.length > 0 && (
        <ul className="search-results-list">
          {searchResults.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => onChoose(track)}
                className="search-result-button"
              >
                {track.name}
                {track.artistName ? ` · ${track.artistName}` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
