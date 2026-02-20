"use client";

import { useState } from "react";
import type { Setlist } from "@repo/core";
import { getErrorMessage } from "@repo/shared";
import type { MatchRow } from "@/features/matching/MatchingView";
import {
  isMusicKitAuthorized,
  createLibraryPlaylist,
  addTracksToLibraryPlaylist,
} from "@/lib/musickit";
import { ErrorAlert } from "@/components/ErrorAlert";
import { SectionTitle } from "@/components/SectionTitle";
import { ConnectAppleMusic } from "@/features/matching/ConnectAppleMusic";

export interface CreatePlaylistViewProps {
  setlist: Setlist;
  matchRows: MatchRow[];
}

function buildPlaylistName(setlist: Setlist): string {
  const parts = ["Setlist", setlist.artist, setlist.eventDate].filter(
    (p) => p != null && String(p).trim() !== ""
  );
  return parts.length > 0 ? parts.join(" – ") : "Setlist";
}

/**
 * Renders the final stage of the application where matched tracks are committed to the user's Apple Music Library.
 * It handles the MusicKit authorization flow gracefully before making the API calls to progressively save the playlist.
 */
export function CreatePlaylistView({ setlist, matchRows }: CreatePlaylistViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; url?: string } | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Tracks if the playlist container was successfully created but individual sub-tracks failed to append.
  // This allows the user to safely retry adding only the tracks without duplicating the empty playlist container.
  const [addTracksError, setAddTracksError] = useState<string | null>(null);

  const songIds = matchRows.map((r) => r.appleTrack?.id).filter(Boolean) as string[];

  async function handleCreate() {
    setError(null);
    setAddTracksError(null);
    setNeedsAuth(false);
    setLoading(true);
    try {
      const authorized = await isMusicKitAuthorized();
      if (!authorized) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }

      if (songIds.length === 0) {
        setError("No tracks to add. Match at least one track first.");
        setLoading(false);
        return;
      }

      const name = buildPlaylistName(setlist);
      const { id, url } = await createLibraryPlaylist(name);
      try {
        await addTracksToLibraryPlaylist(id, songIds);
        setCreated({ id, url });
      } catch (addErr) {
        setCreated({ id, url });
        setAddTracksError(getErrorMessage(addErr, "Adding tracks failed."));
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create playlist"));
    } finally {
      setLoading(false);
    }
  }

  /**
   * Safe retry mechanism: Sends all song IDs again.
   * Apple Music API add-track endpoints are idempotent per track, preventing duplicate items from stacking.
   */
  async function handleAddRemainingTracks() {
    if (!created || songIds.length === 0) return;
    setAddTracksError(null);
    setLoading(true);
    try {
      await addTracksToLibraryPlaylist(created.id, songIds);
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

  if (created) {
    const rawUrl = created.url?.trim();
    const isSafeUrl =
      rawUrl &&
      (rawUrl.startsWith("http://") || rawUrl.startsWith("https://"));
    return (
      <div
        role="status"
        className="glass-panel"
        style={{
          marginTop: "1.5rem",
          background: "rgba(16, 185, 129, 0.1)",
          borderColor: "var(--success)",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: "var(--success)" }}>Playlist created.</p>
        {addTracksError ? (
          <>
            <p style={{ margin: "0.5rem 0 0", color: "var(--danger)" }}>
              Playlist was created but adding tracks failed: {addTracksError}
            </p>
            <button
              type="button"
              className="premium-button secondary"
              onClick={handleAddRemainingTracks}
              disabled={loading}
              style={{ marginTop: "1rem" }}
            >
              {loading ? "Adding…" : "Add tracks to this playlist"}
            </button>
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
              <p style={{ margin: "0.5rem 0 0", color: "var(--text-muted)" }}>
                Open the Apple Music app and check your library for the new playlist.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  const count = matchRows.filter((m) => m.appleTrack !== null).length;

  return (
    <section aria-label="Create playlist" className="glass-panel" style={{ marginTop: "2rem" }}>
      <SectionTitle>Create playlist</SectionTitle>
      <p style={{ color: "var(--text-main)" }}>
        Ready to create a playlist with <strong style={{ color: "var(--accent-primary)" }}>{count}</strong> track{count !== 1 ? "s" : ""}.
      </p>

      {needsAuth && (
        <div style={{ marginTop: "1.5rem" }}>
          <p style={{ color: "var(--danger)", marginBottom: "0.75rem" }}>
            Connect Apple Music to create the playlist in your library.
          </p>
          <ConnectAppleMusic onAuthorized={handleAuthorized} label="Connect Apple Music" />
        </div>
      )}

      {!needsAuth && (
        <button
          type="button"
          className="premium-button"
          onClick={handleCreate}
          disabled={loading || count === 0}
          style={{ marginTop: "1.5rem" }}
        >
          {loading ? "Creating…" : "Create playlist"}
        </button>
      )}

      {error && (
        <ErrorAlert
          message={error}
          onRetry={() => {
            setError(null);
            handleCreate();
          }}
          retryLabel="Retry create playlist"
        />
      )}
    </section>
  );
}
