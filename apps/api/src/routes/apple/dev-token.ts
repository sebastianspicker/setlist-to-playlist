import { signDeveloperToken } from '../../lib/jwt.js';

export type DevTokenResponse = { token: string } | { error: string };

/**
 * Mint Apple Developer Token (JWT) for MusicKit.
 * Reads APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY from env.
 */
export function handleDevToken(): DevTokenResponse {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    return { error: 'Missing Apple credentials in environment' };
  }

  const token = signDeveloperToken({ teamId, keyId, privateKey });
  if (!token) {
    return { error: 'Failed to sign developer token' };
  }

  return { token };
}
