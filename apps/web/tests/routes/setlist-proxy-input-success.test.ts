import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockNextRequest } from '../helpers/mock-request';

const mockHandleSetlistProxy = vi.fn();

vi.mock('@repo/api', () => ({
  handleSetlistProxy: (...args: unknown[]) => mockHandleSetlistProxy(...args),
}));

import { GET } from '../../src/app/api/setlist/proxy/route';

describe('GET /api/setlist/proxy input and successful responses', () => {
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

  it('uses a valid url when id is blank', async () => {
    mockHandleSetlistProxy.mockResolvedValue({
      ok: true,
      value: { body: { id: '63de4613' } },
    });

    const request = mockNextRequest(
      'http://localhost:3000/api/setlist/proxy?id=&url=https://www.setlist.fm/setlist/63de4613.html'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockHandleSetlistProxy).toHaveBeenCalledWith(
      'https://www.setlist.fm/setlist/63de4613.html'
    );
  });

  it('prefers id when id and url are both populated', async () => {
    mockHandleSetlistProxy.mockResolvedValue({
      ok: true,
      value: { body: { id: '63de4613' } },
    });

    const request = mockNextRequest(
      'http://localhost:3000/api/setlist/proxy?id=63de4613&url=https://www.setlist.fm/setlist/other.html'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockHandleSetlistProxy).toHaveBeenCalledWith('63de4613');
  });
});
