"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildSearchQuery, flattenSetlistToEntries, getSetlistSignature } from "@repo/core";
import type { Setlist } from "@repo/core";
import type { AppleMusicTrack } from "@/lib/musickit";
import { searchCatalog } from "@/lib/musickit";
import type { MatchRow } from "./types";

export interface UseMatchingSuggestionsResult {
  entries: MatchRow["setlistEntry"][];
  matches: MatchRow[];
  loadingSuggestions: boolean;
  suggestionError: boolean;
  setMatch: (index: number, appleTrack: AppleMusicTrack | null) => void;
  resetMatches: () => void;
  autoMatchAll: () => Promise<void>;
  skipUnmatched: () => void;
}

function toInitialMatches(setlist: Setlist): MatchRow[] {
  return flattenSetlistToEntries(setlist).map((setlistEntry) => ({
    setlistEntry,
    appleTrack: null,
    status: "unmatched",
  }));
}

export function useMatchingSuggestions(setlist: Setlist): UseMatchingSuggestionsResult {
  const [matches, setMatches] = useState<MatchRow[]>(() => toInitialMatches(setlist));
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestionError, setSuggestionError] = useState(false);
  const runIdRef = useRef(0);

  const signature = useMemo(() => getSetlistSignature(setlist), [setlist]);

  const autoMatchAll = useCallback(async () => {
    const localRunId = Date.now();
    runIdRef.current = localRunId;
    const entriesFlat = flattenSetlistToEntries(setlist);
    if (entriesFlat.length === 0) {
      setMatches([]);
      setLoadingSuggestions(false);
      return;
    }

    setSuggestionError(false);
    setLoadingSuggestions(true);
    setMatches(
      entriesFlat.map((setlistEntry) => ({
        setlistEntry,
        appleTrack: null,
        status: "unmatched",
      }))
    );
    for (let i = 0; i < entriesFlat.length; i++) {
      if (runIdRef.current !== localRunId) return;
      const entry = entriesFlat[i];
      const query = buildSearchQuery(entry.name, entry.artist);
      if (!query) continue;
      try {
        const tracks = await searchCatalog(query, 1);
        if (runIdRef.current !== localRunId) return;
        const track = tracks[0] ?? null;
        setMatches((prev) => {
          const next = [...prev];
          if (next[i]) {
            next[i] = {
              ...next[i],
              appleTrack: track,
              status: track ? "matched" : "unmatched",
            };
          }
          return next;
        });
      } catch {
        if (runIdRef.current !== localRunId) return;
        setSuggestionError(true);
      }
    }
    if (runIdRef.current === localRunId) setLoadingSuggestions(false);
  }, [setlist]);

  useEffect(() => {
    void autoMatchAll();
  }, [signature, autoMatchAll]);

  const setMatch = useCallback((index: number, appleTrack: AppleMusicTrack | null) => {
    setMatches((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next[index] = {
        ...next[index],
        appleTrack,
        status: appleTrack ? "matched" : "skipped",
      };
      return next;
    });
  }, []);

  const resetMatches = useCallback(() => {
    runIdRef.current = Date.now();
    setMatches(toInitialMatches(setlist));
    setSuggestionError(false);
    setLoadingSuggestions(false);
  }, [setlist]);

  const skipUnmatched = useCallback(() => {
    setMatches((prev) =>
      prev.map((row) =>
        row.appleTrack ? row : { ...row, appleTrack: null, status: "skipped" }
      )
    );
  }, []);

  return {
    entries: flattenSetlistToEntries(setlist),
    matches,
    loadingSuggestions,
    suggestionError,
    setMatch,
    resetMatches,
    autoMatchAll,
    skipUnmatched,
  };
}
