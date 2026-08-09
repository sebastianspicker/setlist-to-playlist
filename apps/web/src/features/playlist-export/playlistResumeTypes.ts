export interface ResumeState {
  status: 'incomplete';
  progress: 'exact' | 'unknown';
  id: string;
  url?: string;
  remainingIds: string[];
  attemptedIds?: string[];
  selectionSignature: string;
  storedAt?: number;
}
