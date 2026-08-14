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

const TRACK_BATCH_SIZE = 100;

type MusicKitInstance = Awaited<ReturnType<typeof initMusicKit>>;

const trackBatchPayload = (ids: string[]) => ({
  data: ids.map((id) => ({ id: id.trim(), type: 'songs' as const })),
});

const addTrackBatch = async (
  music: MusicKitInstance,
  path: string,
  batch: string[]
): Promise<MusicKitAddTracksResponse | undefined> =>
  (await music.music.api(path, { method: 'POST', data: trackBatchPayload(batch) })) as
    | MusicKitAddTracksResponse
    | undefined;

function validatedTrackIds(playlistId: string, songIds: string[]): string[] {
  if (!playlistId.trim()) {
    throw new Error('Invalid playlist ID');
  }
  const validIds = songIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (validIds.length === 0) {
    throw new Error('No valid song IDs to add');
  }
  return validIds;
}

export class AmbiguousMusicMutationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AmbiguousMusicMutationError';
  }
}

export class AddTracksToLibraryPlaylistError extends Error {
  readonly progress: 'exact' | 'unknown';
  readonly addedIds: string[];
  readonly remainingIds: string[];
  readonly attemptedIds: string[];

  constructor(
    message: string,
    {
      addedIds,
      remainingIds,
      progress = 'exact',
      attemptedIds = [],
    }: {
      addedIds: string[];
      remainingIds: string[];
      progress?: 'exact' | 'unknown';
      attemptedIds?: string[];
    }
  ) {
    super(message);
    this.name = 'AddTracksToLibraryPlaylistError';
    this.progress = progress;
    this.addedIds = addedIds;
    this.remainingIds = remainingIds;
    this.attemptedIds = attemptedIds;
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
  let res: MusicKitPlaylistCreateResponse;
  try {
    res = (await music.music.api(path, {
      method: 'POST',
      data: body,
    })) as MusicKitPlaylistCreateResponse;
  } catch (error) {
    throw new AmbiguousMusicMutationError(
      'Apple Music did not confirm whether the playlist was created. Check your library before retrying.',
      { cause: error }
    );
  }
  throwIfMusicKitError(res, 'Failed to create playlist');
  const playlist = Array.isArray(res?.data) ? res.data[0] : res?.data;
  if (!playlist?.id) {
    throw new AmbiguousMusicMutationError(
      'Apple Music returned no playlist ID. Check your library before retrying.'
    );
  }
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
  const validIds = validatedTrackIds(playlistId, songIds);
  const music = await initMusicKit();
  if (!music.isAuthorized) {
    throw new Error('Not authorized. Please connect Apple Music first.');
  }
  const path = `/v1/me/library/playlists/${encodeURIComponent(playlistId)}/tracks`;
  let addedCount = 0;
  for (let i = 0; i < validIds.length; i += TRACK_BATCH_SIZE) {
    const batch = validIds.slice(i, i + TRACK_BATCH_SIZE);
    let res: MusicKitAddTracksResponse | undefined;
    try {
      res = await addTrackBatch(music, path, batch);
    } catch {
      throw new AddTracksToLibraryPlaylistError(
        'Apple Music did not confirm whether the current track batch was added. Check the playlist before retrying.',
        {
          progress: 'unknown',
          addedIds: validIds.slice(0, addedCount),
          remainingIds: [],
          attemptedIds: validIds.slice(addedCount),
        }
      );
    }

    try {
      if (res) {
        throwIfMusicKitError(res, 'Adding tracks to playlist failed');
      }
      addedCount += batch.length;
    } catch (error) {
      throw new AddTracksToLibraryPlaylistError(
        error instanceof Error ? error.message : 'Adding tracks to playlist failed',
        {
          progress: 'exact',
          addedIds: validIds.slice(0, addedCount),
          remainingIds: validIds.slice(addedCount),
        }
      );
    }
  }

  return { addedIds: validIds, remainingIds: [] };
}
