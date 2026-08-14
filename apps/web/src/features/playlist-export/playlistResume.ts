import type { ResumeState } from './playlistResumeTypes';
import { isResumeState } from './playlistResumeValidation';

export type { ResumeState } from './playlistResumeTypes';
export {
  createSelectionSignature,
  isRemainingSubsetOfSelection,
  isResumeStale,
  isResumeState,
  shouldDiscardResume,
} from './playlistResumeValidation';
export { getAddProgress } from './playlistResumeProgress';

export const resumeKey = (setlistId: string): string => `playlist_resume_v1:${setlistId}`;

export const readResume = (setlistId: string): ResumeState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(resumeKey(setlistId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isResumeState(parsed)) return null;
    const resume = parsed as ResumeState;
    return {
      ...resume,
      progress: resume.progress === 'unknown' ? 'unknown' : 'exact',
    };
  } catch {
    return null;
  }
};

export function writeResume(setlistId: string, value: ResumeState | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key = resumeKey(setlistId);
    if (!value) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota and access errors because resume is optional.
  }
}
