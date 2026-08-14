// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
const mockSearchCatalog = vi.fn();
vi.mock('../../src/lib/musickit', () => ({
  searchCatalog: (...args: unknown[]) => mockSearchCatalog(...args),
}));
import { useCatalogTrackSearch } from '../../src/features/matching/useCatalogTrackSearch';
import { catalogMatches, deferred } from './catalog-track-search.test-support';
beforeEach(() => mockSearchCatalog.mockReset());
describe('catalog track search lifecycle', () => {
  it('skips the active row and clears its manual search', async () => {
    const setMatch = vi.fn();
    mockSearchCatalog.mockResolvedValueOnce([
      { id: 'song-1', name: 'Song A', artistName: 'Artist A' },
    ]);
    const { result } = renderHook(() =>
      useCatalogTrackSearch({ matches: catalogMatches, setMatch })
    );
    act(() => {
      result.current.openSearch(0);
      result.current.setSearchQuery('Song A');
    });
    await act(async () => {
      await result.current.runSearch(0);
    });
    act(() => result.current.skipTrack(0));
    await waitFor(() => expect(result.current.searchContext.searchingIndex).toBeNull());
    expect(result.current.searchContext.searchResults).toEqual([]);
    expect(result.current.searchContext.searchQuery).toBe('');
    expect(setMatch).toHaveBeenCalledWith(0, null);
  });
  it('ignores stale results after switching rows', async () => {
    const setMatch = vi.fn();
    const search = deferred<{ id: string; name: string; artistName: string }[]>();
    mockSearchCatalog.mockReturnValueOnce(search.promise);
    const { result } = renderHook(() =>
      useCatalogTrackSearch({ matches: catalogMatches, setMatch })
    );
    let promise!: Promise<void>;
    act(() => {
      result.current.openSearch(0);
      promise = result.current.runSearch(0);
    });
    await waitFor(() => expect(result.current.searchContext.searching).toBe(true));
    act(() => result.current.openSearch(1));
    await act(async () => {
      search.resolve([{ id: 'song-1', name: 'Song A', artistName: 'Artist A' }]);
      await promise;
    });
    expect(result.current.searchContext.searchingIndex).toBe(1);
    expect(result.current.searchContext.searching).toBe(false);
    expect(result.current.searchContext.searchResults).toEqual([]);
    expect(result.current.searchContext.hasSearched).toBe(false);
  });
});
