import { describe, expect, it } from 'vitest';
import { normalizeTrackName } from '../src/matching/normalize';
import { parseSetlistIdFromInput } from '../src/setlist/parse-id';
import { mapSetlistFmToSetlist } from '../src/setlist/setlistfm-mapper';

describe('setlist input contracts', () => {
  it('accepts only supported setlist.fm identifiers and hosts', () => {
    expect(parseSetlistIdFromInput('https://www.setlist.fm/setlist/a/b-deadbeef.html')).toBe(
      'deadbeef'
    );
    expect(
      parseSetlistIdFromInput('https://setlist.fm@evil.example/setlist/a-b-deadbeef.html')
    ).toBeNull();
  });

  it('normalizes a catalog query without losing Unicode names', () => {
    expect(normalizeTrackName('Café (Live Version) feat. Guest')).toBe('Café');
  });

  it('rejects unsafe attribution URLs while preserving valid upstream songs', () => {
    const result = mapSetlistFmToSetlist({
      id: 'deadbeef',
      eventDate: '01-01-2024',
      artist: { name: 'Artist' },
      url: 'javascript:alert(1)',
      set: [{ song: [{ name: 'Song' }] }],
    });
    expect(result.sourceUrl).toBe('https://www.setlist.fm/');
    expect(result.sets).toEqual([[{ name: 'Song', artist: 'Artist', info: undefined }]]);
  });
});
