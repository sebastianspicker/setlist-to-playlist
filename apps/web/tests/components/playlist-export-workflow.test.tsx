// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Setlist } from '@repo/core';
import type { MatchRow } from '../../src/features/matching/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useState = vi.fn();
vi.mock('../../src/features/playlist-export/usePlaylistExportState', () => ({
  usePlaylistExportState: () => useState(),
}));
vi.mock('../../src/features/matching/AppleMusicAuthorization', () => ({
  AppleMusicAuthorization: ({
    onAuthorized,
    label = 'Connect Apple Music',
  }: {
    onAuthorized?: () => void;
    label?: string;
  }) => <button onClick={onAuthorized}>{label}</button>,
}));
import { PlaylistExportWorkflow as CreatePlaylistView } from '../../src/features/playlist-export/PlaylistExportWorkflow';

const setlist: Setlist = {
  id: 'setlist-1',
  artist: 'Artist',
  venue: 'Venue',
  eventDate: '2024-01-01',
  sets: [[]],
};
const matchRows: MatchRow[] = [
  {
    setlistEntry: { name: 'Song', artist: 'Artist' },
    appleTrack: { id: 'song-1', name: 'Song', artistName: 'Artist' },
    status: 'matched',
  },
];
const base = {
  loading: false,
  error: null,
  createOutcomeUnknown: false,
  addTracksError: null,
  needsAuth: false,
  created: null,
  resumeState: null,
  dedupeTracks: false,
  setDedupeTracks: vi.fn(),
  selectedSongIds: ['song-1'],
  songIds: ['song-1'],
  handleCreate: vi.fn(),
  handleAddRemainingTracks: vi.fn(),
  handleAuthorized: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  useState.mockReturnValue(base);
});
afterEach(cleanup);

describe('CreatePlaylistView', () => {
  it('wires the normal create action and selected track review', () => {
    render(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);
    expect(screen.getByRole('list', { name: 'Selected songs' })).toHaveTextContent('Song');
    expect(screen.getByText('Checked when you create')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create playlist' }));
    expect(base.handleCreate).toHaveBeenCalledOnce();
  });

  it('requires explicit acknowledgement before retrying an uncertain create outcome', () => {
    useState.mockReturnValue({
      ...base,
      createOutcomeUnknown: true,
      error: 'Apple Music did not confirm whether the playlist was created.',
    });
    render(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);

    expect(screen.queryByRole('button', { name: 'Create playlist' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry create playlist' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'I checked my library — create again' }));
    expect(base.handleCreate).toHaveBeenCalledOnce();
  });

  it('keeps the generic create retry action for confirmed failures', () => {
    useState.mockReturnValue({ ...base, error: 'Failed to create playlist.' });
    render(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry create playlist' }));
    expect(base.handleCreate).toHaveBeenCalledOnce();
  });

  it('renders the exact-resume and unknown-progress terminal states safely', () => {
    useState.mockReturnValue({
      ...base,
      resumeState: {
        status: 'incomplete',
        progress: 'exact',
        id: 'playlist-1',
        remainingIds: ['song-1'],
        selectionSignature: 'sig',
        storedAt: Date.now(),
      },
    });
    const { rerender } = render(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);
    expect(screen.getByRole('button', { name: 'Add remaining songs' })).toBeInTheDocument();
    useState.mockReturnValue({
      ...base,
      resumeState: {
        status: 'incomplete',
        progress: 'unknown',
        id: 'playlist-1',
        remainingIds: [],
        attemptedIds: ['song-1'],
        selectionSignature: 'sig',
        storedAt: Date.now(),
      },
    });
    rerender(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);
    expect(screen.queryByRole('button', { name: 'Add remaining songs' })).not.toBeInTheDocument();
  });

  it('uses authorization and success branches from the state boundary', () => {
    useState.mockReturnValue({ ...base, needsAuth: true });
    const { rerender } = render(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Connect Apple Music and create playlist' })
    );
    expect(base.handleAuthorized).toHaveBeenCalledOnce();
    useState.mockReturnValue({
      ...base,
      created: { id: 'playlist-1', url: 'https://music.apple.com/playlist/playlist-1' },
    });
    rerender(<CreatePlaylistView setlist={setlist} matchRows={matchRows} />);
    expect(screen.getByRole('link', { name: 'Open in Apple Music' })).toHaveAttribute(
      'href',
      'https://music.apple.com/playlist/playlist-1'
    );
  });
});
