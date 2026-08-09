import type { MatchRow } from '../../src/features/matching/types';
export const catalogMatches: MatchRow[] = [
  { setlistEntry: { name: 'Song A', artist: 'Artist A' }, appleTrack: null, status: 'unmatched' },
  { setlistEntry: { name: 'Song B', artist: 'Artist B' }, appleTrack: null, status: 'unmatched' },
];
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
