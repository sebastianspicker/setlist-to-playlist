import { API_BASE_URL } from "./config";

/**
 * Base path for API routes (same app: /api, or empty when using API_BASE_URL with trailing path).
 */
const API_PATH = "/api";

/**
 * Full URL for an API route. Uses API_BASE_URL when set (e.g. separate API server), otherwise same-origin (API_PATH).
 * DCI-024: Strip trailing /api from base so URLs like http://example.com/api do not become .../api/api/...
 */
export function apiUrl(path: string): string {
  const raw = API_BASE_URL || "";
  const base = raw.replace(/\/$/, "").replace(/\/api$/i, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const apiSegment = "/api";
  if (base) return `${base}${apiSegment}${p}`;
  return `${API_PATH}${p}`;
}

/** Returns the full URL for the Apple Developer Token endpoint. */
export const devTokenUrl = () => apiUrl("/apple/dev-token");

/**
 * Returns the full URL for the Setlist.fm proxy endpoint.
 * @param query Optional query string (e.g. `setlistId=...`)
 */
export const setlistProxyUrl = (query?: string) =>
  apiUrl("/setlist/proxy") + (query ? `?${query}` : "");

/** Returns the full URL for the API health check endpoint. */
export const healthUrl = () => apiUrl("/health");
