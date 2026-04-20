import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { handleDevToken } from '../src/routes/apple/dev-token.js';
import { saveEnv, restoreEnv } from './helpers/env.js';

// Generate a fresh ES256 (P-256) key pair once per test run — no static key file needed.
let TEST_PRIVATE_KEY_PEM: string;

beforeAll(() => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  TEST_PRIVATE_KEY_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
});

const APPLE_ENV_KEYS = ['APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'];

/** JWT shape: three base64url segments separated by dots */
const JWT_REGEX = /^[\w-]+\.[\w-]+\.[\w-]+$/;

describe('dev-token', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = saveEnv(APPLE_ENV_KEYS);
  });

  afterEach(() => {
    restoreEnv(APPLE_ENV_KEYS, savedEnv);
  });

  it('returns error when Apple credentials are missing', async () => {
    delete process.env.APPLE_TEAM_ID;
    delete process.env.APPLE_KEY_ID;
    delete process.env.APPLE_PRIVATE_KEY;

    const result = await handleDevToken();
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toMatch(/Missing env var\(s\):/);
    expect((result as { error: string }).error).toContain('APPLE_TEAM_ID');
    expect((result as { error: string }).error).toContain('APPLE_KEY_ID');
    expect((result as { error: string }).error).toContain('APPLE_PRIVATE_KEY');
  });

  it('returns a JWT when credentials are set', async () => {
    process.env.APPLE_TEAM_ID = 'TEST_TEAM_ID';
    process.env.APPLE_KEY_ID = 'TEST_KEY_ID';
    process.env.APPLE_PRIVATE_KEY = TEST_PRIVATE_KEY_PEM;

    const result = await handleDevToken();
    expect('token' in result).toBe(true);
    if ('token' in result) {
      expect(result.token).toBeTypeOf('string');
      expect(result.token.length).toBeGreaterThan(0);
      expect(result.token).toMatch(JWT_REGEX);
    }
  });
});
