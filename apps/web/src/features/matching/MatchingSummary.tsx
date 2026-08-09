import { Button } from '@repo/ui';
import { MatchingBulkActions } from './MatchingBulkActions';
import type { MatchRow } from './types';

export interface MatchingSummaryProps {
  matches: MatchRow[];
  loadingSuggestions: boolean;
  matchedCount: number;
  isSettled: boolean;
  canProceed: boolean;
  onAutoMatchAll: () => Promise<void>;
  onSkipUnmatched: () => void;
  onProceed: () => void;
}

export function MatchingSummary(props: MatchingSummaryProps) {
  const { matches, loadingSuggestions, matchedCount, isSettled, canProceed } = props;
  return (
    <aside className="matching-summary-panel" aria-label="Matching summary">
      <p className="summary-eyebrow">Songs ready</p>
      <p className="summary-metric" aria-label={`${matchedCount} of ${matches.length} selected`}>
        <strong>{matchedCount}</strong>
        <span>/{matches.length}</span>
      </p>
      <p className="summary-caption">matched and selected</p>
      <MatchingBulkActions
        loading={loadingSuggestions}
        onAutoMatchAll={() => {
          void props.onAutoMatchAll();
        }}
        onSkipUnmatched={props.onSkipUnmatched}
      />
      <p className="matching-summary-note">
        {isSettled
          ? 'Every row is settled. Review the selected songs before creating the playlist.'
          : 'Apple Music matching is still in progress. You can review results as they arrive.'}
      </p>
      <div className="matching-proceed">
        <Button
          onClick={props.onProceed}
          disabled={!canProceed}
          title="Review the selected songs before creating the Apple Music playlist"
          className="proceed-button"
        >
          Review playlist
        </Button>
        {!canProceed && isSettled ? (
          <p className="support-text matching-help">Match at least one song to continue.</p>
        ) : null}
      </div>
    </aside>
  );
}
