import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockNextRequest } from '../helpers/mock-request';

const mockHandleDevToken = vi.fn();

vi.mock('@repo/api', () => ({
  handleDevToken: () => mockHandleDevToken(),
}));

import { GET, OPTIONS } from '../../src/app/api/apple/dev-token/route';

describe('GET and OPTIONS /api/apple/dev-token rate limits and preflight', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockHandleDevToken.mockReset();
  });

  it('reports disabled per-client rate limiting when TRUST_PROXY is unset', async () => {
    mockHandleDevToken.mockResolvedValue({ token: 'test-token' });

    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token', {
      headers: { 'x-forwarded-for': '203.0.113.20' },
    });
    const response = await GET(request);

    expect(response.headers.get('X-RateLimit-Policy')).toBe(
      'disabled-direct-no-trusted-client-key'
    );
    expect(response.headers.get('X-RateLimit-Remaining')).toBeNull();
  });

  it('rate limits by trusted forwarded IP when TRUST_PROXY=1', async () => {
    vi.stubEnv('TRUST_PROXY', '1');
    mockHandleDevToken.mockResolvedValue({ token: 'test-token' });

    let response: Response | null = null;
    for (let i = 0; i < 31; i++) {
      response = await GET(
        mockNextRequest('http://localhost:3000/api/apple/dev-token', {
          headers: { 'x-forwarded-for': '198.51.100.9, 10.0.0.1' },
        })
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBeDefined();
    expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response?.headers.get('X-RateLimit-Policy')).toBe('trusted-proxy');
    const body = await response!.json();
    expect(body.code).toBe('RATE_LIMIT');
  });
});

describe('OPTIONS /api/apple/dev-token', () => {
  it('returns 204 with no body', async () => {
    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3000' },
    });
    const response = await OPTIONS(request);

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it('includes CORS preflight headers for allowed origin', async () => {
    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3000' },
    });
    const response = await OPTIONS(request);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
  });
});
