import type { Setlist } from '@repo/core';
export const matchingWorkflowSetlist: Setlist = {
  id: 'test-123',
  artist: 'Test Artist',
  sets: [[{ name: 'Song A', artist: 'Test Artist' }]],
};
export const unmatchedSuggestions = {
  matches: [
    {
      setlistEntry: { name: 'Song A', artist: 'Test Artist' },
      appleTrack: null,
      status: 'unmatched' as const,
    },
  ],
  loadingSuggestions: false,
  suggestionError: false,
  setMatch: () => {},
  autoMatchAll: async () => {},
  skipUnmatched: () => {},
};
export const idleSearch = {
  searchContext: {
    searchingIndex: null,
    searchQuery: '',
    searchResults: [],
    searching: false,
    searchError: false,
    hasSearched: false,
  },
  setSearchQuery: () => {},
  openSearch: () => {},
  runSearch: async () => {},
  chooseTrack: () => {},
  skipTrack: () => {},
  closeSearch: () => {},
};
