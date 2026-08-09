// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchApiJson = vi.fn();
vi.mock('../../src/lib/fetch', () => ({
  fetchApiJson: (...args: unknown[]) => fetchApiJson(...args),
}));

import { useSetlistImportWorkflowState } from '../../src/features/setlist-import/useSetlistImportWorkflowState';

const setlist = {
  id: '63de4613',
  eventDate: '23-08-1964',
  artist: { name: 'The Beatles' },
  venue: { name: 'Hollywood Bowl' },
  set: [{ song: [{ name: 'Yesterday' }] }],
};

const abortableRequest = (_url: string, init?: RequestInit): Promise<never> =>
  new Promise((_resolve, reject) =>
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
  );

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

beforeEach(() => {
  fetchApiJson.mockReset();
  Object.defineProperty(window, 'localStorage', { value: createStorage(), configurable: true });
});

afterEach(() => vi.restoreAllMocks());

describe('useSetlistImportWorkflowState', () => {
  it('keeps the later setlist when a new import supersedes an in-flight request', async () => {
    fetchApiJson.mockImplementationOnce(abortableRequest).mockResolvedValueOnce({
      ok: true,
      value: { ...setlist, id: '53d6a489' },
    });
    const { result } = renderHook(() => useSetlistImportWorkflowState());

    await act(async () => {
      await Promise.all([
        result.current.loadSetlist('63de4613'),
        result.current.loadSetlist('53d6a489'),
      ]);
    });

    expect(result.current.setlist?.id).toBe('53d6a489');
    expect(result.current.loading).toBe(false);
  });

  it('keeps invalid input local and classifies retryable service failures', async () => {
    const { result } = renderHook(() => useSetlistImportWorkflowState());
    await act(async () => {
      await result.current.loadSetlist('https://example.com/not-a-setlist');
    });
    expect(fetchApiJson).not.toHaveBeenCalled();
    expect(result.current.error).toMatchObject({ code: 'invalid-input', retryable: false });

    fetchApiJson.mockResolvedValueOnce({
      ok: false,
      error: 'Too many requests. Please retry shortly.',
    });
    await act(async () => {
      await result.current.loadSetlist('63de4613');
    });
    expect(result.current.error).toMatchObject({ code: 'rate-limit', retryable: true });
  });

  it('migrates and loads history selections through the loader boundary', async () => {
    window.localStorage.setItem('setlist_import_history_v1', JSON.stringify(['63de4613']));
    fetchApiJson.mockResolvedValueOnce({ ok: true, value: setlist });
    const { result } = renderHook(() => useSetlistImportWorkflowState());

    await waitFor(() => expect(result.current.history[0]?.setlistId).toBe('63de4613'));
    await act(async () => {
      await result.current.selectHistoryItem(result.current.history[0]!);
    });
    expect(result.current.setlist?.id).toBe('63de4613');
  });
});
