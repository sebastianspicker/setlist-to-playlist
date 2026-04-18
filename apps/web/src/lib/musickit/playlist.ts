import { initMusicKit } from './client';
import type {
  CreatePlaylistResult,
  MusicKitPlaylistCreateResponse,
  MusicKitAddTracksResponse,
} from './types';
import { throwIfMusicKitError } from './types';

export interface AddTracksToLibraryPlaylistResult {
  addedIds: string[];
  remainingIds: string[];
}

export class AddTracksToLibraryPlaylistError extends Error {
  readonly addedIds: string[];
  readonly remainingIds: string[];

  constructor(
    message: string,
    {
      addedIds,
      remainingIds,
    }: {
      addedIds: string[];
      remainingIds: string[];
    }
  ) {
    super(message);
    this.name = 'AddTracksToLibraryPlaylistError';
    this.addedIds = addedIds;
    this.remainingIds = remainingIds;
  }
}

export async function createLibraryPlaylist(name: string): Promise<CreatePlaylistResult> {
  const music = await initMusicKit();
  if (!music.isAuthorized) {
    throw new Error('Not authorized. Please connect Apple Music first.');
  }
  const path = '/v1/me/library/playlists';
  const body = {
    data: [{ type: 'playlists' as const, attributes: { name } }],
  };
  const res = (await music.music.api(path, {
    method: 'POST',
    data: body,
  })) as MusicKitPlaylistCreateResponse;
  throwIfMusicKitError(res, 'Failed to create playlist');
  const playlist = Array.isArray(res?.data) ? res.data[0] : res?.data;
  if (!playlist?.id) throw new Error('Failed to create playlist');
  return { id: playlist.id, url: playlist.attributes?.url };
}

/**
 * Add song IDs to a library playlist in order. Requires authorization.
 */
export async function addTracksToLibraryPlaylist(
  playlistId: string,
  songIds: string[]
): Promise<AddTracksToLibraryPlaylistResult> {
  if (songIds.length === 0) {
    return { addedIds: [], remainingIds: [] };
  }
  if (!playlistId?.trim()) {
    throw new Error('Invalid playlist ID');
  }
  const validIds = songIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (validIds.length === 0) {
    throw new Error('No valid song IDs to add');
  }
  const music = await initMusicKit();
  if (!music.isAuthorized) {
    throw new Error('Not authorized. Please connect Apple Music first.');
  }
  const path = `/v1/me/library/playlists/${encodeURIComponent(playlistId)}/tracks`;
  const BATCH_SIZE = 100;
  let addedCount = 0;
  for (let i = 0; i < validIds.length; i += BATCH_SIZE) {
    const batch = validIds.slice(i, i + BATCH_SIZE);
    const data = {
      data: batch.map((id) => ({ id: id.trim(), type: 'songs' as const })),
    };
    try {
      const res = (await music.music.api(path, { method: 'POST', data })) as
        | MusicKitAddTracksResponse
        | undefined;
      if (res) {
        throwIfMusicKitError(res, 'Adding tracks to playlist failed');
      }
      addedCount += batch.length;
    } catch (error) {
      throw new AddTracksToLibraryPlaylistError(
        error instanceof Error ? error.message : 'Adding tracks to playlist failed',
        {
          addedIds: validIds.slice(0, addedCount),
          remainingIds: validIds.slice(addedCount),
        }
      );
    }
  }

  return { addedIds: validIds, remainingIds: [] };
}
