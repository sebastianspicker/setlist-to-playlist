import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockNextRequest } from '../helpers/mock-request';

vi.mock('api', () => ({
  handleHealth: () => ({ status: 'ok', timestamp: '2025-01-01T00:00:00.000Z' }),
}));

import { GET, OPTIONS } from '../../src/app/api/health/route';

describe('GET /api/health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns 200 with { status, timestamp }', async () => {
    const request = mockNextRequest('http://localhost:3000/api/health');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ status: 'ok', timestamp: '2025-01-01T00:00:00.000Z' });
  });

  it('includes security headers', async () => {
    const request = mockNextRequest('http://localhost:3000/api/health');
    const response = await GET(request);

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('includes CORS header for localhost origin', async () => {
    const request = mockNextRequest('http://localhost:3000/api/health', {
      headers: { origin: 'http://localhost:3000' },
    });
    const response = await GET(request);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });
});

describe('OPTIONS /api/health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns 204 with no body', async () => {
    const request = mockNextRequest('http://localhost:3000/api/health', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3000' },
    });
    const response = await OPTIONS(request);

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it('includes CORS preflight headers for allowed origin', async () => {
    const request = mockNextRequest('http://localhost:3000/api/health', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3000' },
    });
    const response = await OPTIONS(request);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
  });
});
