# Apple Developer Token & JWT Findings

Audit Date: 2026-02-14T10:16:05Z  
Files Examined: 13  
Total Findings: 12

## Summary by Severity
- Critical: 0
- High: 3
- Medium: 7
- Low: 2

---

## Findings

### [HIGH] Finding #1: Developer Token response lacks explicit anti-caching headers (token may be cached/shared)

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 5-15  
**Category:** will-break

**Description:**
The Developer Token endpoint returns a bearer credential but does not set any explicit response caching directives (e.g. `Cache-Control: no-store`) and does not set `Vary: Origin`. In environments with intermediate caches (CDN/proxy) or client-side caching behaviors, this increases the risk that a signed Developer Token is cached longer than intended and/or served across request contexts.

This is amplified by the fact that the route relies on `corsHeaders(request)` which only sets `Content-Type` and conditionally `Access-Control-Allow-Origin`, with no cache-related headers.

**Code:**
```ts
export async function GET(request: NextRequest) {
  const result = await handleDevToken();
  const status = "error" in result ? 503 : 200;
  return new Response(JSON.stringify(result), {
    status,
    headers: corsHeaders(request),
  });
}
```

**Why this matters:**
A Developer Token is a credential. Accidental caching (especially shared caching) can widen token exposure and make abuse easier.

---

### [HIGH] Finding #2: “Localhost” CORS detection is overly permissive (accepts non-local origins like `http://localhost.evil.com`)

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 7-16  
**Category:** will-break

**Description:**
When `ALLOWED_ORIGIN` is unset, `getAllowOrigin()` treats any `Origin` header that *starts with* `http://localhost` or `http://127.0.0.1` as “local”. This matches attacker-controlled domains such as `http://localhost.evil.com` (a valid origin string) and will echo that origin back as allowed.

The comment claims “only localhost/127.0.0.1 are allowed”, but the actual predicate is prefix-based and therefore broader than intended.

**Code:**
```ts
const isLocalOrigin =
  origin &&
  (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
...
return isLocalOrigin ? origin : null;
```

**Why this matters:**
If `ALLOWED_ORIGIN` is missing in a deployed environment (or during development), a hostile webpage on a `localhost*.tld` origin can read the Developer Token response via browser JavaScript, increasing token leakage risk.

---

### [HIGH] Finding #3: Dev-token endpoint is unauthenticated and not rate-limited; CORS does not prevent non-browser extraction/abuse

**File:** `docs/tech/apple-music.md`  
**Lines:** 34-38  
**Category:** will-break

**Description:**
The documentation explicitly states rate limiting is not implemented for the dev-token endpoint. The implementation also does not include any authentication, abuse controls, or rate limiting in the route handler path. CORS only influences whether browsers expose the response to JavaScript; it does not prevent direct HTTP clients (server-side scripts, bots) from calling the endpoint and receiving tokens.

**Code:**
```md
- Developer Token must be generated server-side only. Restrict dev-token endpoint by origin and optionally rate-limit.
- **Rate limiting:** Not implemented for the dev-token endpoint yet. Consider adding per-IP or per-origin limits ...
```

**Why this matters:**
A publicly callable “mint token on demand” endpoint can be abused for token harvesting and downstream Apple API quota/rate consumption, and CORS alone does not meaningfully constrain non-browser callers.

---

### [MEDIUM] Finding #4: `ALLOWED_ORIGIN` supports comma-separated values but silently uses only the first origin

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 12-15  
**Category:** will-break

**Description:**
When `ALLOWED_ORIGIN` is set, the code splits on commas and uses only the first entry. This can be surprising for operators who expect multiple origins to work (staging + prod, multiple frontends). It also creates a misconfiguration footgun: the first origin in the list becomes the only one ever emitted.

**Code:**
```ts
if (configured) {
  const single = configured.split(",")[0].trim();
  return single || (isLocalOrigin ? origin : null);
}
```

**Why this matters:**
Misconfigured CORS often presents as “token endpoint broken” in production, and can lead to ad-hoc relaxations elsewhere or accidental exposure during troubleshooting.

---

### [MEDIUM] Finding #5: Preflight responses are incomplete (no `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers` / `Vary`)

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 5-7  
**Category:** will-break

