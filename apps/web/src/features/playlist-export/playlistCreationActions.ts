import type { Dispatch, SetStateAction } from 'react';
import { buildPlaylistName, type Setlist } from '@repo/core';
import { getErrorMessage } from '@repo/shared';
import {
  addTracksToLibraryPlaylist,
  createLibraryPlaylist,
  isMusicKitAuthorized,
} from '@/lib/musickit';
import { getAddProgress, writeResume } from './playlistResume';
import type { ResumeState } from './playlistResume';

interface PlaylistCreationActionsParams {
  setlist: Setlist;
  songIds: string[];
  selectionSignature: string;
  resumeState: ResumeState | null;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setAddTracksError: Dispatch<SetStateAction<string | null>>;
  setNeedsAuth: Dispatch<SetStateAction<boolean>>;
  setCreated: Dispatch<SetStateAction<{ id: string; url?: string } | null>>;
  setResumeState: Dispatch<SetStateAction<ResumeState | null>>;
}

export function createPlaylistActions(params: PlaylistCreationActionsParams) {
  const {
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
  } = params;

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
      const { id, url } = await createLibraryPlaylist(buildPlaylistName(setlist));
      setCreated({ id, url });
      await addTracksOrStoreResume(id, url, songIds, selectionSignature, setlist.id, {
        setResumeState,
        setAddTracksError,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create playlist.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRemainingTracks() {
    if (!resumeState) return;
    if (resumeState.progress === 'unknown') {
      setAddTracksError(
        'Cannot safely resume because Apple Music did not report which tracks remain.'
      );
      return;
    }
    if (resumeState.remainingIds.length === 0) return;
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
        ...getAddProgress(err, resumeState.remainingIds),
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

  return { handleCreate, handleAddRemainingTracks };
}

interface AddTracksOrStoreResumeSetters {
  setResumeState: Dispatch<SetStateAction<ResumeState | null>>;
  setAddTracksError: Dispatch<SetStateAction<string | null>>;
}

async function addTracksOrStoreResume(
  id: string,
  url: string | undefined,
  songIds: string[],
  selectionSignature: string,
  setlistId: string,
  { setResumeState, setAddTracksError }: AddTracksOrStoreResumeSetters
) {
  try {
    await addTracksToLibraryPlaylist(id, songIds);
    setResumeState(null);
    writeResume(setlistId, null);
  } catch (addErr) {
    const resume: ResumeState = {
      status: 'incomplete',
      id,
      url,
      ...getAddProgress(addErr, songIds),
      selectionSignature,
      storedAt: Date.now(),
    };
    setResumeState(resume);
    writeResume(setlistId, resume);
    setAddTracksError(getErrorMessage(addErr, 'Adding tracks failed.'));
  }
}
