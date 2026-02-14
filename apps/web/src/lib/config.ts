/**
 * Web app configuration.
 * API base URL is used for Developer Token and setlist proxy requests.
 */

/**
 * Base URL for the backend API (dev-token, setlist proxy).
 * Set NEXT_PUBLIC_API_URL in .env (e.g. http://localhost:3000 for dev).
 * If unset, the app uses same-origin (empty string => relative URLs).
 * DCI-031: Trim whitespace so leading/trailing spaces do not produce invalid URLs.
 */
export const API_BASE_URL: string =
  typeof process.env.NEXT_PUBLIC_API_URL === "string" &&
  process.env.NEXT_PUBLIC_API_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/$/, "")
    : "";

/** Apple Music app ID for MusicKit (from Apple Developer). */
export const APPLE_MUSIC_APP_ID =
  process.env.NEXT_PUBLIC_APPLE_MUSIC_APP_ID ?? "";
