// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('../../src/components/StatusText', () => ({
  StatusText: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
    React.createElement('p', props, children),
}));
vi.mock('../../src/features/matching/MatchingRows', () => ({
  MatchingRows: ({ matches }: { matches: { setlistEntry: { name: string } }[] }) =>
    React.createElement(
      'ul',
      null,
      matches.map((row, index) => React.createElement('li', { key: index }, row.setlistEntry.name))
    ),
}));

import { MatchingLedger } from '../../src/features/matching/MatchingLedger';
import type { MatchRow } from '../../src/features/matching/types';

const matches: MatchRow[] = [
  { setlistEntry: { name: 'Song A' }, appleTrack: null, status: 'unmatched' },
  { setlistEntry: { name: 'Song B' }, appleTrack: null, status: 'pending' },
];

function renderLedger(overrides: Partial<React.ComponentProps<typeof MatchingLedger>> = {}) {
  return render(
    <MatchingLedger
      matches={matches}
      loadingSuggestions={false}
      suggestionError={false}
      matchedCount={1}
      settledCount={1}
      isSettled={false}
      searchContext={{
        searchingIndex: null,
        searchQuery: '',
        searchResults: [],
        searching: false,
        searchError: false,
        hasSearched: false,
      }}
      onOpenSearch={vi.fn()}
      onSkip={vi.fn()}
      onSearchQueryChange={vi.fn()}
      onSearch={vi.fn().mockResolvedValue(undefined)}
      onChoose={vi.fn()}
      onCancelSearch={vi.fn()}
      {...overrides}
    />
  );
}

afterEach(cleanup);

describe('MatchingLedger', () => {
  it('reports automatic matching progress while rows remain pending', () => {
    renderLedger();
    expect(
      screen.getByText(
        (_, element) => element?.textContent === 'Searching Apple Music: 1 of 2 songs checked'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Song A')).toBeInTheDocument();
  });

  it('reports settled totals and a recoverable automatic-match failure', () => {
    renderLedger({ isSettled: true, suggestionError: true });
    expect(
      screen.getByText((_, element) => element?.textContent === '1 of 2 songs matched')
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Some songs could not be matched automatically.'
    );
  });
});
