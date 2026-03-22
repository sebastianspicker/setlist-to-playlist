'use client';

import { useCallback, useRef, useState } from 'react';
import { buildSearchQuery } from '@repo/core';
import type { AppleMusicTrack } from '@/lib/musickit';
import { searchCatalog } from '@/lib/musickit';
import type { MatchRow } from './types';

export interface TrackSearchContext {
  searchingIndex: number | null;
  searchQuery: string;
  searchResults: AppleMusicTrack[];
  searching: boolean;
  searchError: boolean;
}

export interface UseTrackSearchParams {
  matches: MatchRow[];
  setMatch: (index: number, appleTrack: AppleMusicTrack | null) => void;
}

export interface UseTrackSearchResult {
  searchContext: TrackSearchContext;
  setSearchQuery: (q: string) => void;
  openSearch: (index: number) => void;
  runSearch: (index: number) => Promise<void>;
  chooseTrack: (index: number, track: AppleMusicTrack) => void;
  skipTrack: (index: number) => void;
}

export function useTrackSearch({ matches, setMatch }: UseTrackSearchParams): UseTrackSearchResult {
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AppleMusicTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const searchRunIdRef = useRef(0);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const openSearch = useCallback((index: number) => {
    setSearchingIndex(index);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(false);
  }, []);

  const runSearch = useCallback(
    async (index: number) => {
      const row = matches[index];
      if (index < 0 || index >= matches.length || !row?.setlistEntry) return;
      const q =
        searchQueryRef.current.trim() ||
        buildSearchQuery(row.setlistEntry.name, row.setlistEntry.artist);
      if (!q) return;
      const runId = Date.now();
      searchRunIdRef.current = runId;
      setSearching(true);
      setSearchError(false);
      try {
        const tracks = await searchCatalog(q, 8);
        if (searchRunIdRef.current !== runId) return;
        setSearchResults(tracks);
      } catch {
        if (searchRunIdRef.current !== runId) return;
        setSearchResults([]);
        setSearchError(true);
      } finally {
        if (searchRunIdRef.current === runId) {
          setSearching(false);
        }
      }
    },
    [matches]
  );

  const chooseTrack = useCallback(
    (index: number, track: AppleMusicTrack) => {
      setMatch(index, track);
      setSearchingIndex(null);
      setSearchResults([]);
      setSearchError(false);
    },
    [setMatch]
  );

  const skipTrack = useCallback(
    (index: number) => {
      setMatch(index, null);
      setSearchingIndex((prev) => {
        if (prev === index) {
          setSearchQuery('');
          setSearchResults([]);
          return null;
        }
        return prev;
      });
    },
    [setMatch]
  );

  const searchContext: TrackSearchContext = {
    searchingIndex,
    searchQuery,
    searchResults,
    searching,
    searchError,
  };

  return {
    searchContext,
    setSearchQuery,
    openSearch,
    runSearch,
    chooseTrack,
    skipTrack,
  };
}
