/**
 * Types for the setlist.fm REST API response (subset used by the app).
 * See https://api.setlist.fm/docs/1.0/json_Setlist.html
 */

export interface SetlistFmArtist {
  name: string;
  mbid?: string;
  sortName?: string;
  url?: string;
}

export interface SetlistFmVenue {
  name: string;
  id?: string;
  city?: { name: string; country?: { code: string } };
  url?: string;
}

export interface SetlistFmSong {
  name: string;
  info?: string;
  cover?: unknown;
  with?: unknown;
  tape?: boolean;
}

export interface SetlistFmSet {
  name?: string;
  encore?: number;
  song: SetlistFmSong[];
}

export interface SetlistFmResponse {
  id: string;
  versionId?: string;
  eventDate: string;
  artist: SetlistFmArtist;
  venue?: SetlistFmVenue;
  tour?: { name?: string };
  set?: SetlistFmSet[];
  info?: string;
  url?: string;
}
