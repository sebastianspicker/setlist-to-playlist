"use client";

import { useState } from "react";
import type { Setlist } from "@repo/core";
import type { MatchRow } from "@/features/matching";
import {
  isMusicKitAuthorized,
  authorizeMusicKit,
  initMusicKit,
  createLibraryPlaylist,
  addTracksToLibraryPlaylist,
} from "@/lib/musickit";
import { ConnectAppleMusic } from "@/features/matching";

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

export function CreatePlaylistView({ setlist, matchRows }: CreatePlaylistViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; url?: string } | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  /** DCI-003: When playlist was created but add-tracks failed; retry only adds tracks. */
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
        setAddTracksError(addErr instanceof Error ? addErr.message : String(addErr ?? "Adding tracks failed."));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? "Failed to create playlist");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  /** DCI-057: Retry sends all song IDs again; Apple Music API add is idempotent per track, so duplicates are not created. */
  async function handleAddRemainingTracks() {
    if (!created || songIds.length === 0) return;
    setAddTracksError(null);
    setLoading(true);
    try {
      await addTracksToLibraryPlaylist(created.id, songIds);
      setAddTracksError(null);
    } catch (err) {
      setAddTracksError(err instanceof Error ? err.message : String(err ?? "Adding tracks failed."));
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
        style={{
          marginTop: "1rem",
          padding: "1rem",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "4px",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>Playlist created.</p>
        {addTracksError ? (
          <>
            <p style={{ margin: "0.5rem 0 0", color: "#b45309" }}>
              Playlist was created but adding tracks failed: {addTracksError}
            </p>
            <button
              type="button"
              onClick={handleAddRemainingTracks}
              disabled={loading}
              style={{
                marginTop: "0.5rem",
                padding: "0.35rem 0.75rem",
                fontSize: "0.9rem",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Adding…" : "Add tracks to this playlist"}
            </button>
          </>
        ) : (
          <>
            {isSafeUrl ? (
              <p style={{ margin: "0.5rem 0 0", color: "#166534" }}>
                <a
                  href={rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "inherit", textDecoration: "underline" }}
                >
                  Open in Apple Music →
                </a>
              </p>
            ) : (
              <p style={{ margin: "0.5rem 0 0", color: "#166534" }}>
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
    <section aria-label="Create playlist">
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Create playlist</h2>
      <p>
        Ready to create a playlist with <strong>{count}</strong> track{count !== 1 ? "s" : ""}.
      </p>

      {needsAuth && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ color: "#b45309", marginBottom: "0.5rem" }}>
            Connect Apple Music to create the playlist in your library.
          </p>
          <ConnectAppleMusic onAuthorized={handleAuthorized} label="Connect Apple Music" />
        </div>
      )}

      {!needsAuth && (
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading || count === 0}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: count === 0 || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating…" : "Create playlist"}
        </button>
      )}

      {error && (
        <div
          role="alert"
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "4px",
            color: "#b91c1c",
          }}
        >
          <p style={{ margin: 0 }}>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              handleCreate();
            }}
            style={{ marginTop: "0.5rem", padding: "0.25rem 0.75rem", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
