// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockFetchJson = vi.fn();

vi.mock('../../src/lib/fetch', () => ({
  fetchJson: (...args: unknown[]) => mockFetchJson(...args),
}));

import { useSetlistImportState } from '../../src/features/setlist-import/useSetlistImportState';

const firstSetlist = {
  id: '63de4613',
  eventDate: '23-08-1964',
  artist: { name: 'The Beatles' },
  venue: { name: 'Hollywood Bowl' },
  set: [{ song: [{ name: 'Yesterday' }] }],
};

const secondSetlist = {
  id: '53d6a489',
  eventDate: '14-06-2003',
  artist: { name: 'Radiohead' },
  venue: { name: 'South Park' },
  set: [{ song: [{ name: 'There There' }] }],
};

function createStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('useSetlistImportState', () => {
  beforeEach(() => {
    mockFetchJson.mockReset();
    vi.stubGlobal('localStorage', createStorageMock());
    Object.defineProperty(window, 'localStorage', {
      value: globalThis.localStorage,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps only the latest request result when a previous fetch is aborted', async () => {
    mockFetchJson
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      })
      .mockResolvedValueOnce({ ok: true, value: secondSetlist });

    const { result } = renderHook(() => useSetlistImportState());

    let firstPromise!: Promise<boolean>;
    let secondPromise!: Promise<boolean>;
    await act(async () => {
      firstPromise = result.current.loadSetlist('first-id');
      secondPromise = result.current.loadSetlist('second-id');
      await Promise.all([firstPromise, secondPromise]);
    });

    expect(await firstPromise).toBe(false);
    expect(await secondPromise).toBe(true);
    expect(result.current.setlist?.id).toBe('53d6a489');
    expect(result.current.error).toBeNull();
  });

  it('selectHistoryItem updates the input and loads that setlist', async () => {
    window.localStorage.setItem('setlist_import_history_v1', JSON.stringify(['63de4613']));
    mockFetchJson.mockResolvedValueOnce({ ok: true, value: firstSetlist });

    const { result } = renderHook(() => useSetlistImportState());

    await waitFor(() => {
      expect(result.current.history).toEqual(['63de4613']);
    });

    await act(async () => {
      result.current.selectHistoryItem('63de4613');
    });

    await waitFor(() => {
      expect(result.current.inputValue).toBe('63de4613');
      expect(result.current.setlist?.artist).toBe('The Beatles');
    });
    expect(mockFetchJson).toHaveBeenCalledOnce();
  });
});
