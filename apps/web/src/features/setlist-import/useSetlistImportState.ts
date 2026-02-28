"use client";

import { useEffect, useRef, useState } from "react";
import { mapSetlistFmToSetlist } from "@repo/core";
import type { Setlist, SetlistFmResponse } from "@repo/core";
import {
  getErrorMessage,
  isOk,
  MAX_SETLIST_INPUT_LENGTH,
  SETLIST_MESSAGES,
} from "@repo/shared";
import { setlistProxyUrl } from "@/lib/api";
import { fetchJson } from "@/lib/fetch";

const HISTORY_KEY = "setlist_import_history_v1";
const MAX_HISTORY_ITEMS = 8;

function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

function writeHistory(next: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    // ignore quota/access errors
  }
}

function pushHistory(prev: string[], value: string): string[] {
  const normalized = value.trim();
  if (!normalized) return prev;
  const deduped = [normalized, ...prev.filter((item) => item !== normalized)];
  return deduped.slice(0, MAX_HISTORY_ITEMS);
}

export interface UseSetlistImportState {
  inputValue: string;
  setInputValue: (value: string) => void;
  setlist: Setlist | null;
  loading: boolean;
  error: string | null;
  history: string[];
  loadSetlist: (value: string) => Promise<boolean>;
  retryLast: () => void;
  selectHistoryItem: (value: string) => void;
  clearHistory: () => void;
}

export function useSetlistImportState(): UseSetlistImportState {
  const [inputValue, setInputValueState] = useState("");
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const currentRequestRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  async function loadSetlist(trimmedValue: string): Promise<boolean> {
    const trimmed = trimmedValue.trim();
    setError(null);
    if (!trimmed) return false;
    if (trimmed.length > MAX_SETLIST_INPUT_LENGTH) {
      setError(SETLIST_MESSAGES.INPUT_TOO_LONG);
      return false;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    currentRequestRef.current = trimmed;
    setLoading(true);
    try {
      const url = setlistProxyUrl(`id=${encodeURIComponent(trimmed)}`);
      const result = await fetchJson<SetlistFmResponse>(url, { signal });
      if (currentRequestRef.current !== trimmed) return false;

      if (isOk(result)) {
        const mapped = mapSetlistFmToSetlist(result.value);
        setSetlist(mapped);
        setHistory((prev) => {
          const next = pushHistory(prev, trimmed);
          writeHistory(next);
          return next;
        });
        return true;
      } else {
        setError(result.error);
        setSetlist(null);
        return false;
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return false;
      if (currentRequestRef.current !== trimmed) return false;
      setError(getErrorMessage(err, "Network error"));
      setSetlist(null);
      return false;
    } finally {
      if (currentRequestRef.current === trimmed) {
        setLoading(false);
        currentRequestRef.current = null;
      }
    }
    return false;
  }

  function retryLast() {
    void loadSetlist(inputValue);
  }

  function setInputValue(value: string) {
    setInputValueState(value);
    setError(null);
  }

  function selectHistoryItem(value: string) {
    setInputValueState(value);
    void loadSetlist(value);
  }

  function clearHistory() {
    setHistory([]);
    writeHistory([]);
  }

  return {
    inputValue,
    setInputValue,
    setlist,
    loading,
    error,
    history,
    loadSetlist,
    retryLast,
    selectHistoryItem,
    clearHistory,
  };
}
