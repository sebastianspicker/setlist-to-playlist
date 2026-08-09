import { describe, expect, it } from 'vitest';
import { mapSetlistFmToSetlist } from '../src/setlist/setlistfm-mapper';
import type { SetlistFmResponse } from '../src/setlist/setlistfm-types';
import { fixture } from './setlist-mapper-fixture';

describe('mapSetlistFmToSetlist validation and sanitization', () => {
  it.each([
    'javascript:alert(1)',
    'https://setlist.fm.evil.example/setlist/example-deadbeef.html',
    'https://user@www.setlist.fm/setlist/example-deadbeef.html',
  ])('uses the setlist.fm homepage for an unsafe attribution URL: %s', (url) => {
    const result = mapSetlistFmToSetlist({ ...fixture, url });
    expect(result.sourceUrl).toBe('https://www.setlist.fm/');
  });

  it('throws on an invalid response shape', () => {
    expect(() => mapSetlistFmToSetlist(null as unknown as SetlistFmResponse)).toThrow(
      'Invalid setlist response'
    );
    expect(() => mapSetlistFmToSetlist(undefined as unknown as SetlistFmResponse)).toThrow(
      'Invalid setlist response'
    );
    expect(() => mapSetlistFmToSetlist({} as SetlistFmResponse)).toThrow(
      'Invalid setlist response: missing artist'
    );
  });

  it('throws when artist name is not a usable string', () => {
    expect(() =>
      mapSetlistFmToSetlist({
        id: 'bad-artist',
        eventDate: '01-01-2024',
        artist: { name: 42 },
      } as unknown as SetlistFmResponse)
    ).toThrow('Invalid setlist response: missing artist');

    expect(() =>
      mapSetlistFmToSetlist({
        id: 'blank-artist',
        eventDate: '01-01-2024',
        artist: { name: '   ' },
      } as SetlistFmResponse)
    ).toThrow('Invalid setlist response: missing artist');
  });

  it('omits malformed song rows instead of emitting invalid entries', () => {
    const result = mapSetlistFmToSetlist({
      id: 'malformed-songs',
      eventDate: '01-01-2024',
      artist: { name: 'Valid Artist' },
      set: [
        {
          song: [
            { name: '' },
            { name: '   ' },
            { name: 123 },
            { name: 'Non Boolean Tape', tape: 0 },
            { name: 'Valid Song', info: 123, cover: { name: 456 } },
          ],
        },
      ],
    } as unknown as SetlistFmResponse);

    expect(result.sets).toEqual([
      [
        {
          name: 'Valid Song',
          artist: 'Valid Artist',
          info: undefined,
        },
      ],
    ]);
  });

  it('uses only valid optional string fields from upstream rows', () => {
    const result = mapSetlistFmToSetlist({
      id: 'optional-strings',
      eventDate: '01-01-2024',
      artist: { name: 'Main Artist' },
      venue: { name: 99 },
      set: [
        {
          song: [
            {
              name: 'Cover Song',
              cover: { name: 'Cover Artist' },
              info: 'acoustic',
              tape: false,
            },
          ],
        },
      ],
    } as unknown as SetlistFmResponse);

    expect(result.venue).toBeUndefined();
    expect(result.sets[0][0]).toEqual({
      name: 'Cover Song',
      artist: 'Cover Artist',
      info: 'acoustic',
    });
  });
});
