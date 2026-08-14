// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportHistoryItem } from '../../src/features/setlist-import/importHistory';
import type { ImportError } from '../../src/features/setlist-import/setlistImportErrors';

vi.mock('../../src/components/ErrorAlert', () => ({
  ErrorAlert: ({ message, onRetry }: { message: string; onRetry?: () => void }) =>
    React.createElement(
      'div',
      { role: 'alert' },
      message,
      onRetry && React.createElement('button', { onClick: onRetry }, 'Retry load setlist')
    ),
}));
vi.mock('@repo/ui', () => ({
  Button: ({
    loading,
    loadingChildren,
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    loadingChildren?: React.ReactNode;
  }) =>
    React.createElement(
      'button',
      { ...props, disabled: Boolean(props.disabled || loading) },
      loading ? loadingChildren : children
    ),
}));
vi.mock('../../src/components/StatusText', () => ({
  StatusText: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', null, children),
}));
vi.mock('../../src/features/setlist-import/SetlistPreview', () => ({
  SetlistPreview: () => React.createElement('div', null, 'Preview'),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const loadSetlist = vi.fn().mockResolvedValue(false);
const validateInput = vi.fn().mockReturnValue(true);
const retryLast = vi.fn().mockResolvedValue(false);
const selectHistoryItem = vi.fn().mockResolvedValue(false);
const goToPreview = vi.fn();
const state = {
  inputValue: '',
  setInputValue: vi.fn(),
  setlist: null,
  loading: false,
  error: null as ImportError | null,
  history: [] as ImportHistoryItem[],
  loadSetlist,
  validateInput,
  cancelLoad: vi.fn(),
  retryLast,
  selectHistoryItem,
  clearHistory: vi.fn(),
  resetForAnother: vi.fn(),
};
const useState = vi.fn(() => state);
vi.mock('../../src/features/setlist-import/useSetlistImportWorkflowState', () => ({
  useSetlistImportWorkflowState: () => useState(),
}));
vi.mock('../../src/features/setlist-import/useFlowState', () => ({
  useFlowState: () => ({
    step: 'import',
    matchRows: null,
    stepContainerRef: { current: null },
    goToPreview,
    goToMatching: vi.fn(),
    goToExport: vi.fn(),
    goBackToPreview: vi.fn(),
    goBackToMatching: vi.fn(),
    updateMatchDraft: vi.fn(),
    startAnotherSetlist: vi.fn(),
  }),
}));

import { SetlistImportWorkflow as SetlistImportView } from '../../src/features/setlist-import/SetlistImportWorkflow';

beforeEach(() => {
  vi.clearAllMocks();
  validateInput.mockReturnValue(true);
});
afterEach(cleanup);

describe('SetlistImportView', () => {
  it('keeps validation local before issuing an import request', () => {
    validateInput.mockReturnValue(false);
    render(<SetlistImportView />);
    fireEvent.submit(screen.getByRole('button', { name: 'Load setlist' }).closest('form')!);
    expect(validateInput).toHaveBeenCalledOnce();
    expect(loadSetlist).not.toHaveBeenCalled();
  });

  it('advances selected history only after a successful load', async () => {
    const item = { input: '63de4613', setlistId: '63de4613' };
    useState.mockReturnValue({ ...state, history: [item] });
    selectHistoryItem.mockResolvedValue(true);
    render(<SetlistImportView />);
    fireEvent.click(screen.getByRole('button', { name: /Setlist 63de4613/ }));
    await waitFor(() => expect(goToPreview).toHaveBeenCalledOnce());
  });

  it('exposes retry only for retryable errors', () => {
    useState.mockReturnValue({
      ...state,
      error: { message: 'Unavailable', code: 'service', retryable: true },
    });
    render(<SetlistImportView />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry load setlist' }));
    expect(retryLast).toHaveBeenCalledOnce();
  });
});
