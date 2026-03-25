import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockNextRequest } from '../helpers/mock-request';

const mockHandleSetlistProxy = vi.fn();

vi.mock('api', () => ({
  handleSetlistProxy: (...args: unknown[]) => mockHandleSetlistProxy(...args),
}));

import { GET, OPTIONS } from '../../src/app/api/setlist/proxy/route';

describe('GET /api/setlist/proxy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockHandleSetlistProxy.mockReset();
  });

  it('returns 400 when id query param is missing', async () => {
    const request = mockNextRequest('http://localhost:3000/api/setlist/proxy');
    const response = await GET(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toEqual({ error: 'Missing id or url query parameter.' });
  });

  it('returns 400 when id is empty string', async () => {
    const request = mockNextRequest('http://localhost:3000/api/setlist/proxy?id=');
    const response = await GET(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toEqual({ error: 'Missing id or url query parameter.' });
  });

  it('returns 400 when input exceeds MAX_SETLIST_INPUT_LENGTH', async () => {
    const longId = 'a'.repeat(2001);
    const request = mockNextRequest(`http://localhost:3000/api/setlist/proxy?id=${longId}`);
    const response = await GET(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toMatch(/too long/i);
  });

  it('returns 200 with setlist JSON for valid id', async () => {
    const setlistData = { id: '63de4613', artist: { name: 'Radiohead' }, sets: {} };
    mockHandleSetlistProxy.mockResolvedValue({
      ok: true,
      value: { body: setlistData },
    });

    const request = mockNextRequest('http://localhost:3000/api/setlist/proxy?id=63de4613');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual(setlistData);
    expect(mockHandleSetlistProxy).toHaveBeenCalledWith('63de4613');
  });

  it('returns Cache-Control private for successful response', async () => {
    mockHandleSetlistProxy.mockResolvedValue({
      ok: true,
      value: { body: { id: 'abc' } },
    });

    const request = mockNextRequest('http://localhost:3000/api/setlist/proxy?id=abc');
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600');
  });

  it('returns no-store Cache-Control for error response', async () => {
    const request = mockNextRequest('http://localhost:3000/api/setlist/proxy');
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('accepts url query param as alternative to id', async () => {
    const setlistData = { id: '63de4613' };
    mockHandleSetlistProxy.mockResolvedValue({
      ok: true,
      value: { body: setlistData },
    });

    const request = mockNextRequest(
      'http://localhost:3000/api/setlist/proxy?url=https://www.setlist.fm/setlist/63de4613.html'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockHandleSetlistProxy).toHaveBeenCalledWith(
      'https://www.setlist.fm/setlist/63de4613.html'
    );
  });

  it('forwards error from handleSetlistProxy', async () => {
    mockHandleSetlistProxy.mockResolvedValue({
      ok: false,
      error: {
        status: 400,
        error: { error: 'Invalid setlist ID or URL.', code: 'BAD_REQUEST' },
      },
    });

    const request = mockNextRequest('http://localhost:3000/api/setlist/proxy?id=invalid');
    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it('returns 500 when handleSetlistProxy throws', async () => {
    mockHandleSetlistProxy.mockRejectedValue(new Error('Unexpected failure'));

    const request = mockNextRequest('http://localhost:3000/api/setlist/proxy?id=63de4613');
    const response = await GET(request);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.code).toBe('INTERNAL');
  });

  it('includes security headers on all responses', async () => {
    const request = mockNextRequest('http://localhost:3000/api/setlist/proxy');
    const response = await GET(request);

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });
});

describe('OPTIONS /api/setlist/proxy', () => {
  it('returns 204', async () => {
    const request = mockNextRequest('http://localhost:3000/api/setlist/proxy', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3000' },
    });
    const response = await OPTIONS(request);

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });
});
