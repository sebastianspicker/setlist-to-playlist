// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
vi.mock('../../src/lib/musickit', () => ({
  searchCatalog: vi.fn(),
  isValidAppleMusicTrack: (track: unknown) =>
    Boolean(
      track &&
      typeof track === 'object' &&
      typeof (track as { id?: unknown }).id === 'string' &&
      (track as { id: string }).id.trim()
    ),
}));
import { searchCatalog } from '../../src/lib/musickit';
import { useCatalogMatchSuggestions } from '../../src/features/matching/useCatalogMatchSuggestions';
import {
  deferred,
  duplicateMatchingSetlist,
  matchingSetlist,
} from './catalog-match-suggestions.test-support';
import type { Setlist } from '@repo/core';
const mockSearchCatalog = vi.mocked(searchCatalog);
beforeEach(() => {
  mockSearchCatalog.mockReset();
  mockSearchCatalog.mockResolvedValue([]);
});
describe('catalog match automatic suggestions', () => {
  it('queries every entry', async () => {
    mockSearchCatalog.mockResolvedValue([{ id: '1', name: 'Song A', artistName: 'Test Artist' }]);
    const { result } = renderHook(() => useCatalogMatchSuggestions(matchingSetlist));
    await waitFor(() => expect(result.current.loadingSuggestions).toBe(false));
    expect(mockSearchCatalog.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(mockSearchCatalog.mock.calls.slice(0, 3)).toEqual([
      ['Song A Test Artist', 1],
      ['Song B Test Artist', 1],
      ['Song C Test Artist', 1],
    ]);
  });
  it('does not overwrite a manual match when automatic results arrive late', async () => {
    const searches = [
      deferred<{ id: string; name: string; artistName: string }[]>(),
      deferred<{ id: string; name: string; artistName: string }[]>(),
      deferred<{ id: string; name: string; artistName: string }[]>(),
    ];
    let next = 0;
    mockSearchCatalog.mockImplementation(() => searches[next++]!.promise);
    const { result } = renderHook(() => useCatalogMatchSuggestions(matchingSetlist));
    await waitFor(() => expect(mockSearchCatalog).toHaveBeenCalledTimes(3));
    const manualTrack = { id: 'manual-1', name: 'Manual Song A', artistName: 'Manual Artist' };
    act(() => result.current.setMatch(0, manualTrack));
    await act(async () => {
      searches.forEach((search) =>
        search.resolve([{ id: 'unused', name: 'Unused', artistName: 'Unused' }])
      );
    });
    await waitFor(() => expect(result.current.loadingSuggestions).toBe(false));
    expect(result.current.matches[0]?.appleTrack).toEqual(manualTrack);
    expect(result.current.matches[0]?.status).toBe('matched');
  });
  it('shares duplicate in-flight queries', async () => {
    mockSearchCatalog.mockResolvedValue([{ id: '1', name: 'Song A', artistName: 'Test Artist' }]);
    const { result } = renderHook(() => useCatalogMatchSuggestions(duplicateMatchingSetlist));
    await waitFor(() => expect(result.current.loadingSuggestions).toBe(false));
    expect(mockSearchCatalog).toHaveBeenCalledTimes(1);
    expect(result.current.matches[0]?.appleTrack?.id).toBe('1');
    expect(result.current.matches[1]?.appleTrack?.id).toBe('1');
  });
  it('rejects malformed catalog rows', async () => {
    mockSearchCatalog.mockResolvedValue([{ id: '', name: 'Song A', artistName: 'Test Artist' }]);
    const setlist: Setlist = {
      id: 'invalid-track-id',
      artist: 'Test Artist',
      sets: [[{ name: 'Song A', artist: 'Test Artist' }]],
    };
    const { result } = renderHook(() => useCatalogMatchSuggestions(setlist));
    await waitFor(() => expect(result.current.loadingSuggestions).toBe(false));
    expect(result.current.matches[0]?.appleTrack).toBeNull();
    expect(result.current.matches[0]?.status).toBe('unmatched');
  });
});
