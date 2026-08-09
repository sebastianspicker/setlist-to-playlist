import type { AppleMusicTrack } from '@/lib/musickit';

export interface SearchResultsProps {
  resultsId: string;
  searchResults: AppleMusicTrack[];
  hasSearched: boolean;
  searching: boolean;
  searchError: boolean;
  onChoose: (track: AppleMusicTrack) => void;
}

function selectionLabel(track: AppleMusicTrack) {
  return `Select ${track.name}${track.artistName ? ` by ${track.artistName}` : ''}`;
}

function trackDescription(track: AppleMusicTrack) {
  return track.artistName ? ` · ${track.artistName}` : '';
}

export function TrackSearchResults({
  resultsId,
  searchResults,
  hasSearched,
  searching,
  searchError,
  onChoose,
}: SearchResultsProps) {
  if (searchResults.length > 0) {
    return (
      <ul id={resultsId} className="search-results-list" aria-label="Search results">
        {searchResults.map((track) => (
          <li key={track.id}>
            <button
              type="button"
              onClick={() => onChoose(track)}
              className="search-result-button"
              aria-label={selectionLabel(track)}
            >
              <span>
                {track.name}
                {trackDescription(track)}
              </span>
              <span className="search-result-action" aria-hidden="true">
                Select
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return hasSearched && !searching && !searchError ? (
    <p className="support-text search-empty" id={resultsId}>
      No songs found. Try different keywords or check the spelling.
    </p>
  ) : null;
}