**Description:**
The `OPTIONS` handler returns `204` with `corsHeaders(request)`, which only sets `Content-Type` and maybe `Access-Control-Allow-Origin`. It does not return common preflight headers (`Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, `Access-Control-Max-Age`). While the current client path uses a simple `GET`, this is fragile and can break if the request becomes non-simple (custom headers, credentials mode changes, or future method changes).

**Code:**
```ts
export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
```

**Why this matters:**
CORS failures can be intermittent and environment-specific, and are expensive to debug; the current implementation is minimal and easy to outgrow.

---

### [MEDIUM] Finding #6: Signing failures are swallowed with no logging; error text implies logs exist

**File:** `apps/api/src/routes/apple/dev-token.ts`  
**Lines:** 20-32  
**Category:** slop

**Description:**
`handleDevToken()` catches all errors during signing and returns a generic error message, but does not log the underlying exception. The returned message instructs operators to “Check server configuration and logs,” but this function itself does not emit any logs, so failures can become opaque unless the hosting platform logs unhandled errors elsewhere (these are handled here).

**Code:**
```ts
try {
  const token = await signDeveloperToken({ teamId, keyId, privateKeyPem: privateKey });
  ...
  return { token };
} catch {
  return { error: "Token signing failed. Check server configuration and logs." };
}
```

**Why this matters:**
Operational diagnosability is reduced: invalid PEM formatting, wrong key type, or runtime crypto issues all collapse to the same message with no local trace.

---

### [MEDIUM] Finding #7: PEM normalization does not handle some common env encodings (e.g. literal `\\r\\n`), leading to hard-to-diagnose failures

**File:** `apps/api/src/lib/jwt.ts`  
**Lines:** 22-30  
**Category:** will-break

**Description:**
Normalization replaces literal `\\n` sequences and real `\r\n` / `\r`. If an environment value uses Windows newlines encoded as literal `\\r\\n`, the `\\n` portion becomes a real newline but the `\\r` remains as a literal backslash + `r` character, which can corrupt the PEM and cause `createPrivateKey()` to throw.

There is also no explicit validation that the PEM contains the expected header/footer; malformed-but-non-empty values proceed to crypto parsing and then fail inside signing.

**Code:**
```ts
const normalizedPem = privateKeyPem
  .replace(/\\n/g, "\n")
  .replace(/\r\n/g, "\n")
  .replace(/\r/g, "\n");
const keyObject = createPrivateKey({ key: normalizedPem, format: "pem" });
```

**Why this matters:**
A small configuration formatting difference can fully break token issuance, and the current error handling path makes root-cause identification difficult.

---

### [LOW] Finding #8: Redundant/unreachable check for `token` after signing

**File:** `apps/api/src/routes/apple/dev-token.ts`  
**Lines:** 26-28  
**Category:** slop

**Description:**
After `await signDeveloperToken(...)`, the code checks `if (!token)` and returns an error. In practice, `signDeveloperToken()` either resolves to a non-empty string or throws; returning an empty string is not a meaningful expected state.

**Code:**
```ts
if (!token) {
  return { error: "Failed to sign developer token" };
}
```

**Why this matters:**
Minor, but it adds dead-path logic and makes it harder to reason about actual failure modes (throw vs. empty result).

---

### [MEDIUM] Finding #9: Client token cache TTL is hard-coded and not derived from the JWT `exp` claim

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 43-70  
**Category:** will-break

**Description:**
The client caches the Developer Token for a fixed 55 minutes, assuming the server token is valid for 1 hour. The cache does not parse the JWT `exp` claim. If the server’s token validity changes (shorter or longer), the client behavior can drift: it may continue using a token that is already expired, or it may refresh more often than necessary.

**Code:**
```ts
const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes
...
cachedToken = data.token;
tokenExpiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
```

**Why this matters:**
Token validity mismatches manifest as sporadic MusicKit failures after an app has been open for some time, which is a poor UX and hard to diagnose.

---

### [MEDIUM] Finding #10: Client token fetch uses default fetch caching semantics; combined with server headers, token responses may be stored in HTTP caches

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 52-58  
**Category:** will-break

**Description:**
`fetchDeveloperToken()` uses `fetch(devTokenUrl())` with default options. If the dev-token response is cacheable (explicitly or implicitly via intermediaries), the token can be persisted in browser/proxy caches outside the in-memory TTL model, potentially longer than intended.

**Code:**
```ts
cachedToken = null;
tokenExpiresAt = 0;
const res = await fetch(devTokenUrl());
```

**Why this matters:**
Even if the app intends to keep the token ephemeral (memory-only), HTTP caching layers can undermine that assumption.

---

### [MEDIUM] Finding #11: Test suite references a private key fixture file in-repo (private key material present in repository)

**File:** `apps/api/tests/dev-token.test.ts`  
**Lines:** 6-9, 35-39  
**Category:** will-break

**Description:**
The tests rely on a PEM private key fixture at `tests/fixtures/apple-test-key.pem`. Even if this key is intended purely for testing, it is still private key material stored in the repo, which increases the risk of accidental reuse, security scanning alerts, and policy violations (“no secrets”) depending on organizational standards.

**Code:**
```ts
const FIXTURE_KEY_PATH = join(process.cwd(), "tests/fixtures/apple-test-key.pem");
...
process.env.APPLE_PRIVATE_KEY = readFileSync(FIXTURE_KEY_PATH, "utf8");
```

**Why this matters:**
Private key material in-repo tends to spread (copied into other contexts) and can be mistakenly treated as acceptable precedent for handling real signing keys.

---

### [LOW] Finding #12: Documentation mismatches can mislead operators about CORS behavior and current implementation state

**File:** `docs/exec-plans/completed/002-api-dev-token.md`  
**Lines:** 10-13  
**Category:** slop

**Description:**
The completed plan states that in dev the route allows request origin when “localhost/https,” but the current code only matches `http://localhost` / `http://127.0.0.1` (no `https://localhost`), and the localhost matching is prefix-based (broader than “localhost only”). The same doc also highlights rate limiting as not implemented, which remains true and is security-relevant, but may be interpreted as “documented therefore acceptable.”

**Code:**
```md
- **T009** – CORS on dev-token route: `Access-Control-Allow-Origin` from `ALLOWED_ORIGIN` or, in dev, request origin when localhost/https.
- **T012** – ... Fixture key in `tests/fixtures/apple-test-key.pem`.
```

**Why this matters:**
Stale or imprecise docs drive configuration mistakes and can create a false sense of security about origin restrictions.

---

## External References

- `https://nextjs.org/docs/app/building-your-application/routing/route-handlers` (accessed 2026-02-14)  
- `https://github.com/panva/jose/discussions/478` (accessed 2026-02-14)