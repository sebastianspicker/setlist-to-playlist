import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockApi = vi.fn();
const mockMusicKitInstance = {
  storefrontId: 'us',
  isAuthorized: true,
  music: { api: mockApi },
  authorize: vi.fn(),
  unauthorize: vi.fn(),
};

vi.mock('../src/lib/musickit/client', () => ({
  initMusicKit: vi.fn(() => Promise.resolve(mockMusicKitInstance)),
}));

import { createLibraryPlaylist, addTracksToLibraryPlaylist } from '../src/lib/musickit/playlist';

describe('createLibraryPlaylist', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockMusicKitInstance.isAuthorized = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('success returns { id, url }', async () => {
    mockApi.mockResolvedValueOnce({
      data: [{ id: 'pl-123', attributes: { url: 'https://music.apple.com/playlist/pl-123' } }],
    });

    const result = await createLibraryPlaylist('My Setlist');
    expect(result).toEqual({
      id: 'pl-123',
      url: 'https://music.apple.com/playlist/pl-123',
    });
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(mockApi).toHaveBeenCalledWith('/v1/me/library/playlists', {
      method: 'POST',
      data: {
        data: [{ type: 'playlists', attributes: { name: 'My Setlist' } }],
      },
    });
  });

  it('not authorized throws', async () => {
    mockMusicKitInstance.isAuthorized = false;

    await expect(createLibraryPlaylist('Test')).rejects.toThrow(
      'Not authorized. Please connect Apple Music first.'
    );
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('API error throws with detail', async () => {
    mockApi.mockResolvedValueOnce({
      errors: [{ detail: 'Forbidden', status: '403' }],
    });

    await expect(createLibraryPlaylist('Fail Playlist')).rejects.toThrow(
      'Failed to create playlist: Forbidden'
    );
  });

  it('missing playlist id in response throws', async () => {
    mockApi.mockResolvedValueOnce({ data: [{}] });

    await expect(createLibraryPlaylist('No ID')).rejects.toThrow('Failed to create playlist');
  });
});

describe('addTracksToLibraryPlaylist', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockMusicKitInstance.isAuthorized = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('success adds tracks without error', async () => {
    mockApi.mockResolvedValueOnce({ data: [] });

    await expect(
      addTracksToLibraryPlaylist('pl-123', ['song-1', 'song-2'])
    ).resolves.toBeUndefined();

    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(mockApi).toHaveBeenCalledWith('/v1/me/library/playlists/pl-123/tracks', {
      method: 'POST',
      data: {
        data: [
          { id: 'song-1', type: 'songs' },
          { id: 'song-2', type: 'songs' },
        ],
      },
    });
  });

  it('not authorized throws', async () => {
    mockMusicKitInstance.isAuthorized = false;

    await expect(addTracksToLibraryPlaylist('pl-123', ['song-1'])).rejects.toThrow(
      'Not authorized. Please connect Apple Music first.'
    );
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('empty songIds does nothing', async () => {
    await expect(addTracksToLibraryPlaylist('pl-123', [])).resolves.toBeUndefined();
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('songIds with only invalid entries throws', async () => {
    await expect(addTracksToLibraryPlaylist('pl-123', ['', '  ', ''])).rejects.toThrow(
      'No valid song IDs to add'
    );
  });

  it('API error throws with detail', async () => {
    mockApi.mockResolvedValueOnce({
      errors: [{ detail: 'Playlist not found', status: '404' }],
    });

    await expect(addTracksToLibraryPlaylist('pl-bad', ['song-1'])).rejects.toThrow(
      'Adding tracks to playlist failed: Playlist not found'
    );
  });

  it('filters out invalid IDs and sends only valid ones', async () => {
    mockApi.mockResolvedValueOnce(undefined);

    await addTracksToLibraryPlaylist('pl-123', ['', 'song-1', '  ', 'song-2']);

    expect(mockApi).toHaveBeenCalledWith('/v1/me/library/playlists/pl-123/tracks', {
      method: 'POST',
      data: {
        data: [
          { id: 'song-1', type: 'songs' },
          { id: 'song-2', type: 'songs' },
        ],
      },
    });
  });
});
