import { initMusicKit } from './client';
import type { AppleMusicTrack, MusicKitSearchResponse } from './types';
import { throwIfMusicKitError } from './types';

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_MAX_SIZE = 500;
const searchCache = new Map<string, { tracks: AppleMusicTrack[]; expires: number }>();

function evictSearchCache(): void {
  if (searchCache.size <= SEARCH_CACHE_MAX_SIZE) return;

  // Phase 1: remove expired entries
  const now = Date.now();
  for (const [key, entry] of searchCache.entries()) {
    if (now > entry.expires) searchCache.delete(key);
  }

  // Phase 2: if still over max, delete the oldest 20% by timestamp
  if (searchCache.size > SEARCH_CACHE_MAX_SIZE) {
    const entries = [...searchCache.entries()].sort((a, b) => a[1].expires - b[1].expires);
    const deleteCount = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < deleteCount; i++) {
      searchCache.delete(entries[i]![0]);
    }
  }
}

/**
 * Search Apple Music catalog; returns tracks (id, name, artistName).
 * Uses storefront from MusicKit instance.
 */
export async function searchCatalog(term: string, limit = 5): Promise<AppleMusicTrack[]> {
  const music = await initMusicKit();
  const rawStorefront = music.storefrontId || 'us';
  const storefront = /^[a-z]{2}$/i.test(rawStorefront) ? rawStorefront : 'us';
  const cacheKey = `${storefront}:${term}:${limit}`;
  const entry = searchCache.get(cacheKey);
  if (entry && Date.now() < entry.expires) return entry.tracks;

  evictSearchCache();

  const params = new URLSearchParams({
    term,
    limit: String(limit),
    types: 'songs',
  });
  const path = `/v1/catalog/${storefront}/search?${params.toString()}`;

  const data = (await music.music.api(path)) as MusicKitSearchResponse;
  throwIfMusicKitError(data, 'Catalog search failed');
  const songs = data?.results?.songs?.data ?? [];
  const tracks: AppleMusicTrack[] = songs.map((s) => ({
    id: s.id,
    name: s.attributes?.name ?? '',
    artistName: s.attributes?.artistName,
  }));
  searchCache.set(cacheKey, { tracks, expires: Date.now() + SEARCH_CACHE_TTL_MS });
  return tracks;
}
