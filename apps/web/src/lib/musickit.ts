/**
 * MusicKit JS integration: fetch dev token, configure, authorize, catalog search.
 * MusicKit script must be loaded (e.g. in layout) before use.
 */

import { devTokenUrl } from "./api";
import { APPLE_MUSIC_APP_ID } from "./config";

interface MusicKitGlobal {
  configure(options: MusicKitConfigureOptions): Promise<MusicKitInstance> | MusicKitInstance | void;
  getInstance(): MusicKitInstance;
}

declare global {
  interface Window {
    MusicKit?: MusicKitGlobal;
  }
}

interface MusicKitConfigureOptions {
  developerToken: string;
  app: { name: string; build: string };
  appId?: string;
  storefrontId?: string;
}

interface MusicKitInstance {
  authorize(): Promise<string>;
  unauthorize(): Promise<void>;
  isAuthorized: boolean;
  storefrontId: string;
  music: {
    api: (path: string, options?: { method?: string; data?: unknown }) => Promise<unknown>;
  };
}

export interface AppleMusicTrack {
  id: string;
  name: string;
  artistName?: string;
}

/** DCI-012: Token cache with expiry (server token is 1h; refresh 5min before). */
const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function isTokenValid(): boolean {
  return typeof cachedToken === "string" && Date.now() < tokenExpiresAt;
}

/** Fetch Developer Token from our API; cache in memory with TTL. DCI-021: guard res.json(). */
export async function fetchDeveloperToken(): Promise<string> {
  if (isTokenValid()) return cachedToken!;
  cachedToken = null;
  tokenExpiresAt = 0;
  const res = await fetch(devTokenUrl());
  let data: { token?: string; error?: string };
  try {
    data = (await res.json()) as { token?: string; error?: string };
  } catch {
    throw new Error("Invalid response from Developer Token API (non-JSON).");
  }
  if (!res.ok || data.error || !data.token) {
    throw new Error(data.error ?? "Failed to get Developer Token");
  }
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
  return cachedToken;
}

/** Wait for MusicKit script to be available. */
function waitForMusicKit(): Promise<MusicKitGlobal> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("MusicKit only runs in the browser"));
      return;
    }
    if (window.MusicKit) {
      resolve(window.MusicKit);
      return;
    }
    const check = setInterval(() => {
      if (window.MusicKit) {
        clearInterval(check);
        resolve(window.MusicKit);
      }
    }, 50);
    setTimeout(() => {
      clearInterval(check);
      reject(new Error("MusicKit script did not load"));
    }, 10000);
  });
}

let configuredInstance: MusicKitInstance | null = null;

/**
 * Configure MusicKit with Developer Token and app ID.
 * Call once before authorize or search. Fetches token from API if needed.
 * DCI-007: appId is required; throw with clear message when unset.
 */
export async function initMusicKit(): Promise<MusicKitInstance> {
  if (configuredInstance) return configuredInstance;
  if (!APPLE_MUSIC_APP_ID || APPLE_MUSIC_APP_ID.trim() === "") {
    throw new Error(
      "NEXT_PUBLIC_APPLE_MUSIC_APP_ID is required for MusicKit. Set it in your environment (see .env.example)."
    );
  }
  const token = await fetchDeveloperToken();
  const MusicKit = await waitForMusicKit();
  const configureResult = MusicKit.configure({
    developerToken: token,
    app: { name: "Setlist to Playlist", build: "1" },
    appId: APPLE_MUSIC_APP_ID,
  });
  if (configureResult && typeof (configureResult as Promise<unknown>).then === "function") {
    await (configureResult as Promise<MusicKitInstance>);
  }
  configuredInstance = MusicKit.getInstance();
  return configuredInstance;
}

/** Get the configured MusicKit instance; throws if not configured. */
export function getMusicKitInstance(): MusicKitInstance {
  if (!configuredInstance) throw new Error("MusicKit not configured. Call initMusicKit() first.");
  return configuredInstance;
}

/**
 * Authorize the user with Apple Music (sign in).
 * Resolves with the user token on success.
 */
export async function authorizeMusicKit(): Promise<string> {
  const music = await initMusicKit();
  return music.authorize();
}

/** Check if MusicKit is configured and user is authorized. */
export async function isMusicKitAuthorized(): Promise<boolean> {
  try {
    const music = await initMusicKit();
    return music.isAuthorized === true;
  } catch {
    return false;
  }
}

/** DCI-047: Session cache with TTL and size limit to avoid unbounded growth. */
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SEARCH_CACHE_MAX_SIZE = 500;
const searchCache = new Map<string, { tracks: AppleMusicTrack[]; expires: number }>();

