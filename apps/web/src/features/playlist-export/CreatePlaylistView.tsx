"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPlaylistName, dedupeTrackIdsOrdered } from "@repo/core";
import { getErrorMessage } from "@repo/shared";
import type { MatchRow } from "@/features/matching/types";
import {
  isMusicKitAuthorized,
  createLibraryPlaylist,
  addTracksToLibraryPlaylist,
} from "@/lib/musickit";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingButton } from "@/components/LoadingButton";
import { SectionTitle } from "@/components/SectionTitle";
import { ConnectAppleMusic } from "@/features/matching/ConnectAppleMusic";
import type { Setlist } from "@repo/core";

export interface CreatePlaylistViewProps {
  setlist: Setlist;
  matchRows: MatchRow[];
}

interface ResumeState {
  id: string;
  url?: string;
  remainingIds: string[];
}

function resumeKey(setlistId: string): string {
  return `playlist_resume_v1:${setlistId}`;
}

function readResume(setlistId: string): ResumeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(resumeKey(setlistId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeState;
    if (!parsed?.id || !Array.isArray(parsed?.remainingIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeResume(setlistId: string, value: ResumeState | null): void {
  if (typeof window === "undefined") return;
  const key = resumeKey(setlistId);
  if (!value) {
    window.sessionStorage.removeItem(key);
    return;
  }
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

export function CreatePlaylistView({ setlist, matchRows }: CreatePlaylistViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; url?: string } | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [addTracksError, setAddTracksError] = useState<string | null>(null);
  const [dedupeTracks, setDedupeTracks] = useState(false);
  const [resumeState, setResumeState] = useState<ResumeState | null>(null);

  useEffect(() => {
    setResumeState(readResume(setlist.id));
  }, [setlist.id]);

  const selectedSongIds = useMemo(
    () => matchRows.map((r) => r.appleTrack?.id).filter(Boolean) as string[],
    [matchRows]
  );

  const songIds = useMemo(
    () => (dedupeTracks ? dedupeTrackIdsOrdered(selectedSongIds) : selectedSongIds),
    [dedupeTracks, selectedSongIds]
  );

  async function handleCreate() {
    setError(null);
    setAddTracksError(null);
    setNeedsAuth(false);
    setLoading(true);
    try {
      const authorized = await isMusicKitAuthorized();
      if (!authorized) {
        setNeedsAuth(true);
        return;
      }

      if (songIds.length === 0) {
        setError("No tracks to add. Match at least one track first.");
        return;
      }

      const name = buildPlaylistName(setlist);
      const { id, url } = await createLibraryPlaylist(name);
      setCreated({ id, url });

      try {
        await addTracksToLibraryPlaylist(id, songIds);
        setResumeState(null);
        writeResume(setlist.id, null);
      } catch (addErr) {
        const resume: ResumeState = { id, url, remainingIds: [...songIds] };
        setResumeState(resume);
        writeResume(setlist.id, resume);
        setAddTracksError(getErrorMessage(addErr, "Adding tracks failed."));
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create playlist"));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRemainingTracks() {
    const target = resumeState ?? (created ? { ...created, remainingIds: [...songIds] } : null);
    if (!target || target.remainingIds.length === 0) return;
    setAddTracksError(null);
    setLoading(true);
    try {
      await addTracksToLibraryPlaylist(target.id, target.remainingIds);
      setResumeState(null);
      writeResume(setlist.id, null);
      setAddTracksError(null);
    } catch (err) {
      setAddTracksError(getErrorMessage(err, "Adding tracks failed."));
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthorized() {
    setNeedsAuth(false);
    await handleCreate();
  }

  if (created || resumeState) {
    const current = resumeState ?? created;
    const rawUrl = current?.url?.trim();
    const isSafeUrl = rawUrl && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://"));
    return (
      <div role="status" className="glass-panel success-panel">
        <p className="success-title">Playlist created.</p>
        {addTracksError ? (
          <>
            <p className="error-text" style={{ marginTop: "0.5rem" }}>
              Playlist was created but adding tracks failed: {addTracksError}
            </p>
            <LoadingButton
              variant="secondary"
              onClick={handleAddRemainingTracks}
              loading={loading}
              loadingChildren="Adding…"
              style={{ marginTop: "1rem" }}
            >
              Resume adding remaining tracks
            </LoadingButton>
          </>
        ) : (
          <>
            {isSafeUrl ? (
              <p style={{ margin: "0.5rem 0 0" }}>
                <a
                  href={rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-primary)", textDecoration: "underline" }}
                >
                  Open in Apple Music →
                </a>
              </p>
            ) : (
              <p className="muted-block" style={{ marginTop: "0.5rem" }}>
                Open the Apple Music app and check your library for the new playlist.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  const count = matchRows.filter((m) => m.appleTrack !== null).length;
  const dedupeSavings = selectedSongIds.length - songIds.length;

  return (
    <section aria-label="Create playlist" className="glass-panel" style={{ marginTop: "2rem" }}>
      <SectionTitle>Create playlist</SectionTitle>
      <p>
        Ready to create a playlist with{" "}
        <strong className="accent-inline">{count}</strong> track{count !== 1 ? "s" : ""}.
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
        <p className="muted-caption">Deduplication will remove {dedupeSavings} duplicate track(s).</p>
      )}

      {needsAuth && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="error-text" style={{ marginBottom: "0.75rem" }}>
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
          style={{ marginTop: "1.5rem" }}
          title="Create a new playlist in your Apple Music library with the matched tracks"
        >
          Create playlist
        </LoadingButton>
      )}

      {error && (
        <ErrorAlert
          message={error}
          onRetry={() => {
            setError(null);
            void handleCreate();
          }}
          retryLabel="Retry create playlist"
        />
      )}
    </section>
  );
}
