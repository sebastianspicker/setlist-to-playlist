import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../src/lib/config', () => ({
  get API_BASE_URL() {
    return (globalThis as Record<string, unknown>).__TEST_API_BASE_URL__ ?? '';
  },
  APPLE_MUSIC_APP_ID: '',
}));

import { apiUrl, devTokenUrl, setlistProxyUrl } from '../src/lib/api';

/** Helper to set the mocked API_BASE_URL value for the current test. */
function setApiBaseUrl(value: string) {
  (globalThis as Record<string, unknown>).__TEST_API_BASE_URL__ = value;
}

describe('apiUrl', () => {
  afterEach(() => {
    setApiBaseUrl('');
  });

  it('returns /api/path when API_BASE_URL is not set', () => {
    setApiBaseUrl('');
    expect(apiUrl('/search')).toBe('/api/search');
  });

  it('returns base/api/path when API_BASE_URL is set', () => {
    setApiBaseUrl('https://backend.example.com');
    expect(apiUrl('/search')).toBe('https://backend.example.com/api/search');
  });

  it('strips trailing /api from API_BASE_URL to avoid double /api/api (DCI-024)', () => {
    setApiBaseUrl('https://backend.example.com/api');
    expect(apiUrl('/search')).toBe('https://backend.example.com/api/search');
  });

  it('strips trailing slash from API_BASE_URL', () => {
    setApiBaseUrl('https://backend.example.com/');
    expect(apiUrl('/search')).toBe('https://backend.example.com/api/search');
  });

  it('prepends / to path when missing', () => {
    setApiBaseUrl('');
    expect(apiUrl('search')).toBe('/api/search');
  });
});

describe('devTokenUrl', () => {
  afterEach(() => {
    setApiBaseUrl('');
  });

  it('returns /api/apple/dev-token by default', () => {
    setApiBaseUrl('');
    expect(devTokenUrl()).toBe('/api/apple/dev-token');
  });

  it('uses API_BASE_URL when set', () => {
    setApiBaseUrl('https://backend.example.com');
    expect(devTokenUrl()).toBe('https://backend.example.com/api/apple/dev-token');
  });
});

describe('setlistProxyUrl', () => {
  afterEach(() => {
    setApiBaseUrl('');
  });

  it('returns /api/setlist/proxy by default', () => {
    setApiBaseUrl('');
    expect(setlistProxyUrl()).toBe('/api/setlist/proxy');
  });

  it('appends query string when provided', () => {
    setApiBaseUrl('');
    expect(setlistProxyUrl('setlistId=abc123')).toBe('/api/setlist/proxy?setlistId=abc123');
  });

  it('returns bare path when query is undefined', () => {
    setApiBaseUrl('');
    expect(setlistProxyUrl(undefined)).toBe('/api/setlist/proxy');
  });
});
