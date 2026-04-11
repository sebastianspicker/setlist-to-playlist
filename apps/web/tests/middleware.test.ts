import { describe, it, expect } from 'vitest';
import { middleware } from '../middleware';
import { mockNextRequest } from './helpers/mock-request';

describe('CSP middleware', () => {
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

  it('CSP allows Apple Music API in connect-src', () => {
    const csp = getHeaders().get('Content-Security-Policy')!;
    expect(csp).toContain('https://api.music.apple.com');
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
