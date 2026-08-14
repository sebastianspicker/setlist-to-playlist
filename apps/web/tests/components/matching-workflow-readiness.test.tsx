// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
vi.mock('../../src/features/matching/MatchingLedger', () => ({ MatchingLedger: () => <ul /> }));
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
describe('MatchingWorkflow readiness', () => {
  it('disables review when no tracks are matched', () => {
    render(
      <MatchingWorkflow setlist={matchingWorkflowSetlist} onProceedToCreatePlaylist={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: '0 of 1 selected' })).toBeDisabled();
  });
  it('does not count malformed catalog rows as matched', () => {
    mockSuggestions.mockReturnValue({
      ...unmatchedSuggestions,
      matches: [
        {
          setlistEntry: { name: 'Song A', artist: 'Test Artist' },
          appleTrack: { id: '', name: 'Song A', artistName: 'Test Artist' },
          status: 'matched',
        },
      ],
    });
    render(
      <MatchingWorkflow setlist={matchingWorkflowSetlist} onProceedToCreatePlaylist={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: '0 of 1 selected' })).toBeDisabled();
  });
});
