'use client';

import { useCallback } from 'react';
import type { AppleMusicTrack } from '@/lib/musickit';
import type { CatalogTrackSearchContext } from './catalogTrackSearchTypes';
import { findSearchRow } from './trackSearchRows';
import type { MatchRow } from './types';
import { useManualTrackSearch } from './useManualTrackSearch';

export type { CatalogTrackSearchContext };

export interface UseCatalogTrackSearchParams {
  matches: MatchRow[];
  setMatch: (index: number, appleTrack: AppleMusicTrack | null) => void;
}

export interface UseCatalogTrackSearchResult {
  searchContext: CatalogTrackSearchContext;
  setSearchQuery: (query: string) => void;
  openSearch: (index: number) => void;
  runSearch: (index: number) => Promise<void>;
  chooseTrack: (index: number, track: AppleMusicTrack) => void;
  skipTrack: (index: number) => void;
  closeSearch: () => void;
}

export function useCatalogTrackSearch({
  matches,
  setMatch,
}: UseCatalogTrackSearchParams): UseCatalogTrackSearchResult {
  const { searchContext, setSearchQuery, openSearch, runSearch, closeSearch } =
    useManualTrackSearch(matches);
  const chooseTrack = useCallback(
    (index: number, track: AppleMusicTrack) => {
      if (!findSearchRow(matches, index)) return;
      closeSearch();
      setMatch(index, track);
    },
    [closeSearch, matches, setMatch]
  );
  const skipTrack = useCallback(
    (index: number) => {
      if (!findSearchRow(matches, index)) return;
      setMatch(index, null);
      if (searchContext.searchingIndex === index) closeSearch();
    },
    [closeSearch, matches, searchContext.searchingIndex, setMatch]
  );
  return {
    searchContext,
    setSearchQuery,
    openSearch,
    runSearch,
    chooseTrack,
    skipTrack,
    closeSearch,
  };
}
