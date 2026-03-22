import { NextRequest } from 'next/server';

/**
 * Build a mock NextRequest for route-handler integration tests.
 *
 * Uses the real NextRequest constructor so `.nextUrl.searchParams`, `.headers`,
 * and `.method` all behave identically to production.
 */
export function mockNextRequest(
  url: string,
  options?: { method?: string; headers?: Record<string, string> }
): NextRequest {
  const { method = 'GET', headers } = options ?? {};
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: headers ? new Headers(headers) : undefined,
  });
}
