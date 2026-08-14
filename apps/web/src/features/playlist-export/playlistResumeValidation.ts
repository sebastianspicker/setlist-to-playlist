import type { ResumeState } from './playlistResumeTypes';

const RESUME_STALE_AFTER_MS = 30 * 60 * 1000;

export const isResumeState = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  const { status, id, selectionSignature, remainingIds } = value as Record<string, unknown>;
  return (
    status === 'incomplete' &&
    typeof id === 'string' &&
    Boolean(id) &&
    typeof selectionSignature === 'string' &&
    Array.isArray(remainingIds)
  );
};

export const isResumeStale = (storedAt: number | undefined): boolean =>
  typeof storedAt === 'number' && Date.now() - storedAt > RESUME_STALE_AFTER_MS;

export const createSelectionSignature = (songIds: string[], dedupeTracks: boolean): string => {
  // Resume applies only to the exact exported sequence; otherwise retrying could add wrong tracks.
  return JSON.stringify({ dedupeTracks, songIds });
};

export const isRemainingSubsetOfSelection = (
  remainingIds: string[],
  songIds: string[]
): boolean => {
  const available = new Map<string, number>();
  for (const id of songIds) {
    available.set(id, (available.get(id) ?? 0) + 1);
  }
  for (const id of remainingIds) {
    const count = available.get(id) ?? 0;
    if (count === 0) return false;
    available.set(id, count - 1);
  }
  return true;
};

export const shouldDiscardResume = (
  stored: ResumeState,
  selectionSignature: string,
  songIds: string[]
): boolean =>
  isResumeStale(stored.storedAt) ||
  stored.selectionSignature !== selectionSignature ||
  (stored.progress === 'exact' &&
    (stored.remainingIds.length === 0 ||
      !isRemainingSubsetOfSelection(stored.remainingIds, songIds)));
