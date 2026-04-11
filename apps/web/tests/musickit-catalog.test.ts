import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockApi = vi.fn();
const mockMusicKitInstance = {
  storefrontId: 'us',
  isAuthorized: true,
  music: { api: mockApi },
  authorize: vi.fn(),
  unauthorize: vi.fn(),
};

vi.mock('../src/lib/musickit/client', () => ({
  initMusicKit: vi.fn(() => Promise.resolve(mockMusicKitInstance)),
}));

describe('searchCatalog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    mockApi.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function loadModule() {
    const mod = await import('../src/lib/musickit/catalog');
    return mod.searchCatalog;
  }

  const songsResponse = {
    results: {
      songs: {
        data: [
          { id: 's1', attributes: { name: 'Song One', artistName: 'Artist A' } },
          { id: 's2', attributes: { name: 'Song Two', artistName: 'Artist B' } },
        ],
      },
    },
  };

  it('successful search returns tracks array', async () => {
    mockApi.mockResolvedValueOnce(songsResponse);
    const searchCatalog = await loadModule();
    const tracks = await searchCatalog('test query', 5);

    expect(tracks).toEqual([
      { id: 's1', name: 'Song One', artistName: 'Artist A' },
      { id: 's2', name: 'Song Two', artistName: 'Artist B' },
    ]);
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(mockApi.mock.calls[0][0]).toContain('/v1/catalog/us/search');
    expect(mockApi.mock.calls[0][0]).toContain('term=test+query');
  });

  it('cache hit returns cached data without API call', async () => {
    mockApi.mockResolvedValueOnce(songsResponse);
    const searchCatalog = await loadModule();

    const first = await searchCatalog('cached term', 5);
    const second = await searchCatalog('cached term', 5);

    expect(first).toEqual(second);
    expect(mockApi).toHaveBeenCalledTimes(1);
  });

  it('cache miss after TTL expires triggers refetch', async () => {
    const response2 = {
      results: {
        songs: {
          data: [{ id: 's3', attributes: { name: 'Song Three', artistName: 'Artist C' } }],
        },
      },
    };
    mockApi.mockResolvedValueOnce(songsResponse).mockResolvedValueOnce(response2);

    const searchCatalog = await loadModule();
    const first = await searchCatalog('expire term', 5);
    expect(first).toHaveLength(2);

    // SEARCH_CACHE_TTL_MS = 5 * 60 * 1000
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    const second = await searchCatalog('expire term', 5);
    expect(second).toEqual([{ id: 's3', name: 'Song Three', artistName: 'Artist C' }]);
    expect(mockApi).toHaveBeenCalledTimes(2);
  });

  it('API error throws with detail message via throwIfMusicKitError', async () => {
    mockApi.mockResolvedValueOnce({
      errors: [{ detail: 'Rate limit exceeded', status: '429' }],
    });

    const searchCatalog = await loadModule();
    await expect(searchCatalog('bad query')).rejects.toThrow(
      'Catalog search failed: Rate limit exceeded'
    );
  });

  it('cache eviction at max size removes oldest entries', async () => {
    const searchCatalog = await loadModule();

    // Fill cache to SEARCH_CACHE_MAX_SIZE (500): term-0 through term-499
    for (let i = 0; i < 500; i++) {
      mockApi.mockResolvedValueOnce({
        results: {
          songs: {
            data: [{ id: `id-${i}`, attributes: { name: `Song ${i}` } }],
          },
        },
      });
      await searchCatalog(`term-${i}`, 5);
    }
    expect(mockApi).toHaveBeenCalledTimes(500);

    // Add term-500 (501st entry). evictSearchCache runs with size=500 (<=500),
    // so no eviction yet. Cache now has 501 entries.
    mockApi.mockResolvedValueOnce({
      results: {
        songs: {
          data: [{ id: 'id-500', attributes: { name: 'Song 500' } }],
        },
      },
    });
    await searchCatalog('term-500', 5);
    expect(mockApi).toHaveBeenCalledTimes(501);

    // Add term-501 (new cache miss). evictSearchCache runs with size=501 (>500),
    // trims oldest entry (term-0) to bring size back to 500.
    mockApi.mockResolvedValueOnce({
      results: {
        songs: {
          data: [{ id: 'id-501', attributes: { name: 'Song 501' } }],
        },
      },
    });
    await searchCatalog('term-501', 5);
    expect(mockApi).toHaveBeenCalledTimes(502);

    // Now term-0 was evicted. Requesting it should trigger a new API call.
    mockApi.mockResolvedValueOnce({
      results: {
        songs: {
          data: [{ id: 'id-0-new', attributes: { name: 'Song 0 Refreshed' } }],
        },
      },
    });
    const refreshed = await searchCatalog('term-0', 5);
    expect(refreshed).toEqual([
      { id: 'id-0-new', name: 'Song 0 Refreshed', artistName: undefined },
    ]);
    expect(mockApi).toHaveBeenCalledTimes(503);
  });
});
