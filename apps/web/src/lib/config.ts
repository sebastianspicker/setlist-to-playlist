/**
 * Base URL for the backend API (dev-token, setlist proxy).
 * Leave NEXT_PUBLIC_API_URL unset for same-origin (default).
 * DCI-031: Trim whitespace so leading/trailing spaces do not produce invalid URLs.
 */
export const API_BASE_URL: string =
  typeof process.env.NEXT_PUBLIC_API_URL === 'string' &&
  process.env.NEXT_PUBLIC_API_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/$/, '')
    : '';

/** Apple Music app ID for MusicKit (from Apple Developer). */
export const APPLE_MUSIC_APP_ID = process.env.NEXT_PUBLIC_APPLE_MUSIC_APP_ID ?? '';
