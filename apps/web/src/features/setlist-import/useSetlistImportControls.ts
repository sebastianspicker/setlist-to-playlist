import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { Setlist } from '@repo/core';
import { clearImportHistory, type ImportHistoryItem } from './importHistory';
import { getInvalidInputError, type ImportError } from './setlistImportErrors';

interface SetlistImportControlsState {
  inputValue: string;
  setInputValueState: Dispatch<SetStateAction<string>>;
  setSetlist: Dispatch<SetStateAction<Setlist | null>>;
  setError: Dispatch<SetStateAction<ImportError | null>>;
  setHistory: Dispatch<SetStateAction<ImportHistoryItem[]>>;
  loadSetlist: (value: string) => Promise<boolean>;
  cancelLoad: () => void;
}

export function useSetlistImportControls({
  inputValue,
  setInputValueState,
  setSetlist,
  setError,
  setHistory,
  loadSetlist,
  cancelLoad,
}: SetlistImportControlsState) {
  const validateInput = useCallback((): boolean => {
    const validationError = getInvalidInputError(inputValue);
    setError(validationError);
    return validationError === null;
  }, [inputValue, setError]);

  const retryLast = useCallback(() => loadSetlist(inputValue), [inputValue, loadSetlist]);
  const setInputValue = useCallback(
    (value: string) => {
      setInputValueState(value);
      setError(null);
    },
    [setError, setInputValueState]
  );
  const selectHistoryItem = useCallback(
    async (item: ImportHistoryItem) => {
      setInputValueState(item.input);
      return loadSetlist(item.input);
    },
    [loadSetlist, setInputValueState]
  );
  const clearHistory = useCallback(() => {
    setHistory([]);
    clearImportHistory();
  }, [setHistory]);
  const resetForAnother = useCallback(() => {
    cancelLoad();
    setInputValueState('');
    setSetlist(null);
    setError(null);
  }, [cancelLoad, setError, setInputValueState, setSetlist]);

  return {
    validateInput,
    retryLast,
    setInputValue,
    selectHistoryItem,
    clearHistory,
    resetForAnother,
  };
}
