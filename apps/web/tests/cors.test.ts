import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAllowOrigin, corsHeaders, corsHeadersForOptions } from '../src/lib/cors';

/** Helper to create a minimal NextRequest-like object with the given origin header. */
function fakeRequest(origin: string | null) {
  const headers = new Headers();
  if (origin !== null) headers.set('origin', origin);
  return { headers } as unknown as import('next/server').NextRequest;
}

describe('getAllowOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the configured ALLOWED_ORIGIN when set', () => {
    vi.stubEnv('ALLOWED_ORIGIN', 'https://example.com');
    expect(getAllowOrigin('https://example.com')).toBe('https://example.com');
  });

  it('strips trailing slash from configured ALLOWED_ORIGIN (DCI-062)', () => {
    vi.stubEnv('ALLOWED_ORIGIN', 'https://example.com/');
    expect(getAllowOrigin('https://example.com')).toBe('https://example.com');
  });

  it('returns localhost origin when ALLOWED_ORIGIN is unset', () => {
    vi.stubEnv('ALLOWED_ORIGIN', '');
    expect(getAllowOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('returns 127.0.0.1 origin when ALLOWED_ORIGIN is unset', () => {
    vi.stubEnv('ALLOWED_ORIGIN', '');
    expect(getAllowOrigin('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
  });

  it('returns null for external origin when ALLOWED_ORIGIN is unset', () => {
    vi.stubEnv('ALLOWED_ORIGIN', '');
    expect(getAllowOrigin('https://evil.com')).toBeNull();
  });

  it('rejects wildcard "*" (DCI-002)', () => {
    vi.stubEnv('ALLOWED_ORIGIN', '*');
    expect(getAllowOrigin('https://anything.com')).toBeNull();
  });

  it('returns null when incoming origin is null', () => {
    vi.stubEnv('ALLOWED_ORIGIN', '');
    expect(getAllowOrigin(null)).toBeNull();
  });

  it('returns null when incoming origin is the string "null"', () => {
    vi.stubEnv('ALLOWED_ORIGIN', '');
    expect(getAllowOrigin('null')).toBeNull();
  });

  it('uses only the first origin from a comma-separated ALLOWED_ORIGIN (DCI-037)', () => {
    vi.stubEnv('ALLOWED_ORIGIN', 'https://first.com, https://second.com');
    expect(getAllowOrigin('https://first.com')).toBe('https://first.com');
  });

  it('returns null when ALLOWED_ORIGIN is configured as "null"', () => {
    vi.stubEnv('ALLOWED_ORIGIN', 'null');
    expect(getAllowOrigin('http://localhost:3000')).toBeNull();
  });
});

describe('corsHeaders', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('includes Content-Type and Access-Control-Allow-Origin for allowed origin', () => {
    vi.stubEnv('ALLOWED_ORIGIN', 'https://example.com');
    const headers = corsHeaders(fakeRequest('https://example.com'));
    expect(headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://example.com',
      })
    );
  });

  it('omits Access-Control-Allow-Origin when origin is not allowed', () => {
    vi.stubEnv('ALLOWED_ORIGIN', '');
    const headers = corsHeaders(fakeRequest('https://evil.com'));
    expect(headers).toEqual({ 'Content-Type': 'application/json' });
    expect(headers).not.toHaveProperty('Access-Control-Allow-Origin');
  });

  it('uses custom contentType when provided', () => {
    vi.stubEnv('ALLOWED_ORIGIN', '');
    const headers = corsHeaders(fakeRequest(null), 'text/plain');
    expect(headers).toEqual(expect.objectContaining({ 'Content-Type': 'text/plain' }));
  });
});

describe('corsHeadersForOptions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('includes preflight headers for allowed origin (DCI-054)', () => {
    vi.stubEnv('ALLOWED_ORIGIN', 'https://example.com');
    const headers = corsHeadersForOptions(fakeRequest('https://example.com'));
    expect(headers).toEqual(
      expect.objectContaining({
        'Access-Control-Allow-Origin': 'https://example.com',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
    );
  });

  it('returns empty headers when origin is not allowed', () => {
    vi.stubEnv('ALLOWED_ORIGIN', '');
    const headers = corsHeadersForOptions(fakeRequest('https://evil.com'));
    expect(headers).toEqual({});
  });
});
