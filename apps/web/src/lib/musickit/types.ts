import type { AppleTrack } from '@repo/core';

/** Apple Music catalog track; single source of truth from @repo/core AppleTrack. */
export type AppleMusicTrack = AppleTrack;

export interface MusicKitGlobal {
  configure(options: MusicKitConfigureOptions): Promise<MusicKitInstance> | MusicKitInstance | void;
  getInstance(): MusicKitInstance;
}

declare global {
  interface Window {
    MusicKit?: MusicKitGlobal;
  }
}

export interface MusicKitConfigureOptions {
  developerToken: string;
  app: { name: string; build: string };
  appId?: string;
  storefrontId?: string;
}

export interface MusicKitInstance {
  authorize(): Promise<string>;
  unauthorize(): Promise<void>;
  isAuthorized: boolean;
  storefrontId: string;
  music: {
    api: (path: string, options?: { method?: string; data?: unknown }) => Promise<unknown>;
  };
}

export interface CreatePlaylistResult {
  id: string;
  url?: string;
}

export interface MusicKitErrorItem {
  detail?: string;
  status?: string;
}

export function throwIfMusicKitError(res: { errors?: MusicKitErrorItem[] }, context: string): void {
  if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
    const detail = res.errors.map((e) => e.detail ?? e.status ?? 'Unknown').join('; ');
    throw new Error(`${context}: ${detail}`);
  }
}

export interface MusicKitSearchResponse {
  results?: {
    songs?: {
      data?: Array<{
        id: string;
        attributes?: { name?: string; artistName?: string };
      }>;
    };
  };
  errors?: MusicKitErrorItem[];
}

export interface MusicKitPlaylistCreateResponse {
  data?: Array<{
    id: string;
    attributes?: { url?: string };
  }>;
  errors?: MusicKitErrorItem[];
}

export interface MusicKitAddTracksResponse {
  data?: unknown[];
  errors?: MusicKitErrorItem[];
}
