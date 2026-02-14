/**
 * Placeholder: sign Apple Developer Token (JWT).
 * In production: use env APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY
 * and a JWT library (e.g. jose or jsonwebtoken) to mint a token
 * with alg ES256, kid = APPLE_KEY_ID, iss = APPLE_TEAM_ID.
 */
export function signDeveloperToken(_payload: { teamId: string; keyId: string; privateKey: string }): string {
  // TODO: implement with jose or jsonwebtoken
  return '';
}
