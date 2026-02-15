# Apple Developer Token & JWT Deep Audit Findings

Audit Date: 2026-02-15T06:39:08Z  
Files Examined: 10  
Total Findings: 13

## Summary by Severity
- Critical: 0
- High: 4
- Medium: 6
- Low: 3

---

## Findings

### HIGH Finding #1: JWT omits Apple-recommended `origin` claim (web hardening)

**File:** `apps/api/src/lib/jwt.ts`  
**Lines:** 32-37  
**Category:** will-break

**Description:**
Apple’s Apple Music API / MusicKit guidance encourages adding an `origin` claim for web applications so the token is only valid for requests whose `Origin` header matches an allowed site origin. This implementation signs an empty payload (`new SignJWT({})`) and sets only standard claims (`iss`, `iat`, `exp`) plus header (`alg`, `kid`). As a result, minted Developer Tokens are not constrained to an allowed website at Apple’s validation layer, increasing risk that a token obtained from this endpoint can be replayed by unauthorized web origins.

**Code:**
```ts
const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256", kid: keyId })
  .setIssuer(teamId)
  .setIssuedAt()
  .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_VALIDITY_SECONDS)
  .sign(keyObject);
```

**Why this matters:**
Without `origin` constraint, a stolen/replayed Developer Token can be used from any origin (until expiry), which undermines a key web-specific protection Apple promotes for reducing token abuse.

---

### HIGH Finding #2: No rate limiting on Developer Token issuance (explicitly documented as missing)

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 9-16  
**Category:** will-break

**Description:**
The dev-token route mints a new Developer Token on every GET request with no throttling, per-IP limiting, per-origin limiting, or other abuse controls. Project documentation explicitly notes that rate limiting is not implemented yet.

**Code:**
```ts
const result = await handleDevToken();
const status = "error" in result ? 503 : 200;
...
return new Response(JSON.stringify(result), { status, headers });
```

**Why this matters:**
An attacker can generate sustained signing load (crypto + key parsing) and create operational cost/instability (DoS vector), and can mass-issue tokens for reuse elsewhere.

---

### HIGH Finding #3: Endpoint mints Developer Tokens for any unauthenticated caller; CORS is not an access-control boundary

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 9-16  
**Category:** will-break

**Description:**
There is no authentication/authorization check in the route handler; it returns `{ token }` to any caller that can reach the endpoint. Even with strict `Access-Control-Allow-Origin`, CORS only governs whether a browser allows JavaScript to read the response. Non-browser clients (server-to-server, curl, bots) can fetch the token regardless of `Origin` and regardless of whether `Access-Control-Allow-Origin` is set.

**Code:**
```ts
export async function GET(request: NextRequest) {
  const result = await handleDevToken();
  ...
  return new Response(JSON.stringify(result), { status, headers });
}
```

**Why this matters:**
If the intention is “only our app can obtain tokens,” relying on CORS alone does not enforce that. Tokens can be harvested directly from the public endpoint and replayed.

---

### HIGH Finding #4: Localhost CORS allowlist is vulnerable to origin-prefix spoofing (`startsWith`)

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 10-17  
**Category:** broken-logic

**Description:**
When `ALLOWED_ORIGIN` is unset, `getAllowOrigin` treats any `Origin` that *starts with* `http://localhost` or `http://127.0.0.1` as local and therefore allowed. This can be bypassed by attacker-controlled origins like `http://localhost.evil.com` (or `http://127.0.0.1.evil.com`), which match the prefix check but are not loopback hosts.

**Code:**
```ts
const isLocalOrigin =
  origin &&
  (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
...
return isLocalOrigin ? origin : null;
```

**Why this matters:**
In environments where `ALLOWED_ORIGIN` is missing (dev, preview, misconfigured prod), a malicious website with a crafted hostname can read the dev-token response from a victim’s browser if it can reach the endpoint.

---

