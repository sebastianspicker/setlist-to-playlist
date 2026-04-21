'use client';

import { LoadingButton } from '@/components/LoadingButton';

export interface MatchingBulkActionsProps {
  loading: boolean;
  onAutoMatchAll: () => void;
  onSkipUnmatched: () => void;
  onReset: () => void;
}

export function MatchingBulkActions({
  loading,
  onAutoMatchAll,
  onSkipUnmatched,
  onReset,
}: MatchingBulkActionsProps) {
  return (
    <div className="matching-actions">
      <LoadingButton
        type="button"
        onClick={onAutoMatchAll}
        loading={loading}
        loadingChildren="Re-matching…"
        variant="secondary"
      >
        Re-match all
      </LoadingButton>
      <LoadingButton type="button" onClick={onSkipUnmatched} variant="secondary">
        Skip unmatched songs
      </LoadingButton>
      <LoadingButton type="button" onClick={onReset} variant="secondary">
        Start over
      </LoadingButton>
    </div>
  );
}
