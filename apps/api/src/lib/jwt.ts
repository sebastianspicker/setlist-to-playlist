import { createPrivateKey } from 'node:crypto';
import { SignJWT } from 'jose';

/** Default token lifetime (Apple allows up to 180 days; we use 1 hour for security). */
const TOKEN_VALIDITY_SECONDS = 60 * 60;

/** Sign an ES256 JWT for Apple MusicKit (iss = Team ID, kid = Key ID, 1 h expiry). */
export async function signDeveloperToken(params: {
  teamId: string;
  keyId: string;
  privateKeyPem: string;
}): Promise<string> {
  const { teamId, keyId, privateKeyPem } = params;
  // Normalize all newline variants (literal \n, CRLF, CR) to \n
  const normalizedPem = privateKeyPem
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const keyObject = createPrivateKey({
    key: normalizedPem,
    format: 'pem',
  });

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_VALIDITY_SECONDS)
    .sign(keyObject);

  return jwt;
}