### MEDIUM Finding #5: `ALLOWED_ORIGIN` accepts dangerous/invalid values (e.g. `"*"`, values with paths) without validation

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 9-16  
**Category:** will-break

**Description:**
`getAllowOrigin` returns the configured value (first comma-separated entry) after trimming and stripping only a trailing `/`. It does not validate that the value is a valid origin (scheme + host + optional port) and does not prevent `"*"`.

**Code:**
```ts
const configured = (process.env.ALLOWED_ORIGIN ?? "").trim();
if (configured) {
  const single = configured.split(",")[0].trim().replace(/\/$/, "");
  return single || (isLocalOrigin ? origin : null);
}
```

**Why this matters:**
- Setting `ALLOWED_ORIGIN="*"` would cause API responses to include `Access-Control-Allow-Origin: *`, enabling any website to read the dev-token response from browsers (no credentialed requests are used here).
- Setting `ALLOWED_ORIGIN` to a value with a path (e.g. `https://example.com/app`) produces an invalid/mismatched ACAO value and breaks legitimate browser access in subtle ways.

---

### MEDIUM Finding #6: No `Vary: Origin` despite dynamically varying `Access-Control-Allow-Origin`

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 20-27  
**Category:** will-break

**Description:**
When `ALLOWED_ORIGIN` is unset, `corsHeaders` echoes the request origin (for “local” origins). The response headers therefore vary by `Origin`, but no `Vary: Origin` header is added.

**Code:**
```ts
const headers: HeadersInit = { "Content-Type": contentType };
if (allowOrigin) {
  (headers as Record<string, string>)["Access-Control-Allow-Origin"] = allowOrigin;
}
```

**Why this matters:**
Intermediary caches (or any caching layer not respecting application intent) can incorrectly reuse a response across origins, leading to confusing failures or, in worse configurations, unintended origin exposure patterns.

---

### MEDIUM Finding #7: Error-path response omits explicit `no-store`/`no-cache` headers

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 17-23  
**Category:** will-break

**Description:**
The success/error-result path explicitly disables caching via `Cache-Control: no-store` and `Pragma: no-cache`, but the outer catch block (unexpected exceptions) does not set these cache headers.

**Code:**
```ts
} catch {
  const headers = corsHeaders(request) as Record<string, string>;
  return new Response(
    JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
    { status: 500, headers }
  );
}
```

**Why this matters:**
Inconsistent cache headers can allow unexpected caching of failure responses by clients/proxies, complicating recovery and debugging (and increasing the chance of stale error behavior).

---

### MEDIUM Finding #8: PEM normalization is incomplete for common env encodings and quoting patterns

**File:** `apps/api/src/lib/jwt.ts`  
**Lines:** 22-26  
**Category:** will-break

**Description:**
The code normalizes:
- literal `\\n` → newline
- actual CRLF / CR → newline

It does **not** normalize other common escaped variants such as literal `\\r\\n` or literal `\\r`, and does not strip wrapping quotes that some env systems/UI copy-pastes include. These patterns can cause `createPrivateKey` to throw, resulting in token issuance failure.

**Code:**
```ts
const normalizedPem = privateKeyPem
  .replace(/\\n/g, "\n")
  .replace(/\r\n/g, "\n")
  .replace(/\r/g, "\n");
```

**Why this matters:**
This is a brittle configuration surface: token minting can fail depending on how `APPLE_PRIVATE_KEY` is stored/escaped by the deployment platform or `.env` tooling.

---

### MEDIUM Finding #9: Key parsing occurs on every request; combined with no rate limiting increases DoS risk

**File:** `apps/api/src/lib/jwt.ts`  
**Lines:** 27-31  
**Category:** will-break

**Description:**
`createPrivateKey` runs for every call to `signDeveloperToken`. There is no memoization/caching of the parsed `KeyObject`, so repeated token requests perform repeated key parsing and object creation.

**Code:**
```ts
const keyObject = createPrivateKey({
  key: normalizedPem,
  format: "pem",
});
```

