import { signDeveloperToken } from "../../lib/jwt.js";

export type DevTokenResponse = { token: string } | { error: string };

/**
 * Mint Apple Developer Token (JWT) for MusicKit.
 * Reads APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY from env.
 * Returns { error } with a clear message if env is missing or signing fails.
 */
export async function handleDevToken(): Promise<DevTokenResponse> {
  // DCI-036: trim so whitespace-only env vars are treated as missing
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const privateKey = process.env.APPLE_PRIVATE_KEY?.trim();

  if (!teamId || !keyId || !privateKey) {
    return { error: "Missing Apple credentials in environment" };
  }

  try {
    const token = await signDeveloperToken({
      teamId,
      keyId,
      privateKeyPem: privateKey,
    });
    return { token };
  } catch {
    return { error: "Token signing failed. Check server configuration and logs." };
  }
}
