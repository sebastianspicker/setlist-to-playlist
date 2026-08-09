import { buildSearchQuery } from '@repo/core';
import type { MatchRow } from './types';

export function findSearchRow(matches: MatchRow[], index: number): MatchRow | undefined {
  return Number.isInteger(index) && index >= 0 && index < matches.length
    ? matches.at(index)
    : undefined;
}

export function queryForSearchRow(row: MatchRow, value: string): string {
  return value.trim() || buildSearchQuery(row.setlistEntry.name, row.setlistEntry.artist);
}
