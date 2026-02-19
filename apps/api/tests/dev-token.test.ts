import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { handleDevToken } from "../src/routes/apple/dev-token.js";
import { saveEnv, restoreEnv } from "./helpers/env.js";

const FIXTURE_KEY_PATH = join(process.cwd(), "tests/fixtures/apple-test-key.pem");
const APPLE_ENV_KEYS = ["APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"];

/** JWT shape: three base64url segments separated by dots */
const JWT_REGEX = /^[\w-]+\.[\w-]+\.[\w-]+$/;

describe("dev-token", () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = saveEnv(APPLE_ENV_KEYS);
  });

  afterEach(() => {
    restoreEnv(APPLE_ENV_KEYS, savedEnv);
  });

  it("returns error when Apple credentials are missing", async () => {
    delete process.env.APPLE_TEAM_ID;
    delete process.env.APPLE_KEY_ID;
    delete process.env.APPLE_PRIVATE_KEY;

    const result = await handleDevToken();
    expect(result).toEqual({ error: "Missing Apple credentials in environment" });
  });

  it("returns a JWT when credentials are set", async () => {
    process.env.APPLE_TEAM_ID = "TEST_TEAM_ID";
    process.env.APPLE_KEY_ID = "TEST_KEY_ID";
    process.env.APPLE_PRIVATE_KEY = readFileSync(FIXTURE_KEY_PATH, "utf8");

    const result = await handleDevToken();
    expect("token" in result).toBe(true);
    if ("token" in result) {
      expect(result.token).toBeTypeOf("string");
      expect(result.token.length).toBeGreaterThan(0);
      expect(result.token).toMatch(JWT_REGEX);
    }
  });
});
