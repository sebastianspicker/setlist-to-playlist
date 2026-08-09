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
import { matchingSetlist } from './catalog-match-suggestions.test-support';
const mockSearchCatalog = vi.mocked(searchCatalog);
beforeEach(() => {
  mockSearchCatalog.mockReset();
  mockSearchCatalog.mockResolvedValue([]);
});
describe('catalog match suggestion row actions', () => {
  it('updates a specific row with a manual track', async () => {
    const { result } = renderHook(() => useCatalogMatchSuggestions(matchingSetlist));
    await waitFor(() => expect(result.current.loadingSuggestions).toBe(false));
    const track = { id: '99', name: 'Custom Track', artistName: 'Custom Artist' };
    act(() => result.current.setMatch(1, track));
    expect(result.current.matches[1]?.appleTrack).toEqual(track);
    expect(result.current.matches[1]?.status).toBe('matched');
  });
  it('ignores invalid manual-match indices', async () => {
    const { result } = renderHook(() => useCatalogMatchSuggestions(matchingSetlist));
    await waitFor(() => expect(result.current.loadingSuggestions).toBe(false));
    const before = result.current.matches;
    act(() => {
      result.current.setMatch(-1, { id: '99', name: 'Custom Track', artistName: 'Custom Artist' });
      result.current.setMatch(result.current.matches.length, {
        id: '99',
        name: 'Custom Track',
        artistName: 'Custom Artist',
      });
    });
    expect(result.current.matches).toEqual(before);
  });
  it('skips every unmatched row', async () => {
    const { result } = renderHook(() => useCatalogMatchSuggestions(matchingSetlist));
    await waitFor(() => expect(result.current.loadingSuggestions).toBe(false));
    act(() => result.current.skipUnmatched());
    for (const row of result.current.matches) expect(row.status).toBe('skipped');
  });
});
