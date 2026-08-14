import { afterEach, describe, it, expect, vi } from 'vitest';
import { middleware } from '../middleware';
import { mockNextRequest } from './helpers/mock-request';

describe('CSP middleware', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function getHeaders() {
    const request = mockNextRequest('http://localhost:3000/');
    const response = middleware(request);
    return response.headers;
  }

  it('sets Content-Security-Policy header', () => {
    const headers = getHeaders();
    const csp = headers.get('Content-Security-Policy');
    expect(csp).toBeTruthy();
  });

  it('CSP includes default-src self', () => {
    const csp = getHeaders().get('Content-Security-Policy')!;
    expect(csp).toContain("default-src 'self'");
  });

  it('CSP allows MusicKit CDN in script-src', () => {
    const csp = getHeaders().get('Content-Security-Policy')!;
    expect(csp).toContain('https://js-cdn.music.apple.com');
  });

  it('CSP uses a nonce instead of unsafe-inline for scripts', () => {
    const headers = getHeaders();
    const nonce = headers.get('x-nonce');
    const csp = headers.get('Content-Security-Policy')!;

    expect(nonce).toBeTruthy();
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('CSP allows Apple Music API in connect-src', () => {
    const csp = getHeaders().get('Content-Security-Policy')!;
    expect(csp).toContain('https://api.music.apple.com');
  });

  it('CSP allows the configured HTTPS API origin', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.showtape.example');

    const csp = getHeaders().get('Content-Security-Policy')!;

    expect(csp).toContain(
      "connect-src 'self' https://api.music.apple.com https://api.showtape.example"
    );
  });

  it('CSP normalizes a padded configured API URL to its origin', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '  http://localhost:4000/api/v1?preview=true  ');

    const csp = getHeaders().get('Content-Security-Policy')!;

    expect(csp).toContain('http://localhost:4000');
    expect(csp).not.toContain('/api/v1');
  });

  it('omits a local HTTP API origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:4000/api');

    const csp = getHeaders().get('Content-Security-Policy')!;

    expect(csp).toContain("connect-src 'self' https://api.music.apple.com; frame-src 'none'");
    expect(csp).not.toContain('http://localhost:4000');
  });

  it('omits a malformed configured API URL from CSP', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://');

    const csp = getHeaders().get('Content-Security-Policy')!;

    expect(csp).toContain("connect-src 'self' https://api.music.apple.com; frame-src 'none'");
  });

  it.each([
    'http://api.showtape.example',
    'ftp://api.showtape.example',
    'https://api.showtape.example;script-src',
  ])('omits unsafe configured API URL %s from CSP', (apiUrl) => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', apiUrl);

    const csp = getHeaders().get('Content-Security-Policy')!;

    expect(csp).toContain("connect-src 'self' https://api.music.apple.com; frame-src 'none'");
    expect(csp).not.toContain(apiUrl);
  });

  it('CSP blocks frames and objects', () => {
    const csp = getHeaders().get('Content-Security-Policy')!;
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it('sets X-Content-Type-Options to nosniff', () => {
    expect(getHeaders().get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('sets X-Frame-Options to DENY', () => {
    expect(getHeaders().get('X-Frame-Options')).toBe('DENY');
  });

  it('sets Referrer-Policy', () => {
    expect(getHeaders().get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});
