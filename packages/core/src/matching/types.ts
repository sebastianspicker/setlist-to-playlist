export interface AppleTrack {
  id: string;
  name: string;
  artistName?: string;
}

export interface MatchResult {
  /** Original setlist entry */
  setlistEntry: { name: string; artist?: string };
  /** Matched Apple Music track, or null if no match */
  appleTrack: AppleTrack | null;
}
