'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildPlaylistName, dedupeTrackIdsOrdered } from '@repo/core';
import { getErrorMessage } from '@repo/shared';
import type { MatchRow } from '@/features/matching/types';
import {
  isMusicKitAuthorized,
  createLibraryPlaylist,
  addTracksToLibraryPlaylist,
} from '@/lib/musickit';
import type { Setlist } from '@repo/core';

interface ResumeState {
  id: string;
  url?: string;
  remainingIds: string[];
}

function resumeKey(setlistId: string): string {
  return `playlist_resume_v1:${setlistId}`;
}

function readResume(setlistId: string): ResumeState | null {
  if (typeof window === 'undefined') return null;
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
  if (typeof window === 'undefined') return;
  try {
    const key = resumeKey(setlistId);
    if (!value) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/access errors — resume is a best-effort feature
  }
}

export interface UseCreatePlaylistStateParams {
  setlist: Setlist;
  matchRows: MatchRow[];
}

export interface UseCreatePlaylistStateResult {
  loading: boolean;
  error: string | null;
  addTracksError: string | null;
  needsAuth: boolean;
  created: { id: string; url?: string } | null;
  resumeState: ResumeState | null;
  dedupeTracks: boolean;
  setDedupeTracks: (v: boolean) => void;
  selectedSongIds: string[];
  songIds: string[];
  handleCreate: () => Promise<void>;
  handleAddRemainingTracks: () => Promise<void>;
  handleAuthorized: () => Promise<void>;
}

export function useCreatePlaylistState({
  setlist,
  matchRows,
}: UseCreatePlaylistStateParams): UseCreatePlaylistStateResult {
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
        setError('No tracks to add. Match at least one track first.');
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
        setAddTracksError(getErrorMessage(addErr, 'Adding tracks failed.'));
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create playlist.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRemainingTracks() {
    const target = resumeState ?? (created ? { ...created, remainingIds: [...songIds] } : null);
    if (!target || target.remainingIds.length === 0) return;

    // Filter out IDs that were already successfully added (tracked via sessionStorage
    // remainingIds) to prevent duplicate tracks on retry. Note: this only covers IDs
    // known to sessionStorage; partial adds within a single batch are not tracked.
    const alreadyAdded = new Set(
      songIds.filter((id) => !target.remainingIds.includes(id))
    );
    const idsToAdd = target.remainingIds.filter((id) => !alreadyAdded.has(id));
    if (idsToAdd.length === 0) return;

    setAddTracksError(null);
    setLoading(true);
    try {
      await addTracksToLibraryPlaylist(target.id, idsToAdd);
      setResumeState(null);
      writeResume(setlist.id, null);
      setAddTracksError(null);
    } catch (err) {
      setAddTracksError(getErrorMessage(err, 'Adding tracks failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthorized() {
    setNeedsAuth(false);
    await handleCreate();
  }

  return {
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
  };
}
