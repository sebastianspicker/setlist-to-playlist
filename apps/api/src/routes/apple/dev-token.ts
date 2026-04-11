import type { DevTokenResponse } from '@repo/shared';
import { signDeveloperToken } from '../../lib/jwt.js';

export type { DevTokenResponse };

/**
 * Mint Apple Developer Token (JWT) for MusicKit.
 * Reads APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY from env.
 * Returns { error } with a clear message if env is missing or signing fails.
 */
export async function handleDevToken(): Promise<DevTokenResponse> {
  // Trim so whitespace-only env vars are treated as missing
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const privateKey = process.env.APPLE_PRIVATE_KEY?.trim();

  if (!teamId || !keyId || !privateKey) {
    const missing = [
      !teamId && 'APPLE_TEAM_ID',
      !keyId && 'APPLE_KEY_ID',
      !privateKey && 'APPLE_PRIVATE_KEY',
    ].filter(Boolean);
    return {
      error: `Missing env var(s): ${missing.join(', ')}. Copy .env.example to .env and fill them in.`,
    };
  }

  try {
    const token = await signDeveloperToken({
      teamId,
      keyId,
      privateKeyPem: privateKey,
    });
    return { token };
  } catch (err) {
    // Log signing error safely on the server. Do NOT log the privateKey itself.
    console.error('Apple Developer Token signing failed:', {
      teamId,
      keyId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { error: 'Token signing failed. Check server configuration and logs.' };
  }
}
