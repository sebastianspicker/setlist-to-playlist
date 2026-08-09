import type { Setlist } from '@repo/core';

export const matchingSetlist: Setlist = {
  id: 'test-123',
  artist: 'Test Artist',
  venue: 'Test Venue',
  sets: [
    [
      { name: 'Song A', artist: 'Test Artist' },
      { name: 'Song B', artist: 'Test Artist' },
      { name: 'Song C', artist: 'Test Artist' },
    ],
  ],
};
export const duplicateMatchingSetlist: Setlist = {
  id: 'dupes',
  artist: 'Test Artist',
  sets: [
    [
      { name: 'Song A', artist: 'Test Artist' },
      { name: 'Song A', artist: 'Test Artist' },
    ],
  ],
};
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
