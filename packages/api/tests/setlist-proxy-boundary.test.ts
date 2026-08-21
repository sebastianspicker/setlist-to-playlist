import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ERROR, isErr, isOk } from '@repo/shared';
import { handleSetlistProxy } from '../src/routes/setlist/proxy';
import { fetchUncachedSetlist } from '../src/lib/setlistfm-request';

const originalApiKey = process.env.SETLISTFM_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.SETLISTFM_API_KEY;
  else process.env.SETLISTFM_API_KEY = originalApiKey;
  vi.unstubAllGlobals();
});

describe('setlist proxy boundary', () => {
  it('rejects malformed input before an upstream request', async () => {
    process.env.SETLISTFM_API_KEY = 'test-key';
    const result = await handleSetlistProxy('not an identifier');
    expect(isErr(result) && result.error.error.code).toBe(API_ERROR.BAD_REQUEST);
  });

  it('returns a validated upstream setlist without exposing transport details', async () => {
    process.env.SETLISTFM_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: '63de4613',
              eventDate: '23-08-1964',
              artist: { name: 'The Beatles' },
              set: [],
            })
          )
        )
      )
    );
    const result = await handleSetlistProxy('63de4613');
    expect(isOk(result) && result.value.body.id).toBe('63de4613');
  });

  it('uses only the fixed setlist.fm origin and sends the API key only upstream', async () => {
    const apiKey = 'test-key-not-for-urls';
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'ab12cd34',
            eventDate: '23-08-1964',
            artist: { name: 'Artist' },
            set: [],
          })
        )
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchUncachedSetlist('ab12cd34', apiKey, vi.fn())).resolves.toMatchObject({
      ok: true,
    });
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://api.setlist.fm/rest/1.0/setlist/ab12cd34');
    expect(String(url)).not.toContain(apiKey);
    expect(options).toMatchObject({
      redirect: 'manual',
      headers: { 'x-api-key': apiKey, Accept: 'application/json' },
    });
  });

  it('rejects redirects and malformed upstream failures without leaking the API key', async () => {
    const apiKey = 'test-key-not-for-errors';
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 302 })))
    );
    const redirect = await fetchUncachedSetlist('cd34ef56', apiKey, vi.fn());
    expect(redirect).toMatchObject({ ok: false, status: 502 });
    expect(JSON.stringify(redirect)).not.toContain(apiKey);

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error(`upstream ${apiKey}`)))
    );
    const malformed = await fetchUncachedSetlist('ef56ab78', apiKey, vi.fn());
    expect(malformed).toMatchObject({ ok: false, status: 502 });
    expect(JSON.stringify(malformed)).not.toContain(apiKey);
  });

  it('discards hostile upstream error bodies before returning a client error', async () => {
    const apiKey = 'test-key-in-hostile-body';
    process.env.SETLISTFM_API_KEY = apiKey;
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ message: apiKey }), { status: 400 }))
      )
    );

    const result = await handleSetlistProxy('ab12cd34');
    expect(isErr(result) && result.error.error.error).toBe('setlist.fm returned HTTP 400.');
    expect(JSON.stringify(result)).not.toContain(apiKey);
  });
});
