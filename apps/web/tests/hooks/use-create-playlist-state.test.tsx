// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Setlist } from '@repo/core';
import type { MatchRow } from '../../src/features/matching/types';

const mockIsMusicKitAuthorized = vi.fn();
const mockCreateLibraryPlaylist = vi.fn();
const mockAddTracksToLibraryPlaylist = vi.fn();

vi.mock('../../src/lib/musickit', () => ({
  isMusicKitAuthorized: (...args: unknown[]) => mockIsMusicKitAuthorized(...args),
  createLibraryPlaylist: (...args: unknown[]) => mockCreateLibraryPlaylist(...args),
  addTracksToLibraryPlaylist: (...args: unknown[]) => mockAddTracksToLibraryPlaylist(...args),
}));

import { useCreatePlaylistState } from '../../src/features/playlist-export/useCreatePlaylistState';

const setlist: Setlist = {
  id: 'setlist-1',
  artist: 'Test Artist',
  venue: 'Test Venue',
  eventDate: '2024-01-01',
  sets: [
    [
      { name: 'Song A', artist: 'Test Artist' },
      { name: 'Song B', artist: 'Test Artist' },
      { name: 'Song C', artist: 'Test Artist' },
    ],
  ],
};

const matchRows: MatchRow[] = [
  {
    setlistEntry: { name: 'Song A', artist: 'Test Artist' },
    appleTrack: { id: 'song-1', name: 'Song A', artistName: 'Test Artist' },
    status: 'matched',
  },
  {
    setlistEntry: { name: 'Song B', artist: 'Test Artist' },
    appleTrack: { id: 'song-2', name: 'Song B', artistName: 'Test Artist' },
    status: 'matched',
  },
  {
    setlistEntry: { name: 'Song C', artist: 'Test Artist' },
    appleTrack: { id: 'song-3', name: 'Song C', artistName: 'Test Artist' },
    status: 'matched',
  },
];

function createAddTracksError(
  message: string,
  remainingIds: string[]
): Error & { remainingIds: string[] } {
  const error = new Error(message) as Error & { remainingIds: string[] };
  error.remainingIds = remainingIds;
  return error;
}

function resumeStorageKey(setlistId: string): string {
  return `playlist_resume_v1:${setlistId}`;
}

describe('useCreatePlaylistState', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockIsMusicKitAuthorized.mockReset();
    mockCreateLibraryPlaylist.mockReset();
    mockAddTracksToLibraryPlaylist.mockReset();
    mockIsMusicKitAuthorized.mockResolvedValue(true);
    mockCreateLibraryPlaylist.mockResolvedValue({
      id: 'playlist-1',
      url: 'https://music.apple.com/playlist/playlist-1',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clears resume state after a full successful create', async () => {
    mockAddTracksToLibraryPlaylist.mockResolvedValue({
      addedIds: ['song-1', 'song-2', 'song-3'],
      remainingIds: [],
    });

    const { result } = renderHook(() => useCreatePlaylistState({ setlist, matchRows }));

    await act(async () => {
      await result.current.handleCreate();
    });

    expect(result.current.created).toEqual({
      id: 'playlist-1',
      url: 'https://music.apple.com/playlist/playlist-1',
    });
    expect(result.current.resumeState).toBeNull();
    expect(window.sessionStorage.getItem(resumeStorageKey(setlist.id))).toBeNull();
  });

  it('persists only the unsubmitted remainder after partial add failure', async () => {
    mockAddTracksToLibraryPlaylist.mockRejectedValue(
      createAddTracksError('Adding tracks failed.', ['song-3'])
    );

    const { result } = renderHook(() => useCreatePlaylistState({ setlist, matchRows }));

    await act(async () => {
      await result.current.handleCreate();
    });

    expect(result.current.created).toEqual({
      id: 'playlist-1',
      url: 'https://music.apple.com/playlist/playlist-1',
    });
    expect(result.current.resumeState?.remainingIds).toEqual(['song-3']);
    expect(window.sessionStorage.getItem(resumeStorageKey(setlist.id))).toContain('song-3');
  });

  it('restores resumable incomplete exports from session storage', async () => {
    mockAddTracksToLibraryPlaylist.mockRejectedValue(
      createAddTracksError('Adding tracks failed.', ['song-3'])
    );

    const firstRender = renderHook(() => useCreatePlaylistState({ setlist, matchRows }));
    await act(async () => {
      await firstRender.result.current.handleCreate();
    });
    firstRender.unmount();

    const { result } = renderHook(() => useCreatePlaylistState({ setlist, matchRows }));

    await waitFor(() => {
      expect(result.current.resumeState?.remainingIds).toEqual(['song-3']);
    });
  });

  it('invalidates stored resume data when the current match selection changes', async () => {
    mockAddTracksToLibraryPlaylist.mockRejectedValue(
      createAddTracksError('Adding tracks failed.', ['song-3'])
    );

    const firstRender = renderHook(() => useCreatePlaylistState({ setlist, matchRows }));
    await act(async () => {
      await firstRender.result.current.handleCreate();
    });
    firstRender.unmount();

    const changedMatchRows: MatchRow[] = [
      matchRows[0]!,
      matchRows[1]!,
      {
        setlistEntry: { name: 'Song C', artist: 'Test Artist' },
        appleTrack: { id: 'song-9', name: 'Song C', artistName: 'Test Artist' },
        status: 'matched',
      },
    ];

    const { result } = renderHook(() =>
      useCreatePlaylistState({ setlist, matchRows: changedMatchRows })
    );

    await waitFor(() => {
      expect(result.current.resumeState).toBeNull();
    });
    expect(window.sessionStorage.getItem(resumeStorageKey(setlist.id))).toBeNull();
  });

  it('clears resume state after a successful retry of the remaining songs', async () => {
    mockAddTracksToLibraryPlaylist
      .mockRejectedValueOnce(createAddTracksError('Adding tracks failed.', ['song-3']))
      .mockResolvedValueOnce({ addedIds: ['song-3'], remainingIds: [] });

    const { result } = renderHook(() => useCreatePlaylistState({ setlist, matchRows }));

    await act(async () => {
      await result.current.handleCreate();
    });
    await act(async () => {
      await result.current.handleAddRemainingTracks();
    });

    expect(result.current.resumeState).toBeNull();
    expect(result.current.addTracksError).toBeNull();
    expect(window.sessionStorage.getItem(resumeStorageKey(setlist.id))).toBeNull();
  });
});

