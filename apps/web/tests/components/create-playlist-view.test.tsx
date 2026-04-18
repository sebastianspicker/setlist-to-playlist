// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { Setlist } from '@repo/core';
import type { MatchRow } from '../../src/features/matching/types';

vi.mock('../../src/components/ErrorAlert', () => ({
  ErrorAlert: ({ message }: { message: string }) =>
    React.createElement('div', { role: 'alert' }, message),
}));
vi.mock('../../src/components/LoadingButton', () => ({
  LoadingButton: ({
    children,
    loading: _loading,
    loadingChildren: _loadingChildren,
    variant: _variant,
    ...buttonProps
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    loadingChildren?: string;
    variant?: 'primary' | 'secondary';
  }) => React.createElement('button', buttonProps, children),
}));
vi.mock('../../src/components/SectionTitle', () => ({
  SectionTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children),
}));
vi.mock('../../src/features/matching/ConnectAppleMusic', () => ({
  ConnectAppleMusic: () => null,
}));

const mockUseCreatePlaylistState = vi.fn();
vi.mock('../../src/features/playlist-export/useCreatePlaylistState', () => ({
  useCreatePlaylistState: (...args: unknown[]) => mockUseCreatePlaylistState(...args),
}));

import { CreatePlaylistView } from '../../src/features/playlist-export/CreatePlaylistView';

const setlist: Setlist = {
  id: 'setlist-1',
  artist: 'Test Artist',
  venue: 'Test Venue',
  sets: [[{ name: 'Song A', artist: 'Test Artist' }]],
};

const matchRows: MatchRow[] = [
  {
    setlistEntry: { name: 'Song A', artist: 'Test Artist' },
    appleTrack: { id: 'song-1', name: 'Song A', artistName: 'Test Artist' },
    status: 'matched',
  },
];

describe('CreatePlaylistView', () => {
  it('renders the incomplete resume branch when tracks are still pending', () => {
    mockUseCreatePlaylistState.mockReturnValue({
      loading: false,
      error: null,
      addTracksError: null,
      needsAuth: false,
      created: null,
      resumeState: {
        status: 'incomplete',
        id: 'playlist-1',
        url: 'https://music.apple.com/playlist/playlist-1',
        remainingIds: ['song-2'],
        selectionSignature: '{"dedupeTracks":false,"songIds":["song-1","song-2"]}',
        storedAt: Date.now(),
      },
      dedupeTracks: false,
      setDedupeTracks: vi.fn(),
      selectedSongIds: ['song-1', 'song-2'],
      songIds: ['song-1', 'song-2'],
      handleCreate: vi.fn(),
      handleAddRemainingTracks: vi.fn(),
      handleAuthorized: vi.fn(),
    });

    render(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);

    expect(
      screen.getByText('Playlist created, but track import is incomplete.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add remaining songs' })).toBeInTheDocument();
  });
});
