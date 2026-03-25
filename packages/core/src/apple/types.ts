/** Placeholder for Apple Music API types used by core (e.g. catalog track). */
export interface AppleCatalogTrack {
  id: string;
  attributes?: {
    name?: string;
    artistName?: string;
  };
}
