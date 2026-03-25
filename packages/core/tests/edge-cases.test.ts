import { describe, it, expect } from 'vitest';
import { mapSetlistFmToSetlist } from '../src/setlist/mapper';
import { flattenSetlistToEntries } from '../src/setlist/flatten';
import { buildPlaylistName } from '../src/setlist/playlist-name';
import { buildSearchQuery } from '../src/matching/search-query';
import { normalizeTrackName } from '../src/matching/normalize';
import { dedupeTrackIdsOrdered } from '../src/matching/dedupe-track-ids';
import { parseSetlistIdFromInput } from '../src/setlist/parse-id';
import type { SetlistFmResponse } from '../src/setlist/setlistfm-types';
import type { Setlist } from '../src/setlist/types';

// ---------------------------------------------------------------------------
// 1. Empty and minimal setlists
// ---------------------------------------------------------------------------
describe('Empty and minimal setlists', () => {
  describe('mapSetlistFmToSetlist', () => {
    it('handles response with empty sets object (no set array)', () => {
      const raw: SetlistFmResponse = {
        id: 'empty1',
        eventDate: '01-01-2024',
        artist: { name: 'Solo Artist' },
        set: [],
      };
      const result = mapSetlistFmToSetlist(raw);
      expect(result.sets).toEqual([]);
      expect(result.artist).toBe('Solo Artist');
    });

    it('handles sets that have empty song arrays', () => {
      const raw: SetlistFmResponse = {
        id: 'empty2',
        eventDate: '01-01-2024',
        artist: { name: 'Band' },
        set: [
          { name: 'Set 1', song: [] },
          { name: 'Encore', song: [] },
        ],
      };
      const result = mapSetlistFmToSetlist(raw);
      // Sets with zero entries are not added
      expect(result.sets).toEqual([]);
    });

    it('handles undefined set property', () => {
      const raw: SetlistFmResponse = {
        id: 'empty3',
        eventDate: '01-01-2024',
        artist: { name: 'Artist' },
      };
      const result = mapSetlistFmToSetlist(raw);
      expect(result.sets).toEqual([]);
    });
  });

  describe('flattenSetlistToEntries', () => {
    it('returns empty array for setlist with zero tracks', () => {
      const setlist: Setlist = { id: 'e', artist: 'A', sets: [] };
      expect(flattenSetlistToEntries(setlist)).toEqual([]);
    });

    it('returns empty array for setlist with empty inner sets', () => {
      const setlist: Setlist = { id: 'e', artist: 'A', sets: [[], []] };
      expect(flattenSetlistToEntries(setlist)).toEqual([]);
    });

    it('returns empty array when sets is undefined', () => {
      const setlist = { id: 'e', artist: 'A', sets: undefined } as unknown as Setlist;
      expect(flattenSetlistToEntries(setlist)).toEqual([]);
    });
  });

  describe('buildPlaylistName', () => {
    it('handles only artist (no date)', () => {
      const result = buildPlaylistName({ id: '1', artist: 'Radiohead', sets: [] });
      expect(result).toBe('Setlist \u2013 Radiohead');
    });

    it('handles only date (no artist)', () => {
      const result = buildPlaylistName({
        id: '1',
        artist: '',
        eventDate: '15-06-2023',
        sets: [],
      });
      expect(result).toBe('Setlist \u2013 15-06-2023');
    });

    it('handles neither artist nor date', () => {
      const result = buildPlaylistName({ id: '1', artist: '', sets: [] });
      expect(result).toBe('Setlist');
    });

    it('handles whitespace-only artist', () => {
      const result = buildPlaylistName({ id: '1', artist: '   ', sets: [] });
      expect(result).toBe('Setlist');
    });
  });

  describe('buildSearchQuery', () => {
    it('returns empty string for empty track name and no artist', () => {
      expect(buildSearchQuery('')).toBe('');
    });

    it('returns artist when track name is empty', () => {
      expect(buildSearchQuery('', 'Artist')).toBe('Artist');
    });
  });

  describe('normalizeTrackName', () => {
    it('returns empty string for empty input', () => {
      expect(normalizeTrackName('')).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(normalizeTrackName('   ')).toBe('');
    });

    it('handles single character input', () => {
      expect(normalizeTrackName('X')).toBe('X');
    });
  });

  describe('dedupeTrackIdsOrdered', () => {
    it('returns empty array when all inputs are duplicates', () => {
      expect(dedupeTrackIdsOrdered(['a', 'a', 'a'])).toEqual(['a']);
    });

    it('returns empty array when all inputs are empty strings', () => {
      expect(dedupeTrackIdsOrdered(['', '', ''])).toEqual([]);
    });

    it('handles mix of duplicates and empty strings', () => {
      expect(dedupeTrackIdsOrdered(['', 'x', '', 'x', 'y', '', 'y'])).toEqual(['x', 'y']);
    });

    it('handles empty input array', () => {
      expect(dedupeTrackIdsOrdered([])).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Unicode and special characters
// ---------------------------------------------------------------------------
describe('Unicode and special characters', () => {
  describe('normalizeTrackName', () => {
    it('preserves diacritics: Bj\u00f6rk', () => {
      expect(normalizeTrackName('Bj\u00f6rk')).toBe('Bj\u00f6rk');
    });

    it('preserves diacritics: M\u00f6tley Cr\u00fce', () => {
      expect(normalizeTrackName('M\u00f6tley Cr\u00fce')).toBe('M\u00f6tley Cr\u00fce');
    });

    it('preserves diacritics: Sigur R\u00f3s', () => {
      expect(normalizeTrackName('Sigur R\u00f3s')).toBe('Sigur R\u00f3s');
    });

    it('preserves CJK characters', () => {
      expect(normalizeTrackName('\u82b1\u706b')).toBe('\u82b1\u706b');
    });

    it('preserves emoji in track name', () => {
      const result = normalizeTrackName('\ud83c\udfb5 Song Name');
      expect(result).toContain('Song Name');
    });

    it('still strips metadata from unicode track names', () => {
      expect(normalizeTrackName('Bj\u00f6rk (live)')).toBe('Bj\u00f6rk');
      expect(normalizeTrackName('\u82b1\u706b (acoustic)')).toBe('\u82b1\u706b');
    });
  });

  describe('buildSearchQuery', () => {
    it('handles ampersand in track name', () => {
      const result = buildSearchQuery('Simon & Garfunkel', 'Artist');
      expect(result).toContain('Simon');
      expect(result).toContain('Garfunkel');
    });

    it('handles quotes in track name', () => {
      const result = buildSearchQuery('"Heroes"', 'David Bowie');
      expect(result).toContain('"Heroes"');
    });

    it('handles slashes in track name', () => {
      const result = buildSearchQuery('Either/Or', 'Elliott Smith');
      expect(result).toContain('Either/Or');
    });
  });

  describe('buildPlaylistName', () => {
    it('handles unicode venue name', () => {
      const result = buildPlaylistName({
        id: '1',
        artist: 'Orchestra',
        venue: 'Z\u00fcrich Tonhalle',
        eventDate: '01-01-2024',
        sets: [],
      });
      // Venue is not used in buildPlaylistName, but artist and date are
      expect(result).toBe('Setlist \u2013 Orchestra \u2013 01-01-2024');
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Boundary conditions
// ---------------------------------------------------------------------------
describe('Boundary conditions', () => {
  describe('buildSearchQuery', () => {
    it('handles track name at exactly MAX_QUERY_LENGTH (200 chars)', () => {
      const longName = 'A'.repeat(200);
      const result = buildSearchQuery(longName);
      expect(result).toBe(longName);
      expect(result).toHaveLength(200);
    });

    it('truncates track name exceeding MAX_QUERY_LENGTH', () => {
      const longName = 'B'.repeat(250);
      const result = buildSearchQuery(longName);
      expect(result).toHaveLength(200);
    });

    it('truncates both track and artist independently at MAX_QUERY_LENGTH', () => {
      const longTrack = 'T'.repeat(250);
      const longArtist = 'A'.repeat(250);
      const result = buildSearchQuery(longTrack, longArtist);
      // Each is capped at 200, then joined with space
      expect(result).toBe('T'.repeat(200) + ' ' + 'A'.repeat(200));
    });
  });

  describe('dedupeTrackIdsOrdered', () => {
    it('handles 100+ IDs efficiently', () => {
      const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`);
      // Add some duplicates
      ids.push('id-0', 'id-50', 'id-100');
      const result = dedupeTrackIdsOrdered(ids);
      expect(result).toHaveLength(150);
      expect(result[0]).toBe('id-0');
      expect(result[149]).toBe('id-149');
    });

    it('handles 1000 IDs with heavy duplication', () => {
      const ids = Array.from({ length: 1000 }, (_, i) => `id-${i % 50}`);
      const result = dedupeTrackIdsOrdered(ids);
      expect(result).toHaveLength(50);
    });
  });

  describe('parseSetlistIdFromInput', () => {
    it('accepts ID with exactly 4 characters (minimum valid length)', () => {
      expect(parseSetlistIdFromInput('abcd')).toBe('abcd');
    });

    it('accepts ID with exactly 64 characters (maximum valid length)', () => {
      const id64 = 'a'.repeat(64);
      expect(parseSetlistIdFromInput(id64)).toBe(id64);
    });

    it('rejects ID with 3 characters (too short)', () => {
      expect(parseSetlistIdFromInput('abc')).toBeNull();
    });

    it('rejects ID with 65 characters (too long)', () => {
      const id65 = 'a'.repeat(65);
      expect(parseSetlistIdFromInput(id65)).toBeNull();
    });

    it('rejects empty string', () => {
      expect(parseSetlistIdFromInput('')).toBeNull();
    });

    it('rejects whitespace-only string', () => {
      expect(parseSetlistIdFromInput('   ')).toBeNull();
    });

    it('rejects hex ID with hyphens', () => {
      expect(parseSetlistIdFromInput('abcd-ef01')).toBeNull();
    });

    it('rejects IDs with non-hex characters', () => {
      expect(parseSetlistIdFromInput('wxyz')).toBeNull();
    });

    it('extracts ID from full setlist.fm URL', () => {
      expect(
        parseSetlistIdFromInput(
          'https://www.setlist.fm/setlist/radiohead/2003/south-park-oxford-england-53d6a489.html'
        )
      ).toBe('53d6a489');
    });

    it('returns null for non-setlist.fm URLs', () => {
      expect(parseSetlistIdFromInput('https://example.com/page-abcd1234.html')).toBeNull();
    });

    it('handles setlist.fm URL without www prefix', () => {
      expect(
        parseSetlistIdFromInput('https://setlist.fm/setlist/band/2024/venue-city-12345678.html')
      ).toBe('12345678');
    });

    it('handles bare setlist.fm domain (no scheme)', () => {
      expect(parseSetlistIdFromInput('setlist.fm/setlist/band/2024/venue-city-abcdef12.html')).toBe(
        'abcdef12'
      );
    });
  });
});
