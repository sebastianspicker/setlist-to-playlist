// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock sub-components to avoid deep dependency chains
vi.mock('../../src/components/FlowStepIndicator', () => ({
  FlowStepIndicator: () => null,
}));
vi.mock('../../src/components/ErrorAlert', () => ({
  ErrorAlert: ({ message }: { message: string }) =>
    React.createElement('div', { role: 'alert' }, message),
}));
vi.mock('../../src/components/LoadingButton', () => ({
  LoadingButton: ({
    loading,
    loadingChildren,
    children,
    disabled,
    ...buttonProps
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    loadingChildren?: string;
  }) =>
    React.createElement(
      'button',
      { ...buttonProps, disabled: disabled || loading },
      loading ? loadingChildren : children
    ),
}));
vi.mock('../../src/components/SectionTitle', () => ({
  SectionTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children),
}));
vi.mock('../../src/components/StatusText', () => ({
  StatusText: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLParagraphElement> & { children: React.ReactNode }) =>
    React.createElement('p', props, children),
}));
vi.mock('../../src/features/matching/ConnectAppleMusic', () => ({
  ConnectAppleMusic: () => null,
}));
vi.mock('../../src/features/setlist-import/SetlistPreview', () => ({
  SetlistPreview: () => React.createElement('div', null, 'Preview'),
}));

const mockLoadSetlist = vi.fn().mockResolvedValue(false);
const mockGoToPreview = vi.fn();
const mockGoToMatching = vi.fn();

vi.mock('../../src/features/setlist-import/useSetlistImportState', () => ({
  useSetlistImportState: vi.fn(() => ({
    inputValue: '',
    setInputValue: vi.fn(),
    setlist: null,
    loading: false,
    error: null,
    history: [],
    loadSetlist: mockLoadSetlist,
    retryLast: vi.fn(),
    selectHistoryItem: vi.fn(),
    clearHistory: vi.fn(),
  })),
}));

vi.mock('../../src/features/setlist-import/useFlowState', () => ({
  useFlowState: vi.fn(() => ({
    step: 'import',
    matchRows: null,
    stepContainerRef: { current: null },
    goToPreview: mockGoToPreview,
    goToMatching: mockGoToMatching,
    goToExport: vi.fn(),
    goBackToPreview: vi.fn(),
    goBackToMatching: vi.fn(),
  })),
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_loader: () => Promise<unknown>) => {
    const DynamicStub = (_props: Record<string, unknown>) => null;
    DynamicStub.displayName = 'DynamicComponent';
    return DynamicStub;
  },
}));

import { SetlistImportView } from '../../src/features/setlist-import/SetlistImportView';
import { useSetlistImportState } from '../../src/features/setlist-import/useSetlistImportState';

const mockUseSetlistImportState = vi.mocked(useSetlistImportState);

describe('SetlistImportView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadSetlist.mockResolvedValue(false);
  });

  it('renders input field and load button', () => {
    render(<SetlistImportView />);
    expect(screen.getByLabelText('Setlist URL or ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load setlist/i })).toBeInTheDocument();
  });

  it('submit button is disabled when input is empty', () => {
    render(<SetlistImportView />);
    const buttons = screen.getAllByRole('button');
    const submitBtn = buttons.find((b) => b.textContent === 'Load setlist');
    expect(submitBtn).toBeDefined();
    expect(submitBtn).toBeDisabled();
  });

  it('shows loading state', () => {
    mockUseSetlistImportState.mockReturnValue({
      inputValue: 'abc123',
      setInputValue: vi.fn(),
      setlist: null,
      loading: true,
      error: null,
      history: [],
      loadSetlist: mockLoadSetlist,
      retryLast: vi.fn(),
      selectHistoryItem: vi.fn(),
      clearHistory: vi.fn(),
    });

    render(<SetlistImportView />);
    expect(screen.getByText('Loading setlist…')).toBeInTheDocument();
  });

  it('shows error message', () => {
    mockUseSetlistImportState.mockReturnValue({
      inputValue: 'bad-id',
      setInputValue: vi.fn(),
      setlist: null,
      loading: false,
      error: 'Setlist not found.',
      history: [],
      loadSetlist: mockLoadSetlist,
      retryLast: vi.fn(),
      selectHistoryItem: vi.fn(),
      clearHistory: vi.fn(),
    });

    render(<SetlistImportView />);
    expect(screen.getByText('Setlist not found.')).toBeInTheDocument();
  });

  it('shows history items', () => {
    mockUseSetlistImportState.mockReturnValue({
      inputValue: '',
      setInputValue: vi.fn(),
      setlist: null,
      loading: false,
      error: null,
      history: ['abc123', 'def456'],
      loadSetlist: mockLoadSetlist,
      retryLast: vi.fn(),
      selectHistoryItem: vi.fn(),
      clearHistory: vi.fn(),
    });

    render(<SetlistImportView />);
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('def456')).toBeInTheDocument();
  });
});
