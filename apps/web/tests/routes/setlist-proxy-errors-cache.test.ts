import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockNextRequest } from '../helpers/mock-request';

const mockHandleSetlistProxy = vi.fn();

vi.mock('@repo/api', () => ({
  handleSetlistProxy: (...args: unknown[]) => mockHandleSetlistProxy(...args),
}));

import { GET } from '../../src/app/api/setlist/proxy/route';

describe('GET /api/setlist/proxy errors and cache headers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockHandleSetlistProxy.mockReset();
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
});
