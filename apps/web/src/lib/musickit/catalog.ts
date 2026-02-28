import { initMusicKit } from "./client";
import type { AppleMusicTrack } from "./types";

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
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
 * Uses storefront from MusicKit instance.
 */
export async function searchCatalog(term: string, limit = 5): Promise<AppleMusicTrack[]> {
  const music = await initMusicKit();
  const storefront = music.storefrontId || "us";
  const cacheKey = `${storefront}:${term}:${limit}`;
  const entry = searchCache.get(cacheKey);
  if (entry && Date.now() < entry.expires) return entry.tracks;

  evictSearchCache();

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
  searchCache.set(cacheKey, { tracks, expires: Date.now() + SEARCH_CACHE_TTL_MS });
  return tracks;
}
