import { buildSearchQuery } from '@repo/core';
import { isValidAppleMusicTrack, searchCatalog } from '@/lib/musickit';
import type { MatchRow } from './types';

type CatalogMatch = MatchRow['appleTrack'];
type SearchPromises = Map<string, Promise<CatalogMatch>>;

function findBestCatalogMatch(query: string): Promise<CatalogMatch> {
  return searchCatalog(query, 1).then((tracks) => tracks.find(isValidAppleMusicTrack) ?? null);
}

export function getBatchSearches(
  entries: MatchRow['setlistEntry'][],
  batchStart: number,
  batchSize: number,
  searchPromises: SearchPromises
): Promise<CatalogMatch>[] {
  const batchEnd = Math.min(batchStart + batchSize, entries.length);
  return Array.from({ length: batchEnd - batchStart }, (_, offset) => {
    const entry = entries.at(batchStart + offset);
    if (!entry) return Promise.resolve(null);
    const query = buildSearchQuery(entry.name, entry.artist);
    if (!query) return Promise.resolve(null);
    const existingPromise = searchPromises.get(query);
    if (existingPromise) return existingPromise;
    const searchPromise = findBestCatalogMatch(query);
    searchPromises.set(query, searchPromise);
    return searchPromise;
  });
}

export function applyBatchResults(
  rows: MatchRow[],
  batchStart: number,
  results: PromiseSettledResult<CatalogMatch>[]
): MatchRow[] {
  const next = [...rows];
  for (const [offset, result] of results.entries()) {
    const index = batchStart + offset;
    const existing = next.at(index);
    if (!existing || existing.status !== 'pending') continue;
    const track = result.status === 'fulfilled' ? result.value : null;
    if (existing.appleTrack === null) {
      next.splice(index, 1, {
        ...existing,
        appleTrack: track,
        status: track ? 'matched' : 'unmatched',
      });
    }
  }
  return next;
}
