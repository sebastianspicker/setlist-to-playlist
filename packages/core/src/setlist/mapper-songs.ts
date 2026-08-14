import type { SetlistEntry } from './types.js';
import type { SetlistFmSong } from './setlistfm-types.js';
import { getOptionalString, hasNonEmptyName, toSafeRecord } from './mapper-values.js';

const getCoverArtist = (cover: unknown): string | undefined =>
  getOptionalString(toSafeRecord(cover)?.name);

const toSetlistFmSong = (value: unknown): SetlistFmSong | null => {
  const song = toSafeRecord(value);
  if (!song || !hasNonEmptyName(song.name)) return null;
  return song.tape !== undefined && typeof song.tape !== 'boolean'
    ? null
    : (value as SetlistFmSong);
};

const mapSong = (value: unknown, artistName: string): SetlistEntry | null => {
  const song = toSetlistFmSong(value);
  if (!song || song.tape) return null;
  return {
    name: song.name,
    artist: getCoverArtist(song.cover) ?? artistName,
    info: getOptionalString(song.info),
  };
};

export const mapSet = (value: unknown, artistName: string): SetlistEntry[] | null => {
  const fmSet = toSafeRecord(value);
  if (!fmSet || !Array.isArray(fmSet.song)) return null;

  const entries: SetlistEntry[] = [];
  for (const song of fmSet.song) {
    const entry = mapSong(song, artistName);
    if (entry) entries.push(entry);
  }
  return entries.length > 0 ? entries : null;
};
