import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { isValidAppleMusicTrack } from '@/lib/musickit';
import type { MatchRow } from './types';

type SetMatches = Dispatch<SetStateAction<MatchRow[]>>;

export function useMatchRowActions(setMatches: SetMatches) {
  const setMatch = useCallback(
    (index: number, appleTrack: MatchRow['appleTrack']) => {
      setMatches((previous) => {
        const existing = isValidIndex(index, previous) ? previous.at(index) : undefined;
        if (!existing) return previous;
        const validTrack = isValidAppleMusicTrack(appleTrack) ? appleTrack : null;
        return replaceRow(previous, index, {
          ...existing,
          appleTrack: validTrack,
          status: validTrack ? 'matched' : 'skipped',
        });
      });
    },
    [setMatches]
  );

  const skipUnmatched = useCallback(() => {
    setMatches((previous) =>
      previous.map((row) =>
        row.status === 'unmatched' ? { ...row, appleTrack: null, status: 'skipped' } : row
      )
    );
  }, [setMatches]);

  return { setMatch, skipUnmatched };
}

function isValidIndex(index: number, rows: MatchRow[]): boolean {
  return Number.isInteger(index) && index >= 0 && index < rows.length;
}

function replaceRow(rows: MatchRow[], index: number, row: MatchRow): MatchRow[] {
  const next = [...rows];
  next.splice(index, 1, row);
  return next;
}
