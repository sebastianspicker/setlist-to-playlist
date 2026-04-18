'use client';

import { useMemo } from 'react';
import type { MatchRow } from '@/features/matching/types';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingButton } from '@/components/LoadingButton';
import { SectionTitle } from '@/components/SectionTitle';
import { ConnectAppleMusic } from '@/features/matching/ConnectAppleMusic';
import type { Setlist } from '@repo/core';
import { useCreatePlaylistState } from './useCreatePlaylistState';

export interface CreatePlaylistViewProps {
  setlist: Setlist;
  matchRows: MatchRow[];
}

export function CreatePlaylistView({ setlist, matchRows }: CreatePlaylistViewProps) {
  const {
    loading,
    error,
    addTracksError,
    needsAuth,
    created,
    resumeState,
    dedupeTracks,
    setDedupeTracks,
    selectedSongIds,
    songIds,
    handleCreate,
    handleAddRemainingTracks,
    handleAuthorized,
  } = useCreatePlaylistState({ setlist, matchRows });

  const count = useMemo(() => matchRows.filter((m) => m.appleTrack !== null).length, [matchRows]);
  const dedupeSavings = useMemo(
    () => selectedSongIds.length - songIds.length,
    [selectedSongIds, songIds]
  );
  const incompleteState = resumeState && resumeState.remainingIds.length > 0 ? resumeState : null;

  if (incompleteState) {
    const rawUrl = incompleteState.url?.trim();
    const addedCount = Math.max(songIds.length - incompleteState.remainingIds.length, 0);
    const remainingCount = incompleteState.remainingIds.length;
    const isSafeUrl = rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'));
    return (
      <div role="status" className="glass-panel success-panel">
        <p className="success-title">Playlist created, but track import is incomplete.</p>
        <p className="success-subtitle">
          {addedCount} of {songIds.length} song{songIds.length !== 1 ? 's' : ''} were added to your
          Apple Music library. {remainingCount} still need{remainingCount === 1 ? 's' : ''} to be
          added.
        </p>
        {addTracksError ? (
          <p role="alert" className="error-text" style={{ marginTop: '0.5rem' }}>
            The playlist exists, but finishing the import failed: {addTracksError}
          </p>
        ) : (
          <p className="muted-block" style={{ marginTop: '0.5rem' }}>
            Resume the import to finish adding the remaining songs.
          </p>
        )}
        <LoadingButton
          variant="secondary"
          onClick={handleAddRemainingTracks}
          loading={loading}
          loadingChildren="Adding remaining songs…"
          style={{ marginTop: '1rem' }}
        >
          Add remaining songs
        </LoadingButton>
        {isSafeUrl ? (
          <a
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="premium-button open-playlist-link"
            style={{ display: 'inline-flex', marginTop: '1rem', textDecoration: 'none' }}
          >
            Open in Apple Music
          </a>
        ) : (
          <p className="muted-block" style={{ marginTop: '0.75rem' }}>
            Open the Apple Music app to find your playlist while the remaining songs finish
            importing.
          </p>
        )}
      </div>
    );
  }

  if (created) {
    const rawUrl = created.url?.trim();
    const isSafeUrl = rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'));
    return (
      <div role="status" className="glass-panel success-panel">
        <p className="success-title">Your playlist is ready!</p>
        <p className="success-subtitle">
          {setlist.artist}
          {setlist.venue ? ` at ${setlist.venue}` : ''} — {count} song{count !== 1 ? 's' : ''} added
          to your Apple Music library.
        </p>
        {addTracksError ? (
          <>
            <p role="alert" className="error-text" style={{ marginTop: '0.5rem' }}>
              The playlist was created, but some tracks could not be added: {addTracksError}
            </p>
            <LoadingButton
              variant="secondary"
              onClick={handleAddRemainingTracks}
              loading={loading}
              loadingChildren="Adding remaining songs…"
              style={{ marginTop: '1rem' }}
            >
              Retry adding remaining songs
            </LoadingButton>
          </>
        ) : (
          <>
            {isSafeUrl ? (
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="premium-button open-playlist-link"
                style={{ display: 'inline-flex', marginTop: '1rem', textDecoration: 'none' }}
              >
                Open in Apple Music
              </a>
            ) : (
              <p className="muted-block" style={{ marginTop: '0.75rem' }}>
                Open the Apple Music app to find your new playlist.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <section aria-label="Create playlist" className="glass-panel" style={{ marginTop: '2rem' }}>
      <SectionTitle>Save to Apple Music</SectionTitle>
      <p className="export-ready-text">
        Ready to create a playlist with <strong className="accent-inline">{count}</strong> song
        {count !== 1 ? 's' : ''} from <strong>{setlist.artist}</strong>
        {setlist.venue ? ` at ${setlist.venue}` : ''}.
      </p>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={dedupeTracks}
          onChange={(e) => setDedupeTracks(e.target.checked)}
        />
        Remove duplicate songs
      </label>
      {dedupeTracks && dedupeSavings > 0 && (
        <p className="muted-caption">
          {dedupeSavings} duplicate song{dedupeSavings !== 1 ? 's' : ''} will be removed.
        </p>
      )}

      {needsAuth && (
        <div className="auth-prompt" style={{ marginTop: '1.5rem' }}>
          <p className="auth-prompt-text">
            Sign in with Apple Music to save this playlist to your library.
          </p>
          <ConnectAppleMusic onAuthorized={handleAuthorized} label="Connect Apple Music" />
        </div>
      )}

      {!needsAuth && (
        <LoadingButton
          onClick={handleCreate}
          disabled={count === 0}
          loading={loading}
          loadingChildren="Creating playlist…"
          style={{ marginTop: '1.5rem', fontSize: '1.05rem', padding: '0.85rem 2rem' }}
          title="Create a new playlist in your Apple Music library with the matched tracks"
        >
          Create playlist
        </LoadingButton>
      )}

      {error && (
        <ErrorAlert
          message={error}
          onRetry={() => {
            void handleCreate();
          }}
          retryLabel="Retry create playlist"
        />
      )}
    </section>
  );
}
