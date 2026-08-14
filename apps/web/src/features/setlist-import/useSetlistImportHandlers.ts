import type { Dispatch, FormEvent, RefObject, SetStateAction } from 'react';
import type { ImportHistoryItem } from './importHistory';
import type { useSetlistImportWorkflowState } from './useSetlistImportWorkflowState';

type SetlistImportState = ReturnType<typeof useSetlistImportWorkflowState>;

interface UseSetlistImportHandlersProps {
  importState: SetlistImportState;
  inputRef: RefObject<HTMLInputElement | null>;
  goToPreview: () => void;
  startAnotherSetlist: () => void;
  setSubmissionError: Dispatch<SetStateAction<string | null>>;
  setHistoryAnnouncement: Dispatch<SetStateAction<string>>;
}

const LOAD_ERROR = 'Unable to load the setlist. Please try again.';

export function useSetlistImportHandlers({
  importState,
  inputRef,
  goToPreview,
  startAnotherSetlist,
  setSubmissionError,
  setHistoryAnnouncement,
}: UseSetlistImportHandlersProps) {
  function focusInvalidInput() {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function loadAndAdvance(load: () => Promise<boolean>): void {
    void load()
      .then((ok) => {
        if (ok) goToPreview();
      })
      .catch(() => {
        setSubmissionError(LOAD_ERROR);
      });
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setSubmissionError(null);
    if (!importState.validateInput()) {
      focusInvalidInput();
      return;
    }
    loadAndAdvance(() => importState.loadSetlist(importState.inputValue));
  }

  function handleSelectHistoryItem(item: ImportHistoryItem): void {
    setSubmissionError(null);
    loadAndAdvance(() => importState.selectHistoryItem(item));
  }

  function handleStartAnother(): void {
    importState.resetForAnother();
    startAnotherSetlist();
  }

  function handleClearHistory(): void {
    importState.clearHistory();
    setHistoryAnnouncement('Recent imports cleared.');
  }

  function handleRetry(): void {
    void importState.retryLast().then((ok) => {
      if (ok) goToPreview();
    });
  }

  return {
    handleSubmit,
    handleSelectHistoryItem,
    handleStartAnother,
    handleClearHistory,
    handleRetry,
  };
}
