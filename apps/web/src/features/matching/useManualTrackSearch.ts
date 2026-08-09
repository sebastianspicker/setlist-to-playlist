'use client';

import { useCallback, useRef, useState } from 'react';
import type { AppleMusicTrack } from '@/lib/musickit';
import { searchCatalog } from '@/lib/musickit';
import type { MatchRow } from './types';
import { findSearchRow, queryForSearchRow } from './trackSearchRows';
import type { CatalogTrackSearchContext } from './useCatalogTrackSearch';

export interface ManualTrackSearch {
  searchContext: CatalogTrackSearchContext;
  setSearchQuery: (query: string) => void;
  openSearch: (index: number) => void;
  runSearch: (index: number) => Promise<void>;
  closeSearch: () => void;
}

export function useManualTrackSearch(matches: MatchRow[]): ManualTrackSearch {
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AppleMusicTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchRunIdRef = useRef(0);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const invalidateCurrentSearch = useCallback(() => {
    searchRunIdRef.current += 1;
    setSearching(false);
  }, []);

  const closeSearch = useCallback(() => {
    invalidateCurrentSearch();
    setSearchingIndex(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(false);
    setHasSearched(false);
  }, [invalidateCurrentSearch]);

  const openSearch = useCallback(
    (index: number) => {
      const row = findSearchRow(matches, index);
      if (!row) return;
      invalidateCurrentSearch();
      setSearchingIndex(index);
      setSearchQuery(queryForSearchRow(row, ''));
      setSearchResults([]);
      setSearchError(false);
      setHasSearched(false);
    },
    [invalidateCurrentSearch, matches]
  );

  const runSearch = useCallback(
    async (index: number) => {
      const row = findSearchRow(matches, index);
      if (!row) return;
      const query = queryForSearchRow(row, searchQueryRef.current);
      if (!query) return;
      const runId = searchRunIdRef.current + 1;
      searchRunIdRef.current = runId;
      setSearching(true);
      setSearchError(false);
      try {
        const tracks = await searchCatalog(query, 8);
        if (searchRunIdRef.current !== runId) return;
        setSearchResults(tracks);
        setHasSearched(true);
      } catch {
        if (searchRunIdRef.current !== runId) return;
        setSearchResults([]);
        setSearchError(true);
        setHasSearched(true);
      } finally {
        if (searchRunIdRef.current === runId) setSearching(false);
      }
    },
    [matches]
  );

  return {
    searchContext: {
      searchingIndex,
      searchQuery,
      searchResults,
      searching,
      searchError,
      hasSearched,
    },
    setSearchQuery,
    openSearch,
    runSearch,
    closeSearch,
  };
}
