import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';

describe('CSP boundary', () => {
  it('uses a per-response nonce and excludes unsafe inline scripts', () => {
    const response = middleware(new NextRequest('http://localhost:3000/'));
    const nonce = response.headers.get('x-nonce');
    const csp = response.headers.get('Content-Security-Policy') ?? '';
    expect(nonce).toBeTruthy();
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('does not permit a local HTTP API origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:4000');
    const csp =
      middleware(new NextRequest('http://localhost:3000/')).headers.get(
        'Content-Security-Policy'
      ) ?? '';
    expect(csp).not.toContain('http://localhost:4000');
    vi.unstubAllEnvs();
  });
});
