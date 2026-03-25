import { APPLE_MUSIC_APP_ID } from '../config';
import { fetchDeveloperToken, isTokenValid } from './token';
import type { MusicKitGlobal, MusicKitInstance } from './types';

/** Wait for MusicKit script to be available. */
function waitForMusicKit(): Promise<MusicKitGlobal> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('MusicKit only runs in the browser'));
      return;
    }
    if (window.MusicKit) {
      resolve(window.MusicKit);
      return;
    }
    let settled = false;
    const check = setInterval(() => {
      if (!settled && window.MusicKit) {
        settled = true;
        clearInterval(check);
        resolve(window.MusicKit);
      }
    }, 50);
    setTimeout(() => {
      if (!settled) {
        settled = true;
        clearInterval(check);
        reject(new Error('MusicKit script did not load'));
      }
    }, 10000);
  });
}

let configuredInstance: MusicKitInstance | null = null;
let initPromise: Promise<MusicKitInstance> | null = null;

/**
 * Configure MusicKit with Developer Token and app ID.
 * Promise-based singleton to prevent concurrent init races.
 */
export async function initMusicKit(): Promise<MusicKitInstance> {
  if (configuredInstance) {
    if (!isTokenValid()) {
      configuredInstance = null;
      initPromise = null;
    } else {
      return configuredInstance;
    }
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!APPLE_MUSIC_APP_ID || APPLE_MUSIC_APP_ID.trim() === '') {
        throw new Error(
          'NEXT_PUBLIC_APPLE_MUSIC_APP_ID is required for MusicKit. Set it in your environment (see .env.example).'
        );
      }
      const token = await fetchDeveloperToken();
      const MusicKit = await waitForMusicKit();
      const configureResult = MusicKit.configure({
        developerToken: token,
        app: { name: 'Setlist to Playlist', build: '1' },
        appId: APPLE_MUSIC_APP_ID,
      });
      if (configureResult && typeof (configureResult as Promise<unknown>).then === 'function') {
        await (configureResult as Promise<MusicKitInstance>);
      }
      configuredInstance = MusicKit.getInstance();
      return configuredInstance;
    } catch (err) {
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export async function authorizeMusicKit(): Promise<string> {
  const music = await initMusicKit();
  return music.authorize();
}

export async function isMusicKitAuthorized(): Promise<boolean> {
  try {
    const music = await initMusicKit();
    return music.isAuthorized === true;
  } catch (err) {
    console.warn(
      'MusicKit authorization check failed during initialization:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return false;
  }
}
