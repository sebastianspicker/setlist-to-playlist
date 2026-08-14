import type { ChangeEvent, KeyboardEvent } from 'react';

export interface SearchControlsProps {
  inputId: string;
  resultsId: string;
  searchQuery: string;
  searching: boolean;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onCancel: () => void;
}

function handleQueryChange(
  event: ChangeEvent<HTMLInputElement>,
  onSearchQueryChange: (value: string) => void
) {
  onSearchQueryChange(event.target.value);
}

function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>, onSearch: () => void) {
  if (event.key === 'Enter') onSearch();
}

export function TrackSearchControls(props: SearchControlsProps) {
  const { inputId, resultsId, searchQuery, searching, onSearchQueryChange, onSearch, onCancel } =
    props;

  return (
    <>
      <label htmlFor={inputId} className="input-label">
        Search Apple Music
      </label>
      <div className="track-search-controls">
        <input
          id={inputId}
          type="search"
          value={searchQuery}
          onChange={(event) => handleQueryChange(event, onSearchQueryChange)}
          placeholder="Song name, artist…"
          onKeyDown={(event) => handleSearchKeyDown(event, onSearch)}
          autoFocus
          className="input search-input"
          aria-controls={resultsId}
          autoComplete="off"
          enterKeyHint="search"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={searching}
          aria-label="Search Apple Music"
          aria-busy={searching}
          className="button button--secondary"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
        <button type="button" onClick={onCancel} className="button button--quiet">
          Cancel
        </button>
      </div>
    </>
  );
}
