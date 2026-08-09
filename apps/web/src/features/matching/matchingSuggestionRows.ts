import { flattenSetlistToEntries } from '@repo/core';
import type { Setlist } from '@repo/core';
import type { MatchRow } from './types';

export function toInitialMatches(setlist: Setlist): MatchRow[] {
  return toPendingRows(flattenSetlistToEntries(setlist));
}

export function toPendingRows(entries: MatchRow['setlistEntry'][]): MatchRow[] {
  return entries.map((setlistEntry) => ({
    setlistEntry,
    appleTrack: null,
    status: 'pending',
  }));
}
