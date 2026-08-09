// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@repo/ui', () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    React.createElement('button', props, props.children),
}));
vi.mock('../../src/features/matching/MatchingBulkActions', () => ({
  MatchingBulkActions: ({
    onAutoMatchAll,
    onSkipUnmatched,
  }: {
    onAutoMatchAll: () => void;
    onSkipUnmatched: () => void;
  }) =>
    React.createElement(
      'div',
      null,
      React.createElement('button', { onClick: onAutoMatchAll }, 'Auto match'),
      React.createElement('button', { onClick: onSkipUnmatched }, 'Skip unmatched')
    ),
}));

import { MatchingSummary } from '../../src/features/matching/MatchingSummary';
import type { MatchRow } from '../../src/features/matching/types';

const matches: MatchRow[] = [
  { setlistEntry: { name: 'Song A' }, appleTrack: null, status: 'unmatched' },
  { setlistEntry: { name: 'Song B' }, appleTrack: null, status: 'skipped' },
];

function renderSummary(overrides: Partial<React.ComponentProps<typeof MatchingSummary>> = {}) {
  const onAutoMatchAll = vi.fn().mockResolvedValue(undefined);
  const onSkipUnmatched = vi.fn();
  const onProceed = vi.fn();
  render(
    <MatchingSummary
      matches={matches}
      loadingSuggestions={false}
      matchedCount={0}
      isSettled
      canProceed={false}
      onAutoMatchAll={onAutoMatchAll}
      onSkipUnmatched={onSkipUnmatched}
      onProceed={onProceed}
      {...overrides}
    />
  );
  return { onAutoMatchAll, onSkipUnmatched, onProceed };
}

afterEach(cleanup);

describe('MatchingSummary', () => {
  it('blocks playlist review until a selected song is available', () => {
    renderSummary();
    expect(screen.getByLabelText('0 of 2 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review playlist' })).toBeDisabled();
    expect(screen.getByText('Match at least one song to continue.')).toBeInTheDocument();
  });

  it('wires bulk and review actions and reflects an in-progress run', () => {
    const { onAutoMatchAll, onSkipUnmatched, onProceed } = renderSummary({
      loadingSuggestions: true,
      matchedCount: 1,
      isSettled: false,
      canProceed: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Auto match' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip unmatched' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review playlist' }));

    expect(onAutoMatchAll).toHaveBeenCalledOnce();
    expect(onSkipUnmatched).toHaveBeenCalledOnce();
    expect(onProceed).toHaveBeenCalledOnce();
    expect(
      screen.getByText(
        'Apple Music matching is still in progress. You can review results as they arrive.'
      )
    ).toBeInTheDocument();
  });
});
