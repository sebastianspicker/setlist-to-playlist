// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../../src/lib/musickit', () => ({
  searchCatalog: vi.fn(),
}));

import { searchCatalog } from '../../src/lib/musickit';
const mockSearchCatalog = vi.mocked(searchCatalog);

import { useMatchingSuggestions } from '../../src/features/matching/useMatchingSuggestions';
import type { Setlist } from '@repo/core';

const mockSetlist: Setlist = {
  id: 'test-123',
  artist: 'Test Artist',
  venue: 'Test Venue',
  sets: [
    [
      { name: 'Song A', artist: 'Test Artist' },
      { name: 'Song B', artist: 'Test Artist' },
      { name: 'Song C', artist: 'Test Artist' },
    ],
  ],
};

describe('useMatchingSuggestions', () => {
  beforeEach(() => {
    mockSearchCatalog.mockReset();
    mockSearchCatalog.mockResolvedValue([]);
  });

  it('starts with loadingSuggestions true', () => {
    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));
    expect(result.current.loadingSuggestions).toBe(true);
  });

  it('creates initial matches from setlist entries', () => {
    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));
    expect(result.current.matches).toHaveLength(3);
    expect(result.current.matches[0]?.setlistEntry.name).toBe('Song A');
    expect(result.current.matches[0]?.status).toBe('unmatched');
  });

  it('autoMatchAll calls searchCatalog for each entry', async () => {
    mockSearchCatalog.mockResolvedValue([{ id: '1', name: 'Song A', artistName: 'Test Artist' }]);

    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));

    await waitFor(() => {
      expect(result.current.loadingSuggestions).toBe(false);
    });

    expect(mockSearchCatalog.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(mockSearchCatalog.mock.calls.slice(0, 3)).toEqual([
      ['Song A Test Artist', 1],
      ['Song B Test Artist', 1],
      ['Song C Test Artist', 1],
    ]);
  });

  it('setMatch updates a specific row', async () => {
    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));

    await waitFor(() => {
      expect(result.current.loadingSuggestions).toBe(false);
    });

    const track = { id: '99', name: 'Custom Track', artistName: 'Custom Artist' };
    act(() => result.current.setMatch(1, track));

    expect(result.current.matches[1]?.appleTrack).toEqual(track);
    expect(result.current.matches[1]?.status).toBe('matched');
  });

  it('skipUnmatched marks all unmatched rows as skipped', async () => {
    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));

    await waitFor(() => {
      expect(result.current.loadingSuggestions).toBe(false);
    });

    act(() => result.current.skipUnmatched());

    for (const row of result.current.matches) {
      expect(row.status).toBe('skipped');
    }
  });

  it('resetMatches clears all matches back to unmatched', async () => {
    mockSearchCatalog.mockResolvedValue([{ id: '1', name: 'Song A', artistName: 'Test Artist' }]);

    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));

    await waitFor(() => {
      expect(result.current.loadingSuggestions).toBe(false);
    });

    act(() => result.current.resetMatches());

    for (const row of result.current.matches) {
      expect(row.status).toBe('unmatched');
      expect(row.appleTrack).toBeNull();
    }
  });
});
