'use client';

import { getSafeAppleUrl } from './appleUrl';
import { IncompleteExportActions } from './IncompleteExportActions';

export { SuccessExportState } from './SuccessExportState';

export interface IncompleteResumeState {
  progress: 'exact' | 'unknown';
  url?: string;
  remainingIds: string[];
}

export interface IncompleteExportStateProps {
  incompleteState: IncompleteResumeState;
  songIds: string[];
  addTracksError: string | null;
  loading: boolean;
  onAddRemainingTracks: VoidFunction;
  onStartAnother?: VoidFunction;
}

export function IncompleteExportState({
  incompleteState,
  songIds,
  addTracksError,
  loading,
  onAddRemainingTracks,
  onStartAnother,
}: IncompleteExportStateProps) {
  const hasUnknownProgress = incompleteState.progress === 'unknown';
  const remainingCount = incompleteState.remainingIds.length;
  const addedCount = hasUnknownProgress ? null : Math.max(songIds.length - remainingCount, 0);
  const safeAppleUrl = getSafeAppleUrl(incompleteState.url);

  return (
    <section
      className="terminal-state terminal-state--warning export-terminal"
      aria-labelledby="partial-title"
    >
      <h3 id="partial-title">Playlist created; import incomplete</h3>
      {hasUnknownProgress ? (
        <p>
          Apple Music did not report which songs were added. Automatic resume is unavailable because
          retrying could create duplicates.
        </p>
      ) : (
        <p>
          {addedCount} of {songIds.length} songs were added. {remainingCount} remain.
        </p>
      )}
      {addTracksError ? (
        <p role="alert" className="error-text">
          Finishing the import failed: {addTracksError}
        </p>
      ) : null}
      <IncompleteExportActions
        hasUnknownProgress={hasUnknownProgress}
        safeAppleUrl={safeAppleUrl}
        loading={loading}
        onAddRemainingTracks={onAddRemainingTracks}
        onStartAnother={onStartAnother}
      />
    </section>
  );
}
