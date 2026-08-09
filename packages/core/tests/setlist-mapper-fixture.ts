import type { SetlistFmResponse } from '../src/setlist/setlistfm-types';

export const fixture: SetlistFmResponse = {
  id: '63de4613',
  versionId: '7be1aaa0',
  eventDate: '23-08-1964',
  artist: {
    name: 'The Beatles',
    mbid: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d',
    sortName: 'Beatles, The',
    url: 'https://www.setlist.fm/setlists/the-beatles-23d6a88b.html',
  },
  venue: {
    id: '6bd6ca6e',
    name: 'Compaq Center',
    city: { name: 'Hollywood', country: { code: 'US' } },
    url: 'https://www.setlist.fm/venue/compaq-center-san-jose-ca-usa-6bd6ca6e.html',
  },
  tour: { name: 'North American Tour 1964' },
  set: [
    {
      name: 'Set 1',
      song: [
        { name: 'Yesterday', info: '', tape: false },
        { name: 'Help! (live)', tape: true },
      ],
    },
    {
      name: 'Encore',
      encore: 1,
      song: [{ name: 'Twist and Shout', tape: false }],
    },
  ],
  info: "Recorded and published as 'The Beatles at the Hollywood Bowl'",
  url: 'https://www.setlist.fm/setlist/the-beatles/1964/hollywood-bowl-hollywood-ca-63de4613.html',
};
