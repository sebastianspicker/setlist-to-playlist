/**
 * Defines the core domain models for Setlists within the application.
 * These types represent the normalized data structure used internally,
 * independent of any specific external API format.
 */

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
