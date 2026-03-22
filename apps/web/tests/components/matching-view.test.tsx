// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('../../src/components/FlowStepIndicator', () => ({ FlowStepIndicator: () => null }));
vi.mock('../../src/components/SectionTitle', () => ({
  SectionTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children),
}));
vi.mock('../../src/components/StatusText', () => ({
  StatusText: ({
    children,
    ...p
  }: React.HTMLAttributes<HTMLElement> & { children: React.ReactNode }) =>
    React.createElement('p', p, children),
}));
vi.mock('../../src/components/LoadingButton', () => ({
  LoadingButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    React.createElement('button', props, props.children),
}));
vi.mock('../../src/features/matching/MatchRowItem', () => ({
  MatchRowItem: ({ row }: { row: { setlistEntry: { name: string } } }) =>
    React.createElement('li', null, row.setlistEntry.name),
}));
vi.mock('../../src/features/matching/MatchingBulkActions', () => ({
  MatchingBulkActions: () => React.createElement('div', null, 'Bulk actions'),
}));

const mockUseMatchingSuggestions = vi.fn();
vi.mock('../../src/features/matching/useMatchingSuggestions', () => ({
  useMatchingSuggestions: (...args: unknown[]) => mockUseMatchingSuggestions(...args),
}));

const mockUseTrackSearch = vi.fn();
vi.mock('../../src/features/matching/useTrackSearch', () => ({
  useTrackSearch: (...args: unknown[]) => mockUseTrackSearch(...args),
}));

import { MatchingView } from '../../src/features/matching/MatchingView';
import type { Setlist } from '@repo/core';

const mockSetlist: Setlist = {
  id: 'test-123',
  artist: 'Test Artist',
  sets: [[{ name: 'Song A', artist: 'Test Artist' }]],
};

describe('MatchingView', () => {
  beforeEach(() => {
    mockUseMatchingSuggestions.mockReturnValue({
      matches: [
        {
          setlistEntry: { name: 'Song A', artist: 'Test Artist' },
          appleTrack: null,
          status: 'unmatched',
        },
      ],
      loadingSuggestions: false,
      suggestionError: false,
      setMatch: vi.fn(),
      autoMatchAll: vi.fn(),
      resetMatches: vi.fn(),
      skipUnmatched: vi.fn(),
    });
    mockUseTrackSearch.mockReturnValue({
      searchContext: {
        searchingIndex: null,
        searchQuery: '',
        searchResults: [],
        searching: false,
        searchError: false,
      },
      setSearchQuery: vi.fn(),
      openSearch: vi.fn(),
      runSearch: vi.fn(),
      chooseTrack: vi.fn(),
      skipTrack: vi.fn(),
    });
  });

  it('renders track list', () => {
    render(<MatchingView setlist={mockSetlist} onProceedToCreatePlaylist={vi.fn()} />);
    expect(screen.getByText('Song A')).toBeInTheDocument();
  });

  it('shows suggestion loading state', () => {
    mockUseMatchingSuggestions.mockReturnValue({
      matches: [],
      loadingSuggestions: true,
      suggestionError: false,
      setMatch: vi.fn(),
      autoMatchAll: vi.fn(),
      resetMatches: vi.fn(),
      skipUnmatched: vi.fn(),
    });
    render(<MatchingView setlist={mockSetlist} onProceedToCreatePlaylist={vi.fn()} />);
    expect(screen.getByText('Fetching suggestions…')).toBeInTheDocument();
  });

  it('disables proceed button when no tracks matched', () => {
    render(<MatchingView setlist={mockSetlist} onProceedToCreatePlaylist={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    const proceedBtn = buttons.find((b) => b.textContent?.includes('Create playlist'));
    expect(proceedBtn).toBeDisabled();
  });
});
