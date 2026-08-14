import type { AppleMusicTrack } from '@/lib/musickit';

export interface CatalogTrackSearchContext {
  searchingIndex: number | null;
  searchQuery: string;
  searchResults: AppleMusicTrack[];
  searching: boolean;
  searchError: boolean;
  hasSearched: boolean;
}
