import { initMusicKit } from './client';
import type {
  CreatePlaylistResult,
  MusicKitPlaylistCreateResponse,
  MusicKitAddTracksResponse,
} from './types';
import { throwIfMusicKitError } from './types';

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
): Promise<void> {
  if (songIds.length === 0) return;
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
  const path = `/v1/me/library/playlists/${playlistId}/tracks`;
  const data = {
    data: validIds.map((id) => ({ id: id.trim(), type: 'songs' as const })),
  };
  const res = (await music.music.api(path, { method: 'POST', data })) as
    | MusicKitAddTracksResponse
    | undefined;
  if (res) {
    throwIfMusicKitError(res, 'Adding tracks to playlist failed');
  }
}
