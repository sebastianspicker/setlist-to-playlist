'use client';

import { buildPlaylistName, type Setlist } from '@repo/core';
import type { MatchRow } from '@/features/matching/types';
import { ExportActionPanel } from './ExportActionPanel';
import { ExportReviewPanel } from './ExportReviewPanel';
import { IncompleteExportState, SuccessExportState } from './ExportTerminalStates';
import { usePlaylistExportState } from './usePlaylistExportState';

export interface PlaylistExportWorkflowProps {
  setlist: Setlist;
  matchRows: MatchRow[];
  onBack?: () => void;
  onStartAnother?: () => void;
}

/** Presents the review, authorization, and terminal states of playlist export. */
export function PlaylistExportWorkflow({
  setlist,
  matchRows,
  onBack,
  onStartAnother,
}: PlaylistExportWorkflowProps) {
  const state = usePlaylistExportState({ setlist, matchRows });
  const selectedMatches = matchRows.filter((match) => match.appleTrack);
  const incompleteState =
    state.resumeState &&
    (state.resumeState.progress === 'unknown' || state.resumeState.remainingIds.length > 0)
      ? state.resumeState
      : null;

  if (incompleteState) {
    return (
      <IncompleteExportState
        incompleteState={incompleteState}
        songIds={state.songIds}
        addTracksError={state.addTracksError}
        loading={state.loading}
        onAddRemainingTracks={() => void state.handleAddRemainingTracks()}
        onStartAnother={onStartAnother}
      />
    );
  }

  if (state.created) {
    return (
      <SuccessExportState
        setlist={setlist}
        created={state.created}
        songIds={state.songIds}
        onStartAnother={onStartAnother}
      />
    );
  }

  return (
    <div className="export-layout">
      <ExportReviewPanel
        playlistName={buildPlaylistName(setlist)}
        setlist={setlist}
        selectedMatches={selectedMatches}
        loading={state.loading}
        onBack={onBack}
      />
      <ExportActionPanel
        needsAuth={state.needsAuth}
        dedupeTracks={state.dedupeTracks}
        setDedupeTracks={state.setDedupeTracks}
        dedupeSavings={state.selectedSongIds.length - state.songIds.length}
        count={selectedMatches.length}
        loading={state.loading}
        error={state.error}
        createOutcomeUnknown={state.createOutcomeUnknown}
        onCreate={() => void state.handleCreate()}
        onAuthorized={() => void state.handleAuthorized()}
      />
    </div>
  );
}
