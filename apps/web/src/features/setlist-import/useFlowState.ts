import { useCallback, useEffect, useRef, useState } from 'react';
import type { MatchRow } from '@/features/matching/types';

export type FlowStep = 'import' | 'preview' | 'matching' | 'export';

export interface UseFlowStateResult {
  step: FlowStep;
  matchRows: MatchRow[] | null;
  /** Ref to attach to the top-level section of the current step for focus management. */
  stepContainerRef: React.RefObject<HTMLElement | null>;
  goToPreview: () => void;
  goToMatching: () => void;
  goToExport: (rows: MatchRow[]) => void;
  goBackToPreview: () => void;
  goBackToMatching: () => void;
  updateMatchDraft: (rows: MatchRow[]) => void;
  startAnotherSetlist: () => void;
}

export function useFlowState(): UseFlowStateResult {
  const [step, setStep] = useState<FlowStep>('import');
  const [matchRows, setMatchRows] = useState<MatchRow[] | null>(null);
  const stepContainerRef = useRef<HTMLElement | null>(null);
  const isFirstRender = useRef(true);

  // After a step change (but not on initial mount), move focus to the step
  // container so keyboard / screen-reader users land on the new content.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Wait one tick for the new step DOM to render.
    const id = requestAnimationFrame(() => {
      const el = stepContainerRef.current;
      if (el) {
        // Make focusable if it isn't already, then focus without a visible ring.
        if (!el.getAttribute('tabindex')) {
          el.setAttribute('tabindex', '-1');
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        el.focus({ preventScroll: true });
      }
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [step]);

  const goToPreview = useCallback(() => {
    setMatchRows(null);
    setStep('preview');
  }, []);
  const goToMatching = useCallback(() => {
    setStep('matching');
  }, []);
  const goToExport = useCallback((rows: MatchRow[]) => {
    setMatchRows(rows);
    setStep('export');
  }, []);
  const goBackToPreview = useCallback(() => {
    setStep('preview');
  }, []);
  const goBackToMatching = useCallback(() => {
    setStep('matching');
  }, []);
  const updateMatchDraft = useCallback((rows: MatchRow[]) => {
    setMatchRows(rows);
  }, []);
  const startAnotherSetlist = useCallback(() => {
    setMatchRows(null);
    setStep('import');
  }, []);

  return {
    step,
    matchRows,
    stepContainerRef,
    goToPreview,
    goToMatching,
    goToExport,
    goBackToPreview,
    goBackToMatching,
    updateMatchDraft,
    startAnotherSetlist,
  };
}
