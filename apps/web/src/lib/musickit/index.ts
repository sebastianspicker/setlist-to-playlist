export type { AppleMusicTrack, CreatePlaylistResult } from "./types";
export { fetchDeveloperToken } from "./token";
export {
  initMusicKit,
  getMusicKitInstance,
  authorizeMusicKit,
  isMusicKitAuthorized,
} from "./client";
export { searchCatalog } from "./catalog";
export { createLibraryPlaylist, addTracksToLibraryPlaylist } from "./playlist";
