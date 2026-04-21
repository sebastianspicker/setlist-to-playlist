import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/lib/config', () => ({
  API_BASE_URL: '',
  APPLE_MUSIC_APP_ID: 'test-app-id',
}));

vi.mock('../src/lib/musickit/token', () => ({
  fetchDeveloperToken: vi.fn(),
}));

import { fetchDeveloperToken } from '../src/lib/musickit/token';
const mockFetchDevToken = vi.mocked(fetchDeveloperToken);

function makeMockMusicKit(overrides?: Partial<{ configure: unknown; getInstance: unknown }>) {
  const instance = {
    authorize: vi.fn().mockResolvedValue('user-token'),
    unauthorize: vi.fn().mockResolvedValue(undefined),
    isAuthorized: true,
    storefrontId: 'us',
    music: { api: vi.fn() },
  };
  return {
    configure: overrides?.configure ?? vi.fn().mockReturnValue(instance),
    getInstance: overrides?.getInstance ?? vi.fn().mockReturnValue(instance),
    _instance: instance,
  };
}

describe('initMusicKit', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetchDevToken.mockReset();
    mockFetchDevToken.mockResolvedValue('dev-token-123');
    // Provide window so waitForMusicKit doesn't reject with "only runs in browser"
    if (typeof globalThis.window === 'undefined') {
      vi.stubGlobal('window', globalThis);
    }
    vi.stubGlobal('MusicKit', undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function loadModule() {
    const mod = await import('../src/lib/musickit/client');
    return mod;
  }

  it('first call configures MusicKit and returns instance', async () => {
    const mk = makeMockMusicKit();
    vi.stubGlobal('MusicKit', mk);

    const { initMusicKit } = await loadModule();
    const result = await initMusicKit();

    expect(mockFetchDevToken).toHaveBeenCalledOnce();
    expect(mk.configure).toHaveBeenCalledWith(
      expect.objectContaining({ developerToken: 'dev-token-123' })
    );
    expect(mk.getInstance).toHaveBeenCalledOnce();
    expect(result).toBe(mk._instance);
  });

  it('second call returns cached instance without reconfiguring', async () => {
    const mk = makeMockMusicKit();
    vi.stubGlobal('MusicKit', mk);

    const { initMusicKit } = await loadModule();
    const first = await initMusicKit();
    const second = await initMusicKit();

    expect(first).toBe(second);
    expect(mk.configure).toHaveBeenCalledOnce();
  });

  it('resets promise on configure failure so next call retries', async () => {
    const mk = makeMockMusicKit({
      configure: vi.fn().mockImplementation(() => {
        throw new Error('configure failed');
      }),
    });
    vi.stubGlobal('MusicKit', mk);

    const { initMusicKit } = await loadModule();

    await expect(initMusicKit()).rejects.toThrow('configure failed');

    // Fix configure for retry
    const instance = {
      authorize: vi.fn(),
      unauthorize: vi.fn(),
      isAuthorized: true,
      storefrontId: 'us',
      music: { api: vi.fn() },
    };
    mk.configure = vi.fn().mockReturnValue(instance);
    mk.getInstance = vi.fn().mockReturnValue(instance);

    const result = await initMusicKit();
    expect(result).toBe(instance);
    expect(mk.configure).toHaveBeenCalledOnce();
  });

  it('concurrent calls share the same promise', async () => {
    const mk = makeMockMusicKit();
    vi.stubGlobal('MusicKit', mk);

    const { initMusicKit } = await loadModule();
    const [a, b] = await Promise.all([initMusicKit(), initMusicKit()]);

    expect(a).toBe(b);
    expect(mk.configure).toHaveBeenCalledOnce();
  });

  it('throws when APPLE_MUSIC_APP_ID is missing', async () => {
    // Re-mock config with empty app ID
    vi.doMock('../src/lib/config', () => ({
      API_BASE_URL: '',
      APPLE_MUSIC_APP_ID: '',
    }));

    const { initMusicKit } = await import('../src/lib/musickit/client');
    await expect(initMusicKit()).rejects.toThrow('NEXT_PUBLIC_APPLE_MUSIC_APP_ID is required');
  });
});
