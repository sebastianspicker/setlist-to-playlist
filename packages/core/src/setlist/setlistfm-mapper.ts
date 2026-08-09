import { SETLIST_FM_ATTRIBUTION_FALLBACK_URL, type Setlist, type SetlistEntry } from './types.js';
import type { SetlistFmResponse } from './setlistfm-types.js';
import { mapSet } from './mapper-songs.js';
import { getArtistName, getOptionalString, getVenueName } from './mapper-values.js';

function isSetlistFmHostname(hostname: string): boolean {
  return hostname === 'setlist.fm' || hostname.endsWith('.setlist.fm');
}

function isSafeAttributionUrl(url: URL): boolean {
  return (
    url.protocol === 'https:' &&
    isSetlistFmHostname(url.hostname) &&
    url.username.length === 0 &&
    url.password.length === 0
  );
}

export const getSetlistFmAttributionUrl = (value: unknown): string => {
  if (typeof value !== 'string') return SETLIST_FM_ATTRIBUTION_FALLBACK_URL;
  try {
    const url = new URL(value);
    return isSafeAttributionUrl(url) ? url.href : SETLIST_FM_ATTRIBUTION_FALLBACK_URL;
  } catch {
    return SETLIST_FM_ATTRIBUTION_FALLBACK_URL;
  }
};

const mapSets = (raw: SetlistFmResponse, artistName: string): SetlistEntry[][] => {
  const sets: SetlistEntry[][] = [];
  const fmSets = Array.isArray(raw.set) ? raw.set : [];
  for (const fmSet of fmSets) {
    const entries = mapSet(fmSet, artistName);
    if (entries) sets.push(entries);
  }
  return sets;
};

/** Map a setlist.fm API response to our domain Setlist model. */
export function mapSetlistFmToSetlist(raw: SetlistFmResponse): Setlist {
  const artistName = getArtistName(raw);
  return {
    id: getOptionalString(raw.id) ?? '',
    artist: artistName,
    venue: getVenueName(raw.venue),
    eventDate: getOptionalString(raw.eventDate),
    sourceUrl: getSetlistFmAttributionUrl(raw.url),
    sets: mapSets(raw, artistName),
  };
}
