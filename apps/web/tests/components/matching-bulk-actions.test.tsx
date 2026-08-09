// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@repo/ui', () => ({
  Button: ({
    loading: _loading,
    loadingChildren: _loadingChildren,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    loadingChildren?: React.ReactNode;
  }) => React.createElement('button', props, props.children),
}));

import { MatchingBulkActions } from '../../src/features/matching/MatchingBulkActions';

afterEach(cleanup);

describe('MatchingBulkActions', () => {
  it('runs both bulk actions when matching is idle', () => {
    const onAutoMatchAll = vi.fn();
    const onSkipUnmatched = vi.fn();
    render(
      <MatchingBulkActions
        loading={false}
        onAutoMatchAll={onAutoMatchAll}
        onSkipUnmatched={onSkipUnmatched}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-match all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip remaining' }));
    expect(onAutoMatchAll).toHaveBeenCalledOnce();
    expect(onSkipUnmatched).toHaveBeenCalledOnce();
  });

  it('disables skipping while an automatic run is active', () => {
    render(<MatchingBulkActions loading onAutoMatchAll={vi.fn()} onSkipUnmatched={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Skip remaining' })).toBeDisabled();
  });
});