function evictSearchCache(): void {
  if (searchCache.size <= SEARCH_CACHE_MAX_SIZE) return;
  const now = Date.now();
  const toDelete: string[] = [];
  for (const [key, entry] of searchCache.entries()) {
    if (now > entry.expires) toDelete.push(key);
  }
  toDelete.forEach((k) => searchCache.delete(k));
  if (searchCache.size > SEARCH_CACHE_MAX_SIZE) {
    const keys = [...searchCache.keys()];
    keys.slice(0, searchCache.size - SEARCH_CACHE_MAX_SIZE).forEach((k) => searchCache.delete(k));
  }
}

/**
 * Search Apple Music catalog; returns tracks (id, name, artistName).
 * Uses storefront from MusicKit instance (user's region after authorize, or default).
 */
export async function searchCatalog(term: string, limit = 5): Promise<AppleMusicTrack[]> {
  const entry = searchCache.get(term);
  if (entry && Date.now() < entry.expires) return entry.tracks;

  evictSearchCache();

  const music = await initMusicKit();
  const storefront = music.storefrontId || "us";
  const params = new URLSearchParams({
    term,
    limit: String(limit),
    types: "songs",
  });
  const path = `/v1/catalog/${storefront}/search?${params.toString()}`;

  const data = (await music.music.api(path)) as {
    results?: { songs?: { data?: Array<{ id: string; attributes?: { name?: string; artistName?: string } }> } };
    errors?: Array<{ detail?: string; status?: string }>;
  };
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const detail = data.errors.map((e) => e.detail ?? e.status ?? "Unknown").join("; ");
    throw new Error(`Catalog search failed: ${detail}`);
  }
  const songs = data?.results?.songs?.data ?? [];
  const tracks: AppleMusicTrack[] = songs.map((s) => ({
    id: s.id,
    name: s.attributes?.name ?? "",
    artistName: s.attributes?.artistName,
  }));
  searchCache.set(term, { tracks, expires: Date.now() + SEARCH_CACHE_TTL_MS });
  return tracks;
}

export interface CreatePlaylistResult {
  id: string;
  url?: string;
}

/**
 * Create a new playlist in the user's library. Requires authorization.
 */
export async function createLibraryPlaylist(name: string): Promise<CreatePlaylistResult> {
  const music = await initMusicKit();
  if (!music.isAuthorized) {
    throw new Error("Not authorized. Please connect Apple Music first.");
  }
  const path = "/v1/me/library/playlists";
  const body = {
    data: [{ type: "playlists" as const, attributes: { name } }],
  };
  const res = (await music.music.api(path, {
    method: "POST",
    data: body,
  })) as {
    data?: Array<{ id: string; attributes?: { url?: string } }>;
    errors?: Array<{ detail?: string; status?: string }>;
  };
  if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
    const detail = res.errors.map((e) => e.detail ?? e.status ?? "Unknown").join("; ");
    throw new Error(`Failed to create playlist: ${detail}`);
  }
  const playlist = Array.isArray(res?.data) ? res.data[0] : res?.data;
  if (!playlist?.id) throw new Error("Failed to create playlist");
  return { id: playlist.id, url: playlist.attributes?.url };
}

/**
 * Add song IDs to a library playlist in order. Requires authorization.
 * DCI-004: Check response for errors and throw so UI can surface partial/failed add-tracks.
 */
export async function addTracksToLibraryPlaylist(
  playlistId: string,
  songIds: string[]
): Promise<void> {
  if (songIds.length === 0) return;
  if (!playlistId?.trim()) {
    throw new Error("Invalid playlist ID");
  }
  const validIds = songIds.filter((id) => typeof id === "string" && id.trim().length > 0);
  if (validIds.length === 0) {
    throw new Error("No valid song IDs to add");
  }
  const music = await initMusicKit();
  if (!music.isAuthorized) {
    throw new Error("Not authorized. Please connect Apple Music first.");
  }
  const path = `/v1/me/library/playlists/${playlistId}/tracks`;
  const data = {
    data: validIds.map((id) => ({ id: id.trim(), type: "songs" as const })),
  };
  const res = (await music.music.api(path, { method: "POST", data })) as
    | { data?: unknown[]; errors?: Array<{ detail?: string; status?: string }> }
    | undefined;
  if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
    const detail = res.errors.map((e) => e.detail ?? e.status ?? "Unknown").join("; ");
    throw new Error(`Adding tracks to playlist failed: ${detail}`);
  }
  if (validIds.length < songIds.length) {
    const dropped = songIds.length - validIds.length;
    throw new Error(
      `${dropped} of ${songIds.length} IDs were invalid and skipped; ${validIds.length} tracks added.`
    );
  }
}
