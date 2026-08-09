import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockNextRequest } from '../helpers/mock-request';

const mockHandleSetlistProxy = vi.fn();

vi.mock('@repo/api', () => ({
  handleSetlistProxy: (...args: unknown[]) => mockHandleSetlistProxy(...args),
}));

import { GET, OPTIONS } from '../../src/app/api/setlist/proxy/route';

describe('GET and OPTIONS /api/setlist/proxy rate limits, security, and preflight', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockHandleSetlistProxy.mockReset();
  });

  it('reports disabled per-client rate limiting when TRUST_PROXY is unset', async () => {
    mockHandleSetlistProxy.mockResolvedValue({
      ok: true,
      value: { body: { id: 'direct' } },
    });

    const request = mockNextRequest('http://localhost:3000/api/setlist/proxy?id=direct', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Policy')).toBe(
      'disabled-direct-no-trusted-client-key'
    );
    expect(response.headers.get('X-RateLimit-Remaining')).toBeNull();
  });

  it('rate limits by trusted forwarded IP when TRUST_PROXY=1', async () => {
    vi.stubEnv('TRUST_PROXY', '1');
    mockHandleSetlistProxy.mockResolvedValue({
      ok: true,
      value: { body: { id: 'limited' } },
    });

    let response: Response | null = null;
    for (let i = 0; i < 21; i++) {
      response = await GET(
        mockNextRequest(`http://localhost:3000/api/setlist/proxy?id=limited-${i}`, {
          headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' },
        })
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBeDefined();
    expect(response?.headers.get('X-RateLimit-Policy')).toBe('trusted-proxy');
    const body = await response!.json();
    expect(body.code).toBe('RATE_LIMIT');
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
