// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CatalogMatchRow } from '../../src/features/matching/CatalogMatchRow';
import type { MatchRow } from '../../src/features/matching/types';

const matchedRow: MatchRow = {
  setlistEntry: { name: 'Song A', artist: 'Artist A' },
  appleTrack: { id: 'track-a', name: 'Song A (Live)', artistName: 'Artist A' },
  status: 'matched',
};

function renderRow(
  row: MatchRow,
  overrides: Partial<React.ComponentProps<typeof CatalogMatchRow>> = {}
) {
  const onOpenSearch = vi.fn();
  const onSkip = vi.fn();
  const onSearch = vi.fn().mockResolvedValue(undefined);
  const onChoose = vi.fn();
  const onCancelSearch = vi.fn();
  render(
    <CatalogMatchRow
      row={row}
      index={2}
      isSearching={false}
      searchContext={null}
      onOpenSearch={onOpenSearch}
      onSkip={onSkip}
      onSearchQueryChange={vi.fn()}
      onSearch={onSearch}
      onChoose={onChoose}
      onCancelSearch={onCancelSearch}
      {...overrides}
    />
  );
  return { onOpenSearch, onSkip, onSearch, onChoose, onCancelSearch };
}

afterEach(cleanup);

describe('CatalogMatchRow', () => {
  it('renders the matched song metadata and sends row actions to its index', () => {
    const { onOpenSearch, onSkip } = renderRow(matchedRow);

    expect(screen.getByText('03')).toBeInTheDocument();
    expect(screen.getByText('Song A (Live)')).toBeInTheDocument();
    expect(screen.getByText('Matched')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Change match for Song A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip Song A' }));
    expect(onOpenSearch).toHaveBeenCalledWith(2);
    expect(onSkip).toHaveBeenCalledWith(2);
  });

  it('shows pending rows as searching and disables actions while matching is in progress', () => {
    renderRow({ ...matchedRow, appleTrack: null, status: 'pending' });

    expect(screen.getAllByText('Searching')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Change match for Song A' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip Song A' })).toBeDisabled();
  });

  it('renders skipped rows without a skip action', () => {
    renderRow({ ...matchedRow, appleTrack: null, status: 'skipped' });

    expect(screen.getByText('No match selected')).toBeInTheDocument();
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip Song A' })).not.toBeInTheDocument();
  });

  it('renders unmatched rows and wires the open search panel to this row', () => {
    const onSearchQueryChange = vi.fn();
    const { onSearch, onChoose, onCancelSearch } = renderRow(
      { ...matchedRow, appleTrack: null, status: 'unmatched' },
      {
        isSearching: true,
        searchContext: {
          searchingIndex: 2,
          searchQuery: 'Song A',
          searchResults: [{ id: 'track-b', name: 'Song B', artistName: 'Artist B' }],
          searching: false,
          searchError: false,
          hasSearched: true,
        },
        onSearchQueryChange,
      }
    );

    expect(screen.getByText('No match found')).toBeInTheDocument();
    expect(screen.getByText('Unmatched')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Song B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search Apple Music' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Song B by Artist B' }));
    fireEvent.keyDown(screen.getByRole('search'), { key: 'Escape' });

    expect(onSearchQueryChange).toHaveBeenCalledWith('Song B');
    expect(onSearch).toHaveBeenCalledWith(2);
    expect(onChoose).toHaveBeenCalledWith(2, {
      id: 'track-b',
      name: 'Song B',
      artistName: 'Artist B',
    });
    expect(onCancelSearch).toHaveBeenCalledOnce();
  });
});
