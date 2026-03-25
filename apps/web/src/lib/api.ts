import { API_BASE_URL } from './config';

/** Base path for API routes (same app: /api, or empty when using API_BASE_URL with trailing path). */
const API_PATH = '/api';

/**
 * Full URL for an API route. Uses API_BASE_URL when set (e.g. separate API server), otherwise same-origin.
 * Strips trailing /api from base so URLs like http://example.com/api do not become .../api/api/...
 */
export function apiUrl(path: string): string {
  const raw = API_BASE_URL || '';
  const base = raw.replace(/\/$/, '').replace(/\/api$/i, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  if (base) return `${base}${API_PATH}${p}`;
  return `${API_PATH}${p}`;
}

/** Returns the full URL for the Apple Developer Token endpoint. */
export const devTokenUrl = () => apiUrl('/apple/dev-token');

/**
 * Returns the full URL for the Setlist.fm proxy endpoint.
 * @param query Optional query string (e.g. `setlistId=...`)
 */
export const setlistProxyUrl = (query?: string) =>
  apiUrl('/setlist/proxy') + (query ? `?${query}` : '');
