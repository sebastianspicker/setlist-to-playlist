// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
const mockSearchCatalog = vi.fn();
vi.mock('../../src/lib/musickit', () => ({
  searchCatalog: (...args: unknown[]) => mockSearchCatalog(...args),
}));
import { useCatalogTrackSearch } from '../../src/features/matching/useCatalogTrackSearch';
import { catalogMatches } from './catalog-track-search.test-support';
beforeEach(() => mockSearchCatalog.mockReset());
describe('catalog track search queries', () => {
  it('ignores invalid row indices', async () => {
    const setMatch = vi.fn();
    const { result } = renderHook(() =>
      useCatalogTrackSearch({ matches: catalogMatches, setMatch })
    );
    act(() => {
      result.current.openSearch(-1);
      result.current.chooseTrack(-1, { id: 'song-1', name: 'Song A', artistName: 'Artist A' });
      result.current.skipTrack(2);
    });
    await act(async () => {
      await result.current.runSearch(-1);
      await result.current.runSearch(2);
    });
    expect(result.current.searchContext.searchingIndex).toBeNull();
    expect(result.current.searchContext.searchQuery).toBe('');
    expect(mockSearchCatalog).not.toHaveBeenCalled();
    expect(setMatch).not.toHaveBeenCalled();
  });
  it('searches with a custom query and stores the results', async () => {
    const setMatch = vi.fn();
    mockSearchCatalog.mockResolvedValueOnce([
      { id: 'song-1', name: 'Song A', artistName: 'Artist A' },
    ]);
    const { result } = renderHook(() =>
      useCatalogTrackSearch({ matches: catalogMatches, setMatch })
    );
    act(() => result.current.openSearch(0));
    expect(result.current.searchContext.searchQuery).toBe('Song A Artist A');
    act(() => result.current.setSearchQuery('Custom Song Query'));
    await act(async () => {
      await result.current.runSearch(0);
    });
    expect(mockSearchCatalog).toHaveBeenCalledWith('Custom Song Query', 8);
    expect(result.current.searchContext.searchResults).toEqual([
      { id: 'song-1', name: 'Song A', artistName: 'Artist A' },
    ]);
    expect(result.current.searchContext.hasSearched).toBe(true);
  });
});
