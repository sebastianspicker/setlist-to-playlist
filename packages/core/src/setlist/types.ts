export interface SetlistEntry {
  /** Track name as on setlist (e.g. "Song Name (live)") */
  name: string;
  /** Artist name for this setlist */
  artist?: string;
  /** Optional info e.g. "acoustic" */
  info?: string;
}

export interface Setlist {
  /** Setlist ID from setlist.fm */
  id: string;
  /** Artist name */
  artist: string;
  /** Venue name */
  venue?: string;
  /** Event date (ISO or display) */
  eventDate?: string;
  /** Ordered list of tracks/songs */
  sets: SetlistEntry[][];
}
