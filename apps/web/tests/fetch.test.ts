import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchJson } from '../src/lib/fetch';

function streamResponse(body: string, status = 200): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/** Helper to create a minimal Response-like object for mocking fetch. */
function fakeResponse(
  body: unknown,
  options: {
    status?: number;
    ok?: boolean;
    contentLength?: string | null;
    jsonFails?: boolean;
  } = {}
) {
  const {
    status = 200,
    ok = status >= 200 && status < 300,
    contentLength = null,
    jsonFails = false,
  } = options;
  const headers = new Headers();
  if (contentLength !== null) headers.set('Content-Length', contentLength);
  const bodyStr = JSON.stringify(body);
  return {
    ok,
    status,
    headers,
    text: jsonFails ? () => Promise.resolve('not json{{{') : () => Promise.resolve(bodyStr),
    json: jsonFails
      ? () => Promise.reject(new SyntaxError('Unexpected token'))
      : () => Promise.resolve(body),
  } as unknown as Response;
}

describe('fetchJson', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns ok result for successful JSON response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse({ name: 'test' })));

    const result = await fetchJson<{ name: string }>('https://api.example.com/data');

    expect(result).toEqual({ ok: true, value: { name: 'test' } });
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/data', undefined);
  });

  it('returns error with message from JSON error body on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse({ error: 'Not found' }, { status: 404 }))
    );

    const result = await fetchJson('https://api.example.com/missing');

    expect(result).toEqual({ ok: false, error: 'Not found' });
  });

  it('returns generic error when HTTP error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(null, { status: 404, jsonFails: true }))
    );

    const result = await fetchJson('https://api.example.com/missing');

    expect(result).toEqual({ ok: false, error: 'Invalid response (non-JSON).' });
  });

  it('returns error when response exceeds MAX_JSON_RESPONSE_BYTES (DCI-004)', async () => {
    const hugeSize = String(11 * 1024 * 1024); // 11 MiB > 10 MiB limit
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse({}, { contentLength: hugeSize }))
    );

    const result = await fetchJson('https://api.example.com/huge');

    expect(result).toEqual({ ok: false, error: 'Response too large.' });
  });

  it('allows response at exactly MAX_JSON_RESPONSE_BYTES', async () => {
    const exactSize = String(10 * 1024 * 1024); // exactly 10 MiB
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse({ data: 'ok' }, { contentLength: exactSize }))
    );

    const result = await fetchJson('https://api.example.com/exact');

    expect(result).toEqual({ ok: true, value: { data: 'ok' } });
  });

  it('returns error on network failure (fetch throws)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fetchJson('https://api.example.com/down')).rejects.toThrow('Failed to fetch');
  });

  it('returns error when successful response body contains an error field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse({ error: 'Something went wrong' }, { status: 200 }))
    );

    const result = await fetchJson('https://api.example.com/data');

    expect(result).toEqual({ ok: false, error: 'Something went wrong' });
  });

  it('returns fallback error message for HTTP error with non-string error field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse({ error: 42 }, { status: 500 })));

    const result = await fetchJson('https://api.example.com/fail');

    expect(result).toEqual({ ok: false, error: 'Request failed (500)' });
  });

  it('returns error for oversized streamed responses without Content-Length', async () => {
    const oversizedJson = JSON.stringify({ data: 'x'.repeat(10 * 1024 * 1024) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse(oversizedJson)));

    const result = await fetchJson('https://api.example.com/chunked');

    expect(result).toEqual({ ok: false, error: 'Response too large.' });
  });
});
