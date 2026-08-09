// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
vi.mock('../../src/lib/musickit', () => ({
  searchCatalog: vi.fn(),
  isValidAppleMusicTrack: () => false,
}));
import { searchCatalog } from '../../src/lib/musickit';
import { useCatalogMatchSuggestions } from '../../src/features/matching/useCatalogMatchSuggestions';
import { matchingSetlist } from './catalog-match-suggestions.test-support';
const mockSearchCatalog = vi.mocked(searchCatalog);
beforeEach(() => {
  mockSearchCatalog.mockReset();
  mockSearchCatalog.mockResolvedValue([]);
});
describe('catalog match suggestion initialization', () => {
  it('starts loading before its scheduled automatic run', () => {
    const { result } = renderHook(() => useCatalogMatchSuggestions(matchingSetlist));
    expect(result.current.loadingSuggestions).toBe(true);
  });
  it('creates pending matches from the setlist entries', () => {
    const { result } = renderHook(() => useCatalogMatchSuggestions(matchingSetlist));
    expect(result.current.matches).toHaveLength(3);
    expect(result.current.matches[0]?.setlistEntry.name).toBe('Song A');
    expect(result.current.matches[0]?.status).toBe('pending');
  });
  it('restores an existing draft without another automatic run', () => {
    const draft = [
      {
        setlistEntry: { name: 'Song A', artist: 'Test Artist' },
        appleTrack: { id: 'manual', name: 'Manual match', artistName: 'Artist' },
        status: 'matched' as const,
      },
    ];
    const { result } = renderHook(() => useCatalogMatchSuggestions(matchingSetlist, draft));
    expect(result.current.matches).toEqual(draft);
    expect(result.current.loadingSuggestions).toBe(false);
    expect(mockSearchCatalog).not.toHaveBeenCalled();
  });
});
