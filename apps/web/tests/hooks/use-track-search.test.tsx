// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { MatchRow } from '../../src/features/matching/types';

const mockSearchCatalog = vi.fn();

vi.mock('../../src/lib/musickit', () => ({
  searchCatalog: (...args: unknown[]) => mockSearchCatalog(...args),
}));

import { useTrackSearch } from '../../src/features/matching/useTrackSearch';

const matches: MatchRow[] = [
  {
    setlistEntry: { name: 'Song A', artist: 'Artist A' },
    appleTrack: null,
    status: 'unmatched',
  },
];

describe('useTrackSearch', () => {
  beforeEach(() => {
    mockSearchCatalog.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs a manual search and stores the returned results', async () => {
    const setMatch = vi.fn();
    mockSearchCatalog.mockResolvedValueOnce([
      { id: 'song-1', name: 'Song A', artistName: 'Artist A' },
    ]);

    const { result } = renderHook(() => useTrackSearch({ matches, setMatch }));

    act(() => {
      result.current.openSearch(0);
      result.current.setSearchQuery('Custom Song Query');
    });
    await act(async () => {
      await result.current.runSearch(0);
    });

    expect(mockSearchCatalog).toHaveBeenCalledWith('Custom Song Query', 8);
    expect(result.current.searchContext.searchResults).toEqual([
      { id: 'song-1', name: 'Song A', artistName: 'Artist A' },
    ]);
    expect(result.current.searchContext.hasSearched).toBe(true);
  });

  it('skipTrack clears the active manual search and marks the row skipped', async () => {
    const setMatch = vi.fn();
    mockSearchCatalog.mockResolvedValueOnce([
      { id: 'song-1', name: 'Song A', artistName: 'Artist A' },
    ]);

    const { result } = renderHook(() => useTrackSearch({ matches, setMatch }));

    act(() => {
      result.current.openSearch(0);
      result.current.setSearchQuery('Song A');
    });
    await act(async () => {
      await result.current.runSearch(0);
    });

    act(() => {
      result.current.skipTrack(0);
    });

    await waitFor(() => {
      expect(result.current.searchContext.searchingIndex).toBeNull();
    });
    expect(result.current.searchContext.searchResults).toEqual([]);
    expect(result.current.searchContext.searchQuery).toBe('');
    expect(setMatch).toHaveBeenCalledWith(0, null);
  });
});
