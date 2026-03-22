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

  if (created || resumeState) {
    const current = resumeState ?? created;
    const rawUrl = current?.url?.trim();
    const isSafeUrl = rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'));
    return (
      <div role="status" className="glass-panel success-panel">
        <p className="success-title">Playlist created.</p>
        {addTracksError ? (
          <>
            <p role="alert" className="error-text" style={{ marginTop: '0.5rem' }}>
              Playlist was created but adding tracks failed: {addTracksError}
            </p>
            <LoadingButton
              variant="secondary"
              onClick={handleAddRemainingTracks}
              loading={loading}
              loadingChildren="Adding…"
              style={{ marginTop: '1rem' }}
            >
              Resume adding remaining tracks
            </LoadingButton>
          </>
        ) : (
          <>
            {isSafeUrl ? (
              <p style={{ margin: '0.5rem 0 0' }}>
                <a
                  href={rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                >
                  Open in Apple Music →
                </a>
              </p>
            ) : (
              <p className="muted-block" style={{ marginTop: '0.5rem' }}>
                Open the Apple Music app and check your library for the new playlist.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <section aria-label="Create playlist" className="glass-panel" style={{ marginTop: '2rem' }}>
      <SectionTitle>Create playlist</SectionTitle>
      <p>
        Ready to create a playlist with <strong className="accent-inline">{count}</strong> track
        {count !== 1 ? 's' : ''}.
      </p>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={dedupeTracks}
          onChange={(e) => setDedupeTracks(e.target.checked)}
        />
        Remove duplicate tracks before export
      </label>
      {dedupeTracks && dedupeSavings > 0 && (
        <p className="muted-caption">
          Deduplication will remove {dedupeSavings} duplicate track(s).
        </p>
      )}

      {needsAuth && (
        <div style={{ marginTop: '1.5rem' }}>
          <p className="error-text" style={{ marginBottom: '0.75rem' }}>
            Connect Apple Music to create the playlist in your library.
          </p>
          <ConnectAppleMusic onAuthorized={handleAuthorized} label="Connect Apple Music" />
        </div>
      )}

      {!needsAuth && (
        <LoadingButton
          onClick={handleCreate}
          disabled={count === 0}
          loading={loading}
          loadingChildren="Creating…"
          style={{ marginTop: '1.5rem' }}
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
