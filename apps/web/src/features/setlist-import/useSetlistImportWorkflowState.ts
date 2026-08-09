'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Setlist } from '@repo/core';
import { readImportHistory, type ImportHistoryItem } from './importHistory';
import { useSetlistImportControls } from './useSetlistImportControls';
import { useSetlistLoader } from './useSetlistLoader';
import type { ImportError } from './setlistImportErrors';

const subscribeToHydration = () => () => {};

/** Composes loading, persistence, and user controls for a setlist import. */
export function useSetlistImportWorkflowState() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );
  const [inputValue, setInputValueState] = useState('');
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ImportError | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>(() => readImportHistory());
  const loader = useSetlistLoader({ setSetlist, setLoading, setError, setHistory });
  const controls = useSetlistImportControls({
    inputValue,
    setInputValueState,
    setSetlist,
    setError,
    setHistory,
    ...loader,
  });

  useEffect(() => loader.cancelLoad, [loader.cancelLoad]);

  return {
    inputValue,
    setInputValue: controls.setInputValue,
    setlist,
    loading,
    error,
    history: hydrated ? history : [],
    loadSetlist: loader.loadSetlist,
    validateInput: controls.validateInput,
    cancelLoad: loader.cancelLoad,
    retryLast: controls.retryLast,
    selectHistoryItem: controls.selectHistoryItem,
    clearHistory: controls.clearHistory,
    resetForAnother: controls.resetForAnother,
  };
}