describe('useCreatePlaylistState – additional paths', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockIsMusicKitAuthorized.mockReset();
    mockCreateLibraryPlaylist.mockReset();
    mockAddTracksToLibraryPlaylist.mockReset();
    mockIsMusicKitAuthorized.mockResolvedValue(true);
    mockCreateLibraryPlaylist.mockResolvedValue({
      id: 'playlist-1',
      url: 'https://music.apple.com/playlist/playlist-1',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets needsAuth=true when MusicKit is not authorized at create time', async () => {
    mockIsMusicKitAuthorized.mockResolvedValue(false);

    const { result } = renderHook(() => useCreatePlaylistState({ setlist, matchRows }));

    await act(async () => {
      await result.current.handleCreate();
    });

    expect(result.current.needsAuth).toBe(true);
    expect(mockCreateLibraryPlaylist).not.toHaveBeenCalled();
  });

  it('handleAuthorized clears needsAuth and proceeds to create', async () => {
    mockIsMusicKitAuthorized.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mockAddTracksToLibraryPlaylist.mockResolvedValue({ addedIds: ['song-1'], remainingIds: [] });

    const { result } = renderHook(() => useCreatePlaylistState({ setlist, matchRows }));

    await act(async () => {
      await result.current.handleCreate();
    });
    expect(result.current.needsAuth).toBe(true);

    await act(async () => {
      await result.current.handleAuthorized();
    });

    expect(result.current.needsAuth).toBe(false);
    expect(result.current.created).not.toBeNull();
  });

  it('dedupeTrackIds removes duplicate song IDs from songIds when dedupeTracks is enabled', () => {
    const dupMatchRows: MatchRow[] = [
      {
        setlistEntry: { name: 'Song A', artist: 'Test Artist' },
        appleTrack: { id: 'song-1', name: 'Song A', artistName: 'Test Artist' },
        status: 'matched',
      },
      {
        setlistEntry: { name: 'Song A (encore)', artist: 'Test Artist' },
        appleTrack: { id: 'song-1', name: 'Song A', artistName: 'Test Artist' },
        status: 'matched',
      },
      {
        setlistEntry: { name: 'Song B', artist: 'Test Artist' },
        appleTrack: { id: 'song-2', name: 'Song B', artistName: 'Test Artist' },
        status: 'matched',
      },
    ];

    const { result } = renderHook(() =>
      useCreatePlaylistState({ setlist, matchRows: dupMatchRows })
    );

    expect(result.current.selectedSongIds).toEqual(['song-1', 'song-1', 'song-2']);
    expect(result.current.songIds).toEqual(['song-1', 'song-1', 'song-2']);

    act(() => {
      result.current.setDedupeTracks(true);
    });

    expect(result.current.songIds).toEqual(['song-1', 'song-2']);
  });

  it('discards stale resume state older than 30 minutes', async () => {
    const sig = JSON.stringify({
      dedupeTracks: false,
      songIds: ['song-1', 'song-2', 'song-3'],
    });
    const staleResume = JSON.stringify({
      status: 'incomplete',
      id: 'playlist-1',
      url: 'https://music.apple.com/playlist/playlist-1',
      remainingIds: ['song-3'],
      selectionSignature: sig,
      storedAt: Date.now() - 31 * 60 * 1000,
    });
    window.sessionStorage.setItem(resumeStorageKey(setlist.id), staleResume);

    const { result } = renderHook(() => useCreatePlaylistState({ setlist, matchRows }));

    await waitFor(() => {
      expect(result.current.resumeState).toBeNull();
    });
    expect(window.sessionStorage.getItem(resumeStorageKey(setlist.id))).toBeNull();
  });

  it('updates remainingIds in storage when a retry of remaining tracks also partially fails', async () => {
    mockAddTracksToLibraryPlaylist
      .mockRejectedValueOnce(createAddTracksError('Fail', ['song-2', 'song-3']))
      .mockRejectedValueOnce(createAddTracksError('Fail again', ['song-3']));

    const { result } = renderHook(() => useCreatePlaylistState({ setlist, matchRows }));

    await act(async () => {
      await result.current.handleCreate();
    });
    expect(result.current.resumeState?.remainingIds).toEqual(['song-2', 'song-3']);

    await act(async () => {
      await result.current.handleAddRemainingTracks();
    });

    expect(result.current.resumeState?.remainingIds).toEqual(['song-3']);
    expect(result.current.addTracksError).toBe('Fail again');
  });

  it('shows an error (not needsAuth) when playlist creation itself fails', async () => {
    mockCreateLibraryPlaylist.mockRejectedValue(new Error('Apple Music API unavailable'));

    const { result } = renderHook(() => useCreatePlaylistState({ setlist, matchRows }));

    await act(async () => {
      await result.current.handleCreate();
    });

    expect(result.current.error).toBe('Apple Music API unavailable');
    expect(result.current.created).toBeNull();
    expect(result.current.needsAuth).toBe(false);
  });
});
