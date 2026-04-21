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
  status: 'incomplete';
  id: string;
  url?: string;
  remainingIds: string[];
  selectionSignature: string;
  storedAt?: number;
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
    if (
      parsed?.status !== 'incomplete' ||
      !parsed.id ||
      typeof parsed.selectionSignature !== 'string' ||
      !Array.isArray(parsed.remainingIds)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function createSelectionSignature(songIds: string[], dedupeTracks: boolean): string {
  return JSON.stringify({ dedupeTracks, songIds });
}

function getRemainingIds(error: unknown, fallback: string[]): string[] {
  const remainingIds = (error as { remainingIds?: unknown } | null)?.remainingIds;
  if (
    Array.isArray(remainingIds) &&
    remainingIds.every((id) => typeof id === 'string' && id.trim().length > 0)
  ) {
    return remainingIds;
  }
  return fallback;
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

  const selectedSongIds = useMemo(
    () => matchRows.map((r) => r.appleTrack?.id).filter(Boolean) as string[],
    [matchRows]
  );

  const songIds = useMemo(
    () => (dedupeTracks ? dedupeTrackIdsOrdered(selectedSongIds) : selectedSongIds),
    [dedupeTracks, selectedSongIds]
  );

  const selectionSignature = useMemo(
    () => createSelectionSignature(songIds, dedupeTracks),
    [dedupeTracks, songIds]
  );

  useEffect(() => {
    const stored = readResume(setlist.id);
    if (stored) {
      const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
      const storedAt = (stored as ResumeState & { storedAt?: number }).storedAt;
      const isStale = typeof storedAt === 'number' && Date.now() - storedAt > STALE_THRESHOLD_MS;
      const isMismatched = stored.selectionSignature !== selectionSignature;
      if (isStale || isMismatched || stored.remainingIds.length === 0) {
        writeResume(setlist.id, null);
        setResumeState(null);
      } else {
        setResumeState(stored);
      }
    } else {
      setResumeState(null);
    }
  }, [selectionSignature, setlist.id]);

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
        const resume: ResumeState = {
          status: 'incomplete',
          id,
          url,
          remainingIds: getRemainingIds(addErr, songIds),
          selectionSignature,
          storedAt: Date.now(),
        };
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
    if (!resumeState || resumeState.remainingIds.length === 0) return;

    setAddTracksError(null);
    setLoading(true);
    try {
      await addTracksToLibraryPlaylist(resumeState.id, resumeState.remainingIds);
      setCreated({ id: resumeState.id, url: resumeState.url });
      setResumeState(null);
      writeResume(setlist.id, null);
      setAddTracksError(null);
    } catch (err) {
      const nextResume: ResumeState = {
        ...resumeState,
        remainingIds: getRemainingIds(err, resumeState.remainingIds),
        selectionSignature,
        storedAt: Date.now(),
      };
      setResumeState(nextResume);
      writeResume(setlist.id, nextResume);
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
