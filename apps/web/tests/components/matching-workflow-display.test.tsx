// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
vi.mock('../../src/features/matching/MatchingLedger', () => ({
  MatchingLedger: ({ matches }: { matches: { setlistEntry: { name: string } }[] }) => (
    <ul>
      {matches.map((row, index) => (
        <li key={index}>{row.setlistEntry.name}</li>
      ))}
    </ul>
  ),
}));
vi.mock('../../src/features/matching/MatchingSummary', () => ({
  MatchingSummary: ({
    matchedCount,
    matches,
    canProceed,
  }: {
    matchedCount: number;
    matches: unknown[];
    canProceed: boolean;
  }) => (
    <button disabled={!canProceed} aria-label={`${matchedCount} of ${matches.length} selected`}>
      Review playlist
    </button>
  ),
}));
const mockSuggestions = vi.fn();
vi.mock('../../src/features/matching/useCatalogMatchSuggestions', () => ({
  useCatalogMatchSuggestions: (...args: unknown[]) => mockSuggestions(...args),
}));
const mockSearch = vi.fn();
vi.mock('../../src/features/matching/useCatalogTrackSearch', () => ({
  useCatalogTrackSearch: (...args: unknown[]) => mockSearch(...args),
}));
import { MatchingWorkflow } from '../../src/features/matching/MatchingWorkflow';
import {
  idleSearch,
  matchingWorkflowSetlist,
  unmatchedSuggestions,
} from './matching-workflow.test-support';
beforeEach(() => {
  mockSuggestions.mockReturnValue(unmatchedSuggestions);
  mockSearch.mockReturnValue(idleSearch);
});
afterEach(cleanup);
describe('MatchingWorkflow display', () => {
  it('renders the matching list and selected count', () => {
    render(
      <MatchingWorkflow setlist={matchingWorkflowSetlist} onProceedToCreatePlaylist={vi.fn()} />
    );
    expect(screen.getByText('Song A')).toBeInTheDocument();
    expect(screen.getByLabelText('0 of 1 selected')).toBeInTheDocument();
  });
  it('renders without rows while suggestions load', () => {
    mockSuggestions.mockReturnValue({
      ...unmatchedSuggestions,
      matches: [],
      loadingSuggestions: true,
    });
    render(
      <MatchingWorkflow setlist={matchingWorkflowSetlist} onProceedToCreatePlaylist={vi.fn()} />
    );
    expect(screen.queryByText('Song A')).not.toBeInTheDocument();
  });
});
