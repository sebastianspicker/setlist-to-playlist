import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchSetlistFromApi } from '../src/lib/setlistfm.js';

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

describe('fetchSetlistFromApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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
        streamResponse(JSON.stringify({ id: '63de1111', artist: { name: 'Band' } }), {
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
      body: { id: '63de1111', artist: { name: 'Band' } },
    });
  });
});
