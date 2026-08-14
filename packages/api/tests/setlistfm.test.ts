import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchSetlistFromApi } from '../src/lib/setlistfm.js';
import { getRetryDelayMs } from '../src/lib/setlistfm-retry.js';

function streamResponse(
  body: string,
  init: { status?: number; headers?: HeadersInit } = {}
): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }),
    {
      status: init.status ?? 200,
      headers: init.headers,
    }
  );
}

function failedStreamResponse(status: number): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new Error('stream failed'));
      },
    }),
    { status }
  );
}

function validSetlistBody(id: string) {
  return {
    id,
    eventDate: '23-08-1964',
    artist: { name: 'Band' },
    set: [],
    url: `https://www.setlist.fm/setlist/band/show-${id}.html`,
  };
}

describe('fetchSetlistFromApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not follow upstream redirects with the API credential', async () => {
    const redirectTarget = 'https://untrusted.example/collect';
    const fetchMock = vi.fn().mockResolvedValue(
      streamResponse(JSON.stringify({ message: 'Moved temporarily' }), {
        status: 302,
        headers: { Location: redirectTarget },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSetlistFromApi('63de0000', 'test-key')).resolves.toEqual({
      ok: false,
      status: 502,
      message: 'Invalid setlist.fm upstream redirect.',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-api-key': 'test-key' }),
        redirect: 'manual',
      })
    );
  });

  it('rejects oversized streamed upstream responses without Content-Length', async () => {
    const oversizedJson = JSON.stringify({ data: 'x'.repeat(10 * 1024 * 1024) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse(oversizedJson)));

    const result = await fetchSetlistFromApi('63de9999', 'test-key');

    expect(result).toEqual({
      ok: false,
      status: 502,
      message: 'setlist.fm response was too large.',
    });
  });

  it.each([200, 500])(
    'returns a structured 502 when a %i response body read fails',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failedStreamResponse(status)));

      await expect(fetchSetlistFromApi(`63de${status}`, 'test-key')).resolves.toEqual({
        ok: false,
        status: 502,
        message: 'Invalid response from setlist.fm.',
      });
    }
  );

  it('respects Retry-After before retrying 429 responses', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        streamResponse(JSON.stringify({ message: 'Too Many Requests' }), {
          status: 429,
          headers: { 'Retry-After': '2', 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        streamResponse(JSON.stringify(validSetlistBody('63de1111')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const pending = fetchSetlistFromApi('63de1111', 'test-key');
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      body: validSetlistBody('63de1111'),
    });
  });

  it('adds bounded jitter to the default retry delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(getRetryDelayMs(new Response(null, { status: 429 }))).toBe(1050);
  });

  it('caps huge numeric Retry-After values before retrying', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        streamResponse(JSON.stringify({ message: 'Too Many Requests' }), {
          status: 429,
          headers: { 'Retry-After': '999999', 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        streamResponse(JSON.stringify(validSetlistBody('63de2222')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const pending = fetchSetlistFromApi('63de2222', 'test-key');
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      body: validSetlistBody('63de2222'),
    });
  });

  it('caps future HTTP-date Retry-After values before retrying', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-17T10:00:00Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        streamResponse(JSON.stringify({ message: 'Too Many Requests' }), {
          status: 429,
          headers: {
            'Retry-After': new Date('2026-05-17T10:01:00Z').toUTCString(),
            'Content-Type': 'application/json',
          },
        })
      )
      .mockResolvedValueOnce(
        streamResponse(JSON.stringify(validSetlistBody('63de3333')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const pending = fetchSetlistFromApi('63de3333', 'test-key');
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      body: validSetlistBody('63de3333'),
    });
  });

  it('allows zero Retry-After values to retry immediately', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        streamResponse(JSON.stringify({ message: 'Too Many Requests' }), {
          status: 429,
          headers: { 'Retry-After': '0', 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        streamResponse(JSON.stringify(validSetlistBody('63de4444')), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const pending = fetchSetlistFromApi('63de4444', 'test-key');
    await vi.advanceTimersByTimeAsync(0);
    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      body: validSetlistBody('63de4444'),
    });
  });

  it.each([
    ['negative', '-5'],
    ['malformed', 'not-a-retry-date'],
  ])('uses default backoff for %s Retry-After values', async (_caseName, retryAfter) => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const setlistId = retryAfter === '-5' ? '63de5555' : '63de6666';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        streamResponse(JSON.stringify({ message: 'Too Many Requests' }), {
          status: 429,
          headers: { 'Retry-After': retryAfter, 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        streamResponse(JSON.stringify(validSetlistBody(setlistId)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const pending = fetchSetlistFromApi(setlistId, 'test-key');
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      body: validSetlistBody(setlistId),
    });
  });

  it('rejects a successful response with an incomplete setlist schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          streamResponse(JSON.stringify({ id: '63de7777', artist: { name: 'Band' } }))
        )
    );

    await expect(fetchSetlistFromApi('63de7777', 'test-key')).resolves.toEqual({
      ok: false,
      status: 502,
      message: 'Invalid response from setlist.fm.',
    });
  });

  it('times out a stalled upstream request', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          })
      )
    );

    const pending = fetchSetlistFromApi('63de8888', 'test-key');
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(pending).resolves.toEqual({
      ok: false,
      status: 504,
      message: 'setlist.fm request timed out.',
    });
  });

  it('coalesces concurrent requests for the same setlist ID', async () => {
    let resolveResponse!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(response);
    vi.stubGlobal('fetch', fetchMock);

    const first = fetchSetlistFromApi('63de9998', 'test-key');
    const second = fetchSetlistFromApi('63de9998', 'test-key');
    expect(fetchMock).toHaveBeenCalledOnce();

    resolveResponse(streamResponse(JSON.stringify(validSetlistBody('63de9998'))));
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toEqual(secondResult);
    expect(firstResult).toEqual({ ok: true, body: validSetlistBody('63de9998') });
  });
});
