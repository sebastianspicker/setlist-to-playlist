# Tests Deep Audit Findings

Audit Date: 2026-02-14T11:30:04Z  
Files Examined: 8  
Total Findings: 15

## Summary by Severity
- Critical: 0
- High: 7
- Medium: 7
- Low: 1

---

## Findings

### [HIGH] Finding #1: Web test suite is effectively a placeholder (no product code exercised)

**File:** `apps/web/tests/example.test.ts`  
**Lines:** 1-7  
**Category:** stub

**Description:**
The only web test asserts `1 + 1 === 2` and imports no application modules. This provides near-zero regression protection for the web app’s critical flows (setlist import UI, matching UI, playlist export UI, API wiring, MusicKit integration).

**Code:**
```typescript
describe('web app', () => {
  it('placeholder test', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Why this matters:**
The highest-risk user paths in the web app can break with no failing tests, creating a false sense of coverage.

---

### [HIGH] Finding #2: No tests cover MusicKit integration (core app functionality is untested)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 43-275  
**Category:** unfinished

**Description:**
There are no tests under `apps/web/tests/*.ts` (or other in-scope test folders) referencing or exercising `fetchDeveloperToken`, `initMusicKit`, `authorizeMusicKit`, `searchCatalog`, `createLibraryPlaylist`, or `addTracksToLibraryPlaylist`. This leaves critical behavior untested, including:
- Developer token fetch parsing and error handling (non-JSON, error payloads).
- Token caching/expiry behavior.
- Browser-only gating and MusicKit script load timeout behavior.
- Handling of MusicKit API `errors[]` responses for catalog search, playlist create, and add-tracks.
- Authorization gating and validation errors (invalid playlistId, invalid songIds).

**Code:**
```typescript
if (!res.ok || data.error || !data.token) {
  throw new Error(data.error ?? "Failed to get Developer Token");
}

if (!music.isAuthorized) {
  throw new Error("Not authorized. Please connect Apple Music first.");
}
```

**Why this matters:**
This module is on the critical path for “playlist export”; regressions here can break primary functionality without detection.

---

### [HIGH] Finding #3: No tests cover CORS allow-origin logic (security boundary untested)

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 7-27  
**Category:** unfinished

**Description:**
No tests in scope validate `getAllowOrigin` / `corsHeaders` behavior for:
- `ALLOWED_ORIGIN` unset vs set (including comma-separated values).
- `Origin` header absent/malformed.
- Localhost vs non-localhost origins.
- Ensuring `Access-Control-Allow-Origin` is omitted when disallowed.

**Code:**
```typescript
export function getAllowOrigin(origin: string | null): string | null {
  const configured = (process.env.ALLOWED_ORIGIN ?? "").trim();
  const isLocalOrigin =
    origin &&
    (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
  if (configured) {
    const single = configured.split(",")[0].trim();
    return single || (isLocalOrigin ? origin : null);
  }
  return isLocalOrigin ? origin : null;
}
```

**Why this matters:**
CORS is a primary control preventing unintended cross-origin access to token/proxy endpoints; regressions can introduce credential/token exposure risk.

---

### [HIGH] Finding #4: Next.js dev-token API route (GET/OPTIONS + CORS) has no tests

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 5-16  
**Category:** unfinished

**Description:**
There are no tests validating:
- `OPTIONS` preflight behavior (204 + correct headers).
- `GET` response status mapping (`503` on error vs `200` on token).
- Presence/absence of CORS headers based on request origin.

**Code:**
```typescript
export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

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
This route is the delivery mechanism for a sensitive developer token; behavior changes here can break auth flows or weaken origin restrictions without any test signal.

---

### [HIGH] Finding #5: Next.js setlist proxy API route (query handling + CORS) has no tests

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 13-30  
**Category:** unfinished

**Description:**
There are no tests validating:
- Query param behavior (`id` vs `url`, missing param → 400).
- Error-body shaping (`{ error }` only) vs success-body passthrough.
- CORS headers on both success and failure paths.
- `OPTIONS` preflight behavior.

**Code:**
```typescript
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? request.nextUrl.searchParams.get("url") ?? "";
  if (!id) {
    return new Response(
      JSON.stringify({ error: "Missing id or url query parameter" }),
      { status: 400, headers: corsHeaders(request) }
    );
  }

  const result = await handleSetlistProxy(id);
  const status = "error" in result ? result.status : result.status;
  const body = "error" in result ? { error: result.error } : result.body;

  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request),
  });
}
```

**Why this matters:**
This route fronts the setlist.fm proxy and is part of the app’s primary data-ingestion path; regressions can break setlist import or accidentally change what data is exposed cross-origin.

---

### [HIGH] Finding #6: Dev-token tests only validate “JWT-shaped string”, not token correctness or critical branches

**File:** `apps/api/tests/dev-token.test.ts`  
**Lines:** 8-47  
**Category:** slop

**Description:**
The “returns a JWT” test checks that the token is a non-empty string matching a 3-segment regex, but does not validate correctness-critical JWT properties such as:
- Protected header values (`alg`, `kid`).
- Payload issuer (`iss`), issued-at (`iat`), and expiration (`exp`) semantics.
- Expiration window expectations (code sets a 1-hour lifetime).
- Error handling when signing fails (e.g., invalid PEM) vs successful signing.
Additionally, newline normalization behavior in signing (literal `\\n`, CRLF, CR) is untested.

**Code:**
```typescript
expect(result.token).toBeTypeOf("string");
expect(result.token.length).toBeGreaterThan(0);
expect(result.token).toMatch(JWT_REGEX);
```

**Why this matters:**
A token can be “JWT-shaped” but still invalid for Apple MusicKit; tests may pass while production auth breaks or security-critical claims regress.

---

### [HIGH] Finding #7: `signDeveloperToken` behavior is untested directly (header/claims/newline normalization/expiry)

**File:** `apps/api/src/lib/jwt.ts`  
**Lines:** 4-37  
**Category:** unfinished

**Description:**
No tests in scope call `signDeveloperToken` directly to validate:
- Newline normalization in PEM handling (literal `\\n`, CRLF, CR) and error cases when PEM is malformed.
- That `kid` is in the protected header and `iss` is set correctly.
- That `iat` is set and `exp` is computed as intended.
- Token lifetime expectations tied to `TOKEN_VALIDITY_SECONDS`.

**Code:**
```typescript
const normalizedPem = privateKeyPem
  .replace(/\\n/g, "\n")
  .replace(/\r\n/g, "\n")
  .replace(/\r/g, "\n");

const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256", kid: keyId })
  .setIssuer(teamId)
  .setIssuedAt()
  .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_VALIDITY_SECONDS)
  .sign(keyObject);
```

**Why this matters:**
JWT issuance is a security-critical and availability-critical path; missing direct tests makes regressions (especially around PEM formatting and claims) harder to detect.

---

### [MEDIUM] Finding #8: setlist proxy tests do not validate request URL/headers, so major regressions can slip

**File:** `apps/api/tests/setlist-proxy.test.ts`  
**Lines:** 55-79  
**Category:** slop

**Description:**
The “fetch succeeds” test stubs `fetch` and asserts only the returned body/status, but does not assert that `fetch` is called with the correct:
- Endpoint URL shape (base URL + `/setlist/{id}` + encoding).
- Headers (`x-api-key`, `Accept: application/json`).

This means the test can pass even if the proxy requests the wrong host/path or omits authentication headers.

**Code:**
```typescript
vi.stubGlobal(
  "fetch",
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockSetlist),
    } as Response)
  )
);

const result = await handleSetlistProxy("63de4613");
expect("body" in result).toBe(true);
```

**Why this matters:**
The proxy can silently become non-functional (or behave incorrectly) while tests remain green.

---

### [MEDIUM] Finding #9: Global `fetch` stub is not explicitly restored (cross-test pollution risk)

**File:** `apps/api/tests/setlist-proxy.test.ts`  
**Lines:** 36-39, 63-71  
**Category:** will-break

**Description:**
The test suite uses `vi.stubGlobal("fetch", ...)` but does not explicitly undo the global stub (no explicit restoration of `globalThis.fetch` is present in this file). The `afterEach` calls `vi.restoreAllMocks()`, but there is no explicit global-unstub call, creating a risk that `fetch` remains stubbed for subsequent tests (especially if Vitest’s global-stub restoration is not covered by `restoreAllMocks()` in the configured environment).

**Code:**
```typescript
afterEach(() => {
  process.env.SETLISTFM_API_KEY = origKey;
  vi.restoreAllMocks();
});

vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true } as Response)));
```

**Why this matters:**
Cross-test contamination can cause unrelated tests to pass/fail depending on execution order, making CI flaky and masking real regressions.

---

### [MEDIUM] Finding #10: 429 retry test likely incurs real-time backoff and does not verify retry behavior

**File:** `apps/api/tests/setlist-proxy.test.ts`  
**Lines:** 100-118  
**Category:** will-break

**Description:**
The test name claims “on 429 after retries”, but it does not:
- Assert `fetch` call count (to prove retries happened).
- Control or virtualize timers.

The implementation includes backoff waits between retries (in `apps/api/src/lib/setlistfm.ts`), which can cause the test to take real time and become slow/flaky under CI timing constraints.

**Code:**
```typescript
vi.stubGlobal(
  "fetch",
  vi.fn(() =>
    Promise.resolve({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Too Many Requests"),
      statusText: "Too Many Requests",
    } as Response)
  )
);

const result = await handleSetlistProxy("63de4614");
expect("error" in result && result.status).toBe(429);
expect("error" in result && result.error).toMatch(/rate limit/i);
```

**Why this matters:**
Slow/flaky tests reduce confidence in the suite and the test does not actually prove the retry logic works as intended.

---

### [MEDIUM] Finding #11: Critical `fetchSetlistFromApi` branches (cache, non-JSON ok body, error parsing) are untested

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 36-137  
**Category:** unfinished

**Description:**
No tests in scope exercise `fetchSetlistFromApi` directly, leaving important behavior unvalidated:
- Cache hit/miss behavior and TTL expiration paths (`getCached` / `setCached`).
- Eviction threshold behavior (`CACHE_EVICT_THRESHOLD`, `evictExpired`).
- Handling of `res.ok` with non-JSON bodies (returns `{ ok:false, status:502, ... }`).
- Parsing error bodies that may be JSON or plain text.
- Retry loop/backoff logic and final error mapping.

**Code:**
```typescript
const cached = getCached(setlistId);
if (cached !== null) return { ok: true, body: cached };

if (res.ok) {
  try {
    body = (await res.json()) as unknown;
  } catch {
    return { ok: false, status: 502, message: "Invalid response from setlist.fm (non-JSON body)." };
  }
}
```

**Why this matters:**
This is a core reliability layer for setlist import; subtle regressions here can degrade availability, correctness, or performance without test coverage.

---

### [MEDIUM] Finding #12: `parseSetlistIdFromInput` has untested branches and edge cases

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 8-33  
**Category:** unfinished

**Description:**
While there are some tests for plain IDs and a canonical URL form, there is no coverage for several branches/edge cases in the implementation, including:
- Inputs containing `setlist.fm` but lacking a URL scheme (the code attempts to prepend `https://`).
- URL variants with query strings/fragments.
- Fallback behaviors that accept hyphenated segments (`withoutHtml` branch) and their constraints.
- Raw-ID regex limits (4–64 chars; `[a-f0-9-]`), including boundary lengths and uppercase.

**Code:**
```typescript
const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
const match = path.match(/-([a-f0-9]{4,12})\.html$/i);
if (match) return match[1];
// fallback: last path segment without .html
const segment = path.split("/").filter(Boolean).pop() ?? "";
const withoutHtml = segment.replace(/\.html$/i, "");
```

**Why this matters:**
Setlist ID parsing is an input-validation boundary; incorrect permissiveness or strictness can break imports or allow unexpected IDs through.

---

### [MEDIUM] Finding #13: `normalizeTrackName` tests miss implemented behavior (`- live` suffix and dash normalization)

**File:** `packages/core/src/matching/normalize.ts`  
**Lines:** 5-16  
**Category:** unfinished

**Description:**
Existing tests cover parentheticals and `feat.`/`ft.` removal, but do not cover behavior that is explicitly implemented:
- `- live` suffix stripping.
- Collapsing of hyphen/en-dash/em-dash sequences into spaces.
- Guard behavior for non-string inputs (function returns `""`).

**Code:**
```typescript
.replace(/\s*-\s*live\s*$/i, "")
.replace(/[\s\-–—]+/g, " ")
```

**Why this matters:**
Normalization directly affects search/matching quality; regressions can degrade match rates and user outcomes without a failing test.

---

### [MEDIUM] Finding #14: `buildSearchQuery` length cap and truncation behavior are untested

**File:** `packages/core/src/matching/search-query.ts`  
**Lines:** 3-15  
**Category:** unfinished

**Description:**
Tests cover basic concatenation and trimming, but do not cover the implemented max-length constraint and its interactions:
- Track and artist are individually sliced to `MAX_QUERY_LENGTH` (200).
- Potential edge cases where truncation occurs mid-token or leaves unusual whitespace patterns.

**Code:**
```typescript
const MAX_QUERY_LENGTH = 200;

export function buildSearchQuery(trackName: string, artistName?: string): string {
  const track = normalizeTrackName(trackName).slice(0, MAX_QUERY_LENGTH);
  const artist = (artistName?.trim() ?? "").slice(0, MAX_QUERY_LENGTH);
  const parts = [track, artist].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
```

**Why this matters:**
Query-building is a critical dependency for Apple Music catalog search; incorrect truncation can silently reduce match accuracy.

---

### [MEDIUM] Finding #15: `mapSetlistFmToSetlist` tests miss invalid song-item filtering and empty-set dropping behavior

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 20-35  
**Category:** unfinished

**Description:**
Tests cover happy-path mapping and some invalid top-level inputs, but do not cover important implemented behaviors:
- Filtering out invalid song items (`null`, non-objects, objects missing `name`).
- Skipping sets that end up with zero valid entries.
- Behavior when `raw.set` contains non-objects or when `song` is not an array.

**Code:**
```typescript
const songs = Array.isArray(fmSet.song) ? fmSet.song : [];
const entries: SetlistEntry[] = songs
  .filter((s): s is SetlistFmSong => s != null && typeof s === "object" && "name" in s)
  .map((s) => ({
    name: s.name ?? "",
    artist: artistName || undefined,
    info: s.info ?? undefined,
  }));
if (entries.length > 0) sets.push(entries);
```

**Why this matters:**
Real-world API responses can contain partial/irregular data; these guards are correctness-critical and should be protected by tests.

---

### [LOW] Finding #16: Test fixture contains private key material (even if “test-only”, it’s sensitive-looking)

**File:** `apps/api/tests/fixtures/apple-test-key.pem`  
**Lines:** 1-5  
**Category:** slop

**Description:**
A PEM private key fixture is stored in-repo for tests. Even if it’s intended to be non-production, it looks like real key material and can be accidentally reused or mishandled. The audit scope tests also do not verify any guardrails around fixture usage (e.g., that it is only used in test environments).

**Code:**
```typescript
-----BEGIN PRIVATE KEY-----
[REDACTED KEY MATERIAL]
-----END PRIVATE KEY-----
```

**Why this matters:**
Private keys in repositories (even test keys) are high-risk artifacts from an operational hygiene perspective and can cause confusion or unsafe copy/paste into production contexts.