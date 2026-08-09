import { describe, expect, it } from 'vitest';
import { mapSetlistFmToSetlist } from '../src/setlist/setlistfm-mapper';
import { fixture } from './setlist-mapper-fixture';

describe('mapSetlistFmToSetlist basic mapping', () => {
  it('maps fixture to Setlist with correct artist, venue, date, id', () => {
    const result = mapSetlistFmToSetlist(fixture);
    expect(result.id).toBe('63de4613');
    expect(result.artist).toBe('The Beatles');
    expect(result.venue).toBe('Compaq Center');
    expect(result.eventDate).toBe('23-08-1964');
    expect(result.sourceUrl).toBe(
      'https://www.setlist.fm/setlist/the-beatles/1964/hollywood-bowl-hollywood-ca-63de4613.html'
    );
  });

  it('preserves set structure and track order for playable songs', () => {
    const result = mapSetlistFmToSetlist(fixture);
    expect(result.sets).toHaveLength(2);
    expect(result.sets[0]).toHaveLength(1);
    expect(result.sets[0][0].name).toBe('Yesterday');
    expect(result.sets[0][0].artist).toBe('The Beatles');
    expect(result.sets[1]).toHaveLength(1);
    expect(result.sets[1][0].name).toBe('Twist and Shout');
  });

  it('handles minimal response (no venue, no sets)', () => {
    const minimal = {
      id: 'abc',
      eventDate: '01-01-2020',
      artist: { name: 'Unknown' },
    };
    const result = mapSetlistFmToSetlist(minimal);
    expect(result.id).toBe('abc');
    expect(result.artist).toBe('Unknown');
    expect(result.venue).toBeUndefined();
    expect(result.sets).toEqual([]);
    expect(result.sourceUrl).toBe('https://www.setlist.fm/');
  });
});