**Why this matters:**
Repeated crypto key parsing is unnecessary overhead and amplifies abuse potential when the endpoint is hammered (especially since there is also no rate limiting).

---

### MEDIUM Finding #10: `handleDevToken` suppresses error details without any logging, while message implies logs exist

**File:** `apps/api/src/routes/apple/dev-token.ts`  
**Lines:** 20-29  
**Category:** slop

**Description:**
`handleDevToken` catches all exceptions and returns a generic error message, but does not log the underlying error. The returned message instructs operators to “Check server configuration and logs,” but this function does not emit logs and the immediate call sites also swallow errors.

**Code:**
```ts
try {
  const token = await signDeveloperToken({ teamId, keyId, privateKeyPem: privateKey });
  return { token };
} catch {
  return { error: "Token signing failed. Check server configuration and logs." };
}
```

**Why this matters:**
Operational diagnosis becomes significantly harder: configuration issues (bad PEM formatting, wrong key type, runtime incompatibility) become opaque outages.

---

### LOW Finding #11: HTTP status code mapping collapses all functional errors to `503`

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 11-13  
**Category:** slop

**Description:**
The route sets `503` for any `{ error }` result from `handleDevToken`, including cases that are permanent misconfiguration (missing env) vs transient signing errors.

**Code:**
```ts
const result = await handleDevToken();
const status = "error" in result ? 503 : 200;
```

**Why this matters:**
Ambiguous status codes can mislead monitoring/alerting and may cause inappropriate automatic retries.

---

### LOW Finding #12: Tests only validate JWT “shape,” not required claims/headers

**File:** `apps/api/tests/dev-token.test.ts`  
**Lines:** 8-46  
**Category:** unfinished

**Description:**
The test asserts the token matches a basic three-segment regex and is non-empty, but does not decode/validate:
- protected header contains expected `alg`/`kid`
- payload contains correct `iss`, `iat`, `exp`
- `exp` respects Apple’s maximum validity window

**Code:**
```ts
const JWT_REGEX = /^[\w-]+\.[\w-]+\.[\w-]+$/;
...
expect(result.token).toMatch(JWT_REGEX);
```

**Why this matters:**
A wide range of regressions could still produce a “JWT-shaped” string while being invalid for Apple Music API, leading to production failures not caught by unit tests.

---

### LOW Finding #13: Repository contains a real PEM private key fixture (even if non-production)

**File:** `apps/api/tests/fixtures/apple-test-key.pem`  
**Lines:** 1-5  
**Category:** will-break

**Description:**
A valid EC private key is committed as a test fixture. While it appears intended as a non-production test key, committing any private key material can:
- violate repository/security policy expectations (“no private keys in repo”)
- trigger secret scanning / compliance tooling
- increase the chance of accidental reuse/misunderstanding by contributors

**Code:**
```pem
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

**Why this matters:**
Even “test-only” private keys are often treated as sensitive artifacts by automated tooling and by security review processes, generating noise and potential policy violations.

---

## External References

- Apple Developer (WWDC22) — “Meet Apple Music API and MusicKit” (mentions max 6 months expiry and encouraging `origin` claim for web). Accessed 2026-02-15: https://developer.apple.com/videos/play/wwdc2022/10148/  
- Stack Overflow — MusicKit JS developer token `origin` claim excerpt (secondary source quoting Apple docs). Accessed 2026-02-15: https://stackoverflow.com/questions/77624686/sending-developer-token-to-backend-how-can-i-hide-sensitive-data  
- Stack Overflow — Developer token required header/claims and max 6 months window (secondary source). Accessed 2026-02-15: https://stackoverflow.com/questions/78813772/what-do-we-use-for-the-android-musickit-developer-token  
- panva/jose discussion — recommends caching `createPrivateKey` output for repeated signing. Accessed 2026-02-15: https://github.com/panva/jose/discussions/158