'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { dedupeTrackIdsOrdered } from '@repo/core';
import type { MatchRow } from '@/features/matching/types';
import type { Setlist } from '@repo/core';
import {
  type ResumeState,
  createSelectionSignature,
  readResume,
  shouldDiscardResume,
  writeResume,
} from './playlistResume';
import { createPlaylistActions } from './playlistCreationActions';

export interface UsePlaylistExportStateParams {
  setlist: Setlist;
  matchRows: MatchRow[];
}

export interface UsePlaylistExportStateResult {
  loading: boolean;
  error: string | null;
  addTracksError: string | null;
  needsAuth: boolean;
  created: { id: string; url?: string } | null;
  resumeState: ResumeState | null;
  dedupeTracks: boolean;
  setDedupeTracks: (value: boolean) => void;
  selectedSongIds: string[];
  songIds: string[];
  handleCreate: () => Promise<void>;
  handleAddRemainingTracks: () => Promise<void>;
  handleAuthorized: () => Promise<void>;
}

/** Owns the local state and exclusive mutations for a single playlist export. */
export function usePlaylistExportState({
  setlist,
  matchRows,
}: UsePlaylistExportStateParams): UsePlaylistExportStateResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; url?: string } | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [addTracksError, setAddTracksError] = useState<string | null>(null);
  const [dedupeTracks, setDedupeTracks] = useState(false);
  const [resumeState, setResumeState] = useState<ResumeState | null>(null);
  const mutationInFlightRef = useRef(false);
  const selectedSongIds = useMemo(
    () => matchRows.flatMap((row) => (row.appleTrack ? [row.appleTrack.id] : [])),
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
    if (!stored || shouldDiscardResume(stored, selectionSignature, songIds)) {
      if (stored) writeResume(setlist.id, null);
      setResumeState(null);
      return;
    }
    setResumeState(stored);
  }, [selectionSignature, setlist.id, songIds]);

  const actions = createPlaylistActions({
    setlist,
    songIds,
    selectionSignature,
    resumeState,
    setLoading,
    setError,
    setAddTracksError,
    setNeedsAuth,
    setCreated,
    setResumeState,
  });
  const runExclusive = async (action: () => Promise<void>) => {
    if (mutationInFlightRef.current) return;
    mutationInFlightRef.current = true;
    try {
      await action();
    } finally {
      mutationInFlightRef.current = false;
    }
  };

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
    handleCreate: () => runExclusive(actions.handleCreate),
    handleAddRemainingTracks: () => runExclusive(actions.handleAddRemainingTracks),
    handleAuthorized: async () => {
      setNeedsAuth(false);
      await runExclusive(actions.handleCreate);
    },
  };
}
