import type { ResumeState } from './playlistResumeTypes';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const getAddProgress = (
  error: unknown,
  attemptedIds: string[]
): Pick<ResumeState, 'progress' | 'remainingIds' | 'attemptedIds'> => {
  const remainingIds = (error as { remainingIds?: unknown } | null)?.remainingIds;
  const progress = (error as { progress?: unknown } | null)?.progress;
  if (
    progress !== 'unknown' &&
    isStringArray(remainingIds) &&
    remainingIds.every((id) => id.trim().length > 0)
  ) {
    return { progress: 'exact', remainingIds };
  }
  const reportedAttempts = (error as { attemptedIds?: unknown } | null)?.attemptedIds;
  return {
    progress: 'unknown',
    remainingIds: [],
    attemptedIds: isStringArray(reportedAttempts) ? reportedAttempts : attemptedIds,
  };
};
