import { StatusText } from '@/components/StatusText';
import { MatchingRows, type MatchingRowsProps } from './MatchingRows';

export interface MatchingLedgerProps extends MatchingRowsProps {
  loadingSuggestions: boolean;
  suggestionError: unknown;
  matchedCount: number;
  settledCount: number;
  isSettled: boolean;
}

export function MatchingLedger(props: MatchingLedgerProps) {
  const { matches, loadingSuggestions, suggestionError, matchedCount, settledCount, isSettled } =
    props;
  return (
    <div className="matching-ledger">
      <h2 className="sr-only">Matching ledger</h2>
      <p className="muted-block">
        Review each Apple Music suggestion. Change unusual versions, or skip songs you do not want
        in the playlist.
      </p>
      <StatusText className="matching-progress">
        {isSettled ? (
          <>
            <strong>
              {matchedCount} of {matches.length}
            </strong>{' '}
            songs matched
          </>
        ) : (
          <>
            Searching Apple Music:{' '}
            <strong>
              {settledCount} of {matches.length}
            </strong>{' '}
            songs checked
          </>
        )}
      </StatusText>
      {suggestionError && !loadingSuggestions ? (
        <p role="alert" className="warning-banner">
          Some songs could not be matched automatically. Use the <strong>Search</strong> button next
          to unmatched songs to find them manually.
        </p>
      ) : null}
      <MatchingRows {...props} />
    </div>
  );
}
