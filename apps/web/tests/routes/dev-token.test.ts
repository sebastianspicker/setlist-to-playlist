import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockNextRequest } from '../helpers/mock-request';

const mockHandleDevToken = vi.fn();

vi.mock('api', () => ({
  handleDevToken: () => mockHandleDevToken(),
}));

import { GET, OPTIONS } from '../../src/app/api/apple/dev-token/route';

describe('GET /api/apple/dev-token', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockHandleDevToken.mockReset();
  });

  it('returns 200 with { token } when credentials are valid', async () => {
    mockHandleDevToken.mockResolvedValue({ token: 'eyJhbGciOiJFUzI1NiJ9.test.signature' });

    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ token: 'eyJhbGciOiJFUzI1NiJ9.test.signature' });
  });

  it('returns 503 when env vars are missing', async () => {
    mockHandleDevToken.mockResolvedValue({
      error:
        'Missing env var(s): APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY. Copy .env.example to .env and fill them in.',
    });

    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token');
    const response = await GET(request);

    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.error).toMatch(/Missing env var\(s\):/);
    expect(body.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('returns 503 when token signing fails', async () => {
    mockHandleDevToken.mockResolvedValue({
      error: 'Token signing failed. Check server configuration and logs.',
    });

    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token');
    const response = await GET(request);

    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.error).toMatch(/signing failed/i);
  });

  it('includes Cache-Control: no-store', async () => {
    mockHandleDevToken.mockResolvedValue({ token: 'test-token' });

    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token');
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('includes Pragma: no-cache', async () => {
    mockHandleDevToken.mockResolvedValue({ token: 'test-token' });

    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token');
    const response = await GET(request);

    expect(response.headers.get('Pragma')).toBe('no-cache');
  });

  it('includes X-RateLimit-Remaining header', async () => {
    mockHandleDevToken.mockResolvedValue({ token: 'test-token' });

    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token');
    const response = await GET(request);

    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
  });

  it('includes security headers', async () => {
    mockHandleDevToken.mockResolvedValue({ token: 'test-token' });

    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token');
    const response = await GET(request);

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('returns 500 when handleDevToken throws', async () => {
    mockHandleDevToken.mockRejectedValue(new Error('Unexpected crash'));

    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token');
    const response = await GET(request);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.code).toBe('INTERNAL');
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
