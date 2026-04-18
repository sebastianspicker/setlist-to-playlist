export type {
  AppleMusicTrack,
  CreatePlaylistResult,
  MusicKitErrorItem,
  MusicKitSearchResponse,
  MusicKitPlaylistCreateResponse,
} from './types';
export { throwIfMusicKitError } from './types';
export { fetchDeveloperToken } from './token';
export { initMusicKit, authorizeMusicKit, isMusicKitAuthorized } from './client';
export { searchCatalog } from './catalog';
export {
  createLibraryPlaylist,
  addTracksToLibraryPlaylist,
  AddTracksToLibraryPlaylistError,
} from './playlist';
export type { AddTracksToLibraryPlaylistResult } from './playlist';
