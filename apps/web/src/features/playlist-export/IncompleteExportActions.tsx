'use client';

import { Button } from '@repo/ui';

interface IncompleteExportActionsProps {
  hasUnknownProgress: boolean;
  safeAppleUrl: string | null;
  loading: boolean;
  onAddRemainingTracks: VoidFunction;
  onStartAnother?: VoidFunction;
}

export function IncompleteExportActions({
  hasUnknownProgress,
  safeAppleUrl,
  loading,
  onAddRemainingTracks,
  onStartAnother,
}: IncompleteExportActionsProps) {
  return (
    <div className="step-actions">
      {!hasUnknownProgress ? (
        <Button
          variant="secondary"
          onClick={onAddRemainingTracks}
          loading={loading}
          loadingChildren="Adding remaining songs…"
        >
          Add remaining songs
        </Button>
      ) : null}
      {safeAppleUrl ? (
        <a
          href={safeAppleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button button--primary"
        >
          Open in Apple Music
        </a>
      ) : null}
      {onStartAnother ? (
        <Button variant="secondary" onClick={onStartAnother}>
          Start another setlist
        </Button>
      ) : null}
    </div>
  );
}
