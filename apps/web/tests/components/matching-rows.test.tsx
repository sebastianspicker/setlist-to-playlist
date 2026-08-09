// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const rowSpy = vi.fn();
vi.mock('../../src/features/matching/CatalogMatchRow', () => ({
  CatalogMatchRow: (props: {
    index: number;
    row: { setlistEntry: { name: string } };
    isSearching: boolean;
    onOpenSearch: (index: number) => void;
  }) => {
    rowSpy(props);
    return React.createElement(
      'button',
      { onClick: () => props.onOpenSearch(props.index) },
      props.row.setlistEntry.name
    );
  },
}));

import { MatchingRows } from '../../src/features/matching/MatchingRows';
import type { MatchRow } from '../../src/features/matching/types';

afterEach(() => {
  cleanup();
  rowSpy.mockClear();
});

describe('MatchingRows', () => {
  it('gives only the active row the shared search context', () => {
    const onOpenSearch = vi.fn();
    const matches: MatchRow[] = [
      { setlistEntry: { name: 'Song A' }, appleTrack: null, status: 'unmatched' },
      { setlistEntry: { name: 'Song B' }, appleTrack: null, status: 'unmatched' },
    ];
    render(
      <MatchingRows
        matches={matches}
        searchContext={{
          searchingIndex: 1,
          searchQuery: 'Song B',
          searchResults: [],
          searching: false,
          searchError: false,
          hasSearched: false,
        }}
        onOpenSearch={onOpenSearch}
        onSkip={vi.fn()}
        onSearchQueryChange={vi.fn()}
        onSearch={vi.fn().mockResolvedValue(undefined)}
        onChoose={vi.fn()}
        onCancelSearch={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Song B' }));
    expect(onOpenSearch).toHaveBeenCalledWith(1);
    expect(rowSpy.mock.calls[0]?.[0].searchContext).toBeNull();
    expect(rowSpy.mock.calls[1]?.[0].searchContext).toMatchObject({ searchQuery: 'Song B' });
  });
});
