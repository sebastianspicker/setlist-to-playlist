import { createPrivateKey } from "node:crypto";
import { SignJWT } from "jose";

/** Default token lifetime (Apple allows up to 180 days; we use 1 hour for security). */
const TOKEN_VALIDITY_SECONDS = 60 * 60;

/**
 * Sign an Apple Developer Token (JWT) for MusicKit.
 * Uses ES256 with kid = Key ID, iss = Team ID, iat/exp in payload.
 *
 * @param teamId - Apple Team ID (iss)
 * @param keyId - Apple Key ID (kid in header)
 * @param privateKeyPem - PEM string (contents of .p8 file)
 * @returns JWT string
 */
export async function signDeveloperToken(params: {
  teamId: string;
  keyId: string;
  privateKeyPem: string;
}): Promise<string> {
  const { teamId, keyId, privateKeyPem } = params;
  // DCI-011: normalize all newline variants (literal \n, CRLF, CR) to \n
  const normalizedPem = privateKeyPem
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const keyObject = createPrivateKey({
    key: normalizedPem,
    format: "pem",
  });

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_VALIDITY_SECONDS)
    .sign(keyObject);

  return jwt;
}
