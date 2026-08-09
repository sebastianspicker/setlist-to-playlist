// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Setlist } from '@repo/core';
import type { MatchRow } from '../../src/features/matching/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const isMusicKitAuthorized = vi.fn();
const createLibraryPlaylist = vi.fn();
const addTracksToLibraryPlaylist = vi.fn();
vi.mock('../../src/lib/musickit', () => ({
  isMusicKitAuthorized: (...args: unknown[]) => isMusicKitAuthorized(...args),
  createLibraryPlaylist: (...args: unknown[]) => createLibraryPlaylist(...args),
  addTracksToLibraryPlaylist: (...args: unknown[]) => addTracksToLibraryPlaylist(...args),
}));

import { usePlaylistExportState } from '../../src/features/playlist-export/usePlaylistExportState';

const setlist: Setlist = {
  id: 'setlist-1',
  artist: 'Test Artist',
  venue: 'Test Venue',
  eventDate: '2024-01-01',
  sets: [[]],
};
const matchRows: MatchRow[] = ['song-1', 'song-2', 'song-3'].map((id) => ({
  setlistEntry: { name: id, artist: 'Test Artist' },
  appleTrack: { id, name: id, artistName: 'Test Artist' },
  status: 'matched',
}));
const resumeKey = `playlist_resume_v1:${setlist.id}`;

beforeEach(() => {
  window.sessionStorage.clear();
  isMusicKitAuthorized.mockReset().mockResolvedValue(true);
  createLibraryPlaylist
    .mockReset()
    .mockResolvedValue({ id: 'playlist-1', url: 'https://music.apple.com/p' });
  addTracksToLibraryPlaylist
    .mockReset()
    .mockResolvedValue({ addedIds: ['song-1'], remainingIds: [] });
});
afterEach(() => vi.restoreAllMocks());

describe('usePlaylistExportState', () => {
  it('creates a playlist and clears any completed resume data', async () => {
    const { result } = renderHook(() => usePlaylistExportState({ setlist, matchRows }));
    await act(async () => result.current.handleCreate());
    expect(result.current.created?.id).toBe('playlist-1');
    expect(result.current.resumeState).toBeNull();
    expect(window.sessionStorage.getItem(resumeKey)).toBeNull();
  });

  it('persists exact remaining songs and finishes a later retry', async () => {
    const partial = Object.assign(new Error('Adding tracks failed.'), { remainingIds: ['song-3'] });
    addTracksToLibraryPlaylist
      .mockRejectedValueOnce(partial)
      .mockResolvedValueOnce({ addedIds: ['song-3'], remainingIds: [] });
    const { result } = renderHook(() => usePlaylistExportState({ setlist, matchRows }));
    await act(async () => result.current.handleCreate());
    expect(result.current.resumeState?.remainingIds).toEqual(['song-3']);
    await act(async () => result.current.handleAddRemainingTracks());
    expect(result.current.resumeState).toBeNull();
    expect(window.sessionStorage.getItem(resumeKey)).toBeNull();
  });

  it('does not resume uncertain add-track progress', async () => {
    addTracksToLibraryPlaylist.mockRejectedValue(new Error('Adding tracks failed.'));
    const { result } = renderHook(() => usePlaylistExportState({ setlist, matchRows }));
    await act(async () => result.current.handleCreate());
    addTracksToLibraryPlaylist.mockClear();
    await act(async () => result.current.handleAddRemainingTracks());
    expect(addTracksToLibraryPlaylist).not.toHaveBeenCalled();
    expect(result.current.addTracksError).toMatch(/Cannot safely resume/);
  });

  it('requires authorization before creating and deduplicates only when enabled', async () => {
    isMusicKitAuthorized.mockResolvedValue(false);
    const duplicated = [...matchRows, matchRows[0]!];
    const { result } = renderHook(() => usePlaylistExportState({ setlist, matchRows: duplicated }));
    await act(async () => result.current.handleCreate());
    expect(result.current.needsAuth).toBe(true);
    expect(createLibraryPlaylist).not.toHaveBeenCalled();
    act(() => result.current.setDedupeTracks(true));
    await waitFor(() => expect(result.current.songIds).toEqual(['song-1', 'song-2', 'song-3']));
  });
});
