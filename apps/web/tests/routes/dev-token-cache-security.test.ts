import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockNextRequest } from '../helpers/mock-request';

const mockHandleDevToken = vi.fn();

vi.mock('@repo/api', () => ({
  handleDevToken: () => mockHandleDevToken(),
}));

import { GET } from '../../src/app/api/apple/dev-token/route';

describe('GET /api/apple/dev-token cache and security headers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockHandleDevToken.mockReset();
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

  it('includes security headers', async () => {
    mockHandleDevToken.mockResolvedValue({ token: 'test-token' });

    const request = mockNextRequest('http://localhost:3000/api/apple/dev-token');
    const response = await GET(request);

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });
});
