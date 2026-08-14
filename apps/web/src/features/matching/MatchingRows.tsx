import { CatalogMatchRow } from './CatalogMatchRow';
import type { MatchRow } from './types';
import type {
  CatalogTrackSearchContext,
  UseCatalogTrackSearchResult,
} from './useCatalogTrackSearch';

export interface MatchingRowsProps {
  matches: MatchRow[];
  searchContext: CatalogTrackSearchContext;
  onOpenSearch: UseCatalogTrackSearchResult['openSearch'];
  onSkip: UseCatalogTrackSearchResult['skipTrack'];
  onSearchQueryChange: UseCatalogTrackSearchResult['setSearchQuery'];
  onSearch: UseCatalogTrackSearchResult['runSearch'];
  onChoose: UseCatalogTrackSearchResult['chooseTrack'];
  onCancelSearch: UseCatalogTrackSearchResult['closeSearch'];
}

export function MatchingRows(props: MatchingRowsProps) {
  return (
    <ul className="matching-list">
      {props.matches.map((row, index) => (
        <CatalogMatchRow
          key={`${row.setlistEntry.name}-${index}`}
          row={row}
          index={index}
          isSearching={props.searchContext.searchingIndex === index}
          searchContext={props.searchContext.searchingIndex === index ? props.searchContext : null}
          onOpenSearch={props.onOpenSearch}
          onSkip={props.onSkip}
          onSearchQueryChange={props.onSearchQueryChange}
          onSearch={props.onSearch}
          onChoose={props.onChoose}
          onCancelSearch={props.onCancelSearch}
        />
      ))}
    </ul>
  );
}
