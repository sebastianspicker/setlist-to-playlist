# Tests Deep Audit Findings

Audit Date: 2026-02-15T07:57:10Z  
Files Examined: 22  
Total Findings: 17

## Summary by Severity
- Critical: 0
- High: 9
- Medium: 5
- Low: 3

---

## Findings

### [LOW] Finding #1: `apps/web` test suite is placeholder-only (no coverage of critical web paths)

**File:** `apps/web/tests/example.test.ts`  
**Lines:** 1-6  
**Category:** slop

**Description:**
The only in-scope `apps/web` test is a generic arithmetic assertion and does not import or exercise any app code. This means there is effectively **no test coverage** for web critical paths (MusicKit flows, setlist import/matching/export UI, Next.js route handlers, CORS helper, API URL building).

**Code:**
```ts
import { describe, it, expect } from 'vitest';

describe('web app', () => {
  it('placeholder test', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Why this matters:**
Regressions in the web app’s main flows can ship undetected because the test suite does not execute any of the app’s logic.

---

### [LOW] Finding #2: `apps/api` “health” test is minimal and does not validate important behavior

**File:** `apps/api/tests/example.test.ts`  
**Lines:** 1-9  
**Category:** slop

**Description:**
This is a basic smoke test for `handleHealth()` that only checks `timestamp` is defined (not shape/format) and doesn’t validate any time-related invariants.

**Code:**
```ts
it('health returns ok', () => {
  const res = handleHealth();
  expect(res.status).toBe('ok');
  expect(res.timestamp).toBeDefined();
});
```

**Why this matters:**
If `timestamp` becomes an invalid value (wrong format, non-ISO, empty string), this test would still pass, allowing API consumers to break.

---

### [LOW] Finding #3: Unused `beforeEach` import in setlist proxy tests

**File:** `apps/api/tests/setlist-proxy.test.ts`  
**Lines:** 1  
**Category:** slop

**Description:**
`beforeEach` is imported but never used, indicating test-code hygiene issues and increasing the chance of stale or incomplete setup patterns.

**Code:**
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
```

**Why this matters:**
Test suites with small hygiene issues tend to accumulate hidden state problems and misleading coverage over time.

---

### [HIGH] Finding #4: `vi.stubGlobal("fetch", ...)` is not reliably undone; potential cross-test contamination

**File:** `apps/api/tests/setlist-proxy.test.ts`  
**Lines:** 36-39, 63-71, 83-93, 102-112  
**Category:** will-break

**Description:**
The suite stubs `fetch` globally via `vi.stubGlobal("fetch", ...)` but only calls `vi.restoreAllMocks()` in `afterEach`. In Vitest, restoring mocks does not necessarily revert stubbed globals, which can make other tests order-dependent (especially if additional suites rely on real `fetch` behavior or different stubs).

**Code:**
```ts
afterEach(() => {
  process.env.SETLISTFM_API_KEY = origKey;
  vi.restoreAllMocks();
});

// ...
vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockSetlist) } as Response)));

// ...
vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("Not found"), statusText: "Not Found" } as Response)));

// ...
vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 429, text: () => Promise.resolve("Too Many Requests"), statusText: "Too Many Requests" } as Response)));
```

**Why this matters:**
A single leaked global stub can cause unrelated tests to pass/fail incorrectly, masking real regressions or creating flaky CI.

---

### [MEDIUM] Finding #5: 429 retry test likely incurs real backoff waits and does not prove retries occurred

**File:** `apps/api/tests/setlist-proxy.test.ts`  
**Lines:** 100-118  
**Category:** will-break

**Description:**
The test name claims “after retries”, but it does not assert call counts or timing behavior, and the underlying implementation performs real `setTimeout` backoff for 429s. This can make the test suite slow and still pass even if retry logic is removed or altered (as long as the final 429 message remains).

**Code:**
```ts
it("returns rate-limit message on 429 after retries", async () => {
  process.env.SETLISTFM_API_KEY = "test-key";
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 429, text: () => Promise.resolve("Too Many Requests"), statusText: "Too Many Requests" } as Response)));

  const result = await handleSetlistProxy("63de4614");
  expect("error" in result).toBe(true);
  expect("error" in result && result.status).toBe(429);
  expect("error" in result && result.error).toMatch(/rate limit/i);
});
```

**Why this matters:**
Slow and non-specific tests increase CI time and can miss regressions in retry/backoff behavior.

---

### [HIGH] Finding #6: Proxy tests do not assert outgoing request URL/headers; mock does not validate critical API-key handling

**File:** `apps/api/tests/setlist-proxy.test.ts`  
**Lines:** 55-79  
**Category:** will-break

**Description:**
The successful proxy test stubs `fetch` but never asserts it was called with:
- the correct setlist.fm endpoint path (`/setlist/{id}`)
- `x-api-key` header usage (vs accidental query param leakage)
- correct `Accept` header
- correct `encodeURIComponent` behavior for IDs

As written, the test would still pass if the implementation calls the wrong URL, omits headers, or accidentally leaks the API key into the URL (so long as the stub returns `ok: true`).

**Code:**
```ts
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
if ("body" in result) {
  expect(result.body).toEqual(mockSetlist);
  expect(result.status).toBe(200);
}
```

**Why this matters:**
The proxy’s core safety property is “API key is server-side only and sent via headers”; missing assertions here can allow silent regressions that break functionality or increase leakage risk.

---

### [HIGH] Finding #7: No tests cover `fetchSetlistFromApi()` critical branches (cache, invalid JSON, JSON error parsing, retry/backoff)

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 38-140  
**Category:** will-break

**Description:**
`fetchSetlistFromApi()` contains multiple critical behaviors (cache TTL, eviction threshold logic, 429 retry/backoff, parsing error bodies that may be JSON, and a 502 path for non-JSON success responses). None of these are directly tested in-scope; current coverage only calls `handleSetlistProxy()` and checks final outputs for a small set of statuses.

**Code:**
```ts
const cache = new Map<string, { body: unknown; expires: number }>();

export async function fetchSetlistFromApi(setlistId: string, apiKey: string): Promise<FetchSetlistResult> {
  const cached = getCached(setlistId);
  if (cached !== null) return { ok: true, body: cached };

  // ...
  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    const res = await fetch(url, { headers });

    if (res.ok) {
      let body: unknown;
      try {
        body = (await res.json()) as unknown;
      } catch {
        return { ok: false, status: 502, message: "Invalid response from setlist.fm (non-JSON body)." };
      }
      setCached(setlistId, body);
      return { ok: true, body };
    }

    const text = await res.text();
    try {
      const json = JSON.parse(text) as { message?: string };
      lastMessage = json.message ?? (text || res.statusText);
    } catch {
      lastMessage = text || res.statusText;
    }

    if (res.status === 429 && attempt < MAX_RETRIES_429) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS * (attempt + 1)));
      continue;
    }
    break;
  }
  // ...
}
```

**Why this matters:**
Most production failures for the setlist proxy will occur in these branches (rate limits, malformed upstream payloads, caching behavior, error message parsing). Untested branches are prime regression points.

---

### [HIGH] Finding #8: Missing tests for `handleSetlistProxy()` status mapping and error truncation behaviors

**File:** `apps/api/src/routes/setlist/proxy.ts`  
**Lines:** 36-46  
**Category:** will-break

**Description:**
The route maps upstream status codes to output statuses (notably mapping `>=500` to `503`) and truncates overly-long error messages to 500 chars. Current tests cover `503` (missing key), `400` (invalid input), `200` (ok), `404`, `429` — but do not cover:
- upstream `500/502` mapping behavior
- truncation behavior for long messages
- behavior when `result.message` is empty (fallback message formatting)

**Code:**
```ts
const status =
  result.status === 404 ? 404 : result.status >= 500 ? 503 : result.status;
const MAX_ERROR_MESSAGE_LENGTH = 500;
const message =
  typeof result.message === "string" && result.message.length > MAX_ERROR_MESSAGE_LENGTH
    ? result.message.slice(0, MAX_ERROR_MESSAGE_LENGTH) + "…"
    : result.message;
return { error: message, status };
```

**Why this matters:**
These behaviors directly affect client UX and resilience during upstream failures; regressions can lead to misleading status codes or oversized error payloads.

---

### [HIGH] Finding #9: `parseSetlistIdFromInput()` tests miss security-relevant URL host edge cases and fallback branches

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 8-29  
**Category:** will-break

**Description:**
The parser has complex branching: it treats inputs containing `"setlist.fm"` as URL-like, constructs a URL when scheme is missing, and checks `url.hostname.toLowerCase().includes("setlist.fm")`. In-scope tests validate only a canonical setlist.fm URL and a few ID formats, but do not cover:
- host confusion cases (e.g. subdomains or hostnames containing `setlist.fm` as a substring)
- scheme-less inputs that include `setlist.fm` (triggering the URL branch)
- fallback extraction logic for last path segments (lines 21-26)
- cases where `.match(/-([a-f0-9]{4,12})\.html$/i)` fails but fallback succeeds

**Code:**
```ts
if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.includes("setlist.fm")) {
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!url.hostname.toLowerCase().includes("setlist.fm")) return null;
    const match = url.pathname.match(/-([a-f0-9]{4,12})\.html$/i);
    if (match) return match[1];
    const segment = url.pathname.split("/").filter(Boolean).pop() ?? "";
    const withoutHtml = segment.replace(/\.html$/i, "");
    const idPart = withoutHtml.split("-").pop();
    if (idPart && /^[a-f0-9]{4,12}$/i.test(idPart)) return idPart;
    if (withoutHtml && /^[a-f0-9-]+$/i.test(withoutHtml)) return withoutHtml;
  } catch {
    return null;
  }
  return null;
}
```

**Why this matters:**
Parsing is a primary input-validation boundary for the proxy. Untested host/URL edge cases can allow regressions that accept malformed inputs or reject valid ones.

---

### [HIGH] Finding #10: Dev token tests only validate “JWT-like string”; no coverage of required JWT claims/header fields or TTL

**File:** `apps/api/tests/dev-token.test.ts`  
**Lines:** 8-10, 35-46  
**Category:** will-break

**Description:**
The success case checks only that the token is a non-empty string matching a 3-segment regex. It does **not** validate:
- protected header fields (e.g. `alg`, `kid`)
- issuer (`iss`)
- presence/shape of `iat` and `exp`
- that `exp` is about 1 hour after issuance (as implemented)
- that PEM newline normalization works for escaped `\\n` variants

**Code:**
```ts
/** JWT shape: three base64url segments separated by dots */
const JWT_REGEX = /^[\w-]+\.[\w-]+\.[\w-]+$/;

const result = await handleDevToken();
expect("token" in result).toBe(true);
if ("token" in result) {
  expect(result.token).toBeTypeOf("string");
  expect(result.token.length).toBeGreaterThan(0);
  expect(result.token).toMatch(JWT_REGEX);
}
```

**Why this matters:**
A token can be “JWT-shaped” but still unusable for MusicKit (wrong `alg`, missing `kid`, wrong `iss`, bad `exp`). These would be production-breaking regressions not caught by tests.

---

### [MEDIUM] Finding #11: `handleDevToken()` missing coverage for whitespace-only env vars and signing failure branch

**File:** `apps/api/src/routes/apple/dev-token.ts`  
**Lines:** 11-29  
**Category:** will-break

**Description:**
`handleDevToken()` explicitly trims env vars and returns a generic `{ error }` on signing failure. In-scope tests cover only:
- missing env (fully deleted)
- happy-path signing with a fixture key

They do not cover:
- env vars present but whitespace-only (trim-to-empty)
- `signDeveloperToken` throwing (catch branch)

**Code:**
```ts
const teamId = process.env.APPLE_TEAM_ID?.trim();
const keyId = process.env.APPLE_KEY_ID?.trim();
const privateKey = process.env.APPLE_PRIVATE_KEY?.trim();

if (!teamId || !keyId || !privateKey) {
  return { error: "Missing Apple credentials in environment" };
}

try {
  const token = await signDeveloperToken({ teamId, keyId, privateKeyPem: privateKey });
  return { token };
} catch {
  return { error: "Token signing failed. Check server configuration and logs." };
}
```

**Why this matters:**
These are the two most common operational failure modes (misconfigured env and invalid key material). Without tests, regressions can change behavior or error messaging unexpectedly.

---

### [HIGH] Finding #12: No tests for CORS policy helper (`getAllowOrigin`, OPTIONS preflight headers)

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 8-43  
**Category:** will-break

**Description:**
CORS behavior is a security boundary for routes serving tokens and proxying setlist.fm. There are no in-scope tests that exercise:
- `ALLOWED_ORIGIN` trimming / first-origin selection
- trailing-slash normalization
- localhost-only behavior when `ALLOWED_ORIGIN` is unset
- that OPTIONS responses include required preflight headers

**Code:**
```ts
export function getAllowOrigin(origin: string | null): string | null {
  const configured = (process.env.ALLOWED_ORIGIN ?? "").trim();
  const isLocalOrigin =
    origin && (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
  if (configured) {
    const single = configured.split(",")[0].trim().replace(/\/$/, "");
    return single || (isLocalOrigin ? origin : null);
  }
  return isLocalOrigin ? origin : null;
}

export function corsHeadersForOptions(request: NextRequest): HeadersInit {
  const origin = request.headers.get("origin");
  const allowOrigin = getAllowOrigin(origin);
  const headers: Record<string, string> = {};
  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return headers;
}
```

**Why this matters:**
A small regression in CORS logic can either break legitimate clients (too strict) or widen token/proxy access unexpectedly (too permissive). With no tests, these changes are likely to slip through.

---

### [HIGH] Finding #13: No tests for Next.js route handlers (dev-token, setlist proxy, health), including CORS + query validation behavior

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 5-43  
**Category:** will-break

**Description:**
There are no in-scope tests validating route-handler behavior for:
- required query param (`id` or `url`) handling
- max input length enforcement
- response status selection
- CORS headers on GET and OPTIONS
- try/catch fallback error shape

This is especially critical because these handlers are the externally reachable HTTP boundary.

**Code:**
```ts
const MAX_SETLIST_INPUT_LENGTH = 2000;

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeadersForOptions(request) });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? request.nextUrl.searchParams.get("url") ?? "";
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id or url query parameter" }), {
      status: 400,
      headers: corsHeaders(request),
    });
  }
  if (id.length > MAX_SETLIST_INPUT_LENGTH) {
    return new Response(JSON.stringify({ error: "Input too long. Use setlist ID or a shorter setlist.fm URL (max 2000 characters)." }), {
      status: 400,
      headers: corsHeaders(request),
    });
  }

  try {
    const result = await handleSetlistProxy(id);
    const status = "error" in result ? result.status : result.status;
    const body = "error" in result ? { error: result.error } : result.body;
    return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
  } catch {
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500,
      headers: corsHeaders(request),
    });
  }
}
```

**Why this matters:**
These handlers are responsible for correct HTTP semantics and cross-origin behavior. Without tests, regressions can break clients or weaken boundary guarantees.

---

### [HIGH] Finding #14: No tests for MusicKit client flows (token fetching cache, script-load wait, catalog search, playlist create/add)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 52-275  
**Category:** will-break

**Description:**
There is no in-scope coverage for the MusicKit integration, including multiple critical flows and error paths:
- developer token fetch and caching TTL behavior (`fetchDeveloperToken`)
- handling non-JSON token API responses
- waiting for MusicKit script availability and timeout behavior (`waitForMusicKit`)
- one-time configuration logic (`initMusicKit`) and failure modes when `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` is unset
- catalog search error parsing (`errors[]`) and caching/eviction behavior
- authorization gating for creating playlists and adding tracks
- input validation and error behavior for `addTracksToLibraryPlaylist` (invalid IDs, empty arrays)

**Code:**
```ts
export async function fetchDeveloperToken(): Promise<string> {
  if (isTokenValid()) return cachedToken!;
  // ...
  const res = await fetch(devTokenUrl());
  let data: { token?: string; error?: string };
  try {
    data = (await res.json()) as { token?: string; error?: string };
  } catch {
    throw new Error("Invalid response from Developer Token API (non-JSON).");
  }
  if (!res.ok || data.error || !data.token) {
    throw new Error(data.error ?? "Failed to get Developer Token");
  }
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
  return cachedToken;
}

// ...
export async function searchCatalog(term: string, limit = 5): Promise<AppleMusicTrack[]> {
  // cache + eviction + MusicKit API call + errors[] handling
}

// ...
export async function createLibraryPlaylist(name: string): Promise<CreatePlaylistResult> {
  const music = await initMusicKit();
  if (!music.isAuthorized) throw new Error("Not authorized. Please connect Apple Music first.");
  // ...
}

export async function addTracksToLibraryPlaylist(playlistId: string, songIds: string[]): Promise<void> {
  if (songIds.length === 0) return;
  if (!playlistId?.trim()) throw new Error("Invalid playlist ID");
  // ...
  if (!music.isAuthorized) throw new Error("Not authorized. Please connect Apple Music first.");
  // ...
  if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
    throw new Error(`Adding tracks to playlist failed: ${detail}`);
  }
  if (validIds.length < songIds.length) {
    throw new Error(`${dropped} of ${songIds.length} IDs were invalid and skipped; ${validIds.length} tracks added.`);
  }
}
```

**Why this matters:**
MusicKit flows are core product functionality. Untested client logic here is likely to break in production with no early warning (especially around auth gating, script timing, and Apple API error formats).

---

### [MEDIUM] Finding #15: `normalizeTrackName()` tests miss several important branches and normalization behaviors

**File:** `packages/core/src/matching/normalize.ts`  
**Lines:** 5-18  
**Category:** will-break

**Description:**
Current tests cover parentheticals, unbalanced trailing `(`, feat/ft stripping, empty input, and basic space collapse. They do not cover:
- `- live` suffix stripping (line 13)
- collapsing of hyphen/en-dash/em-dash sequences into spaces (line 16)
- multiple dash variants and combinations with surrounding whitespace

**Code:**
```ts
const s = name
  .replace(/\s*\([^)]*\)\s*/g, " ")
  .replace(/\s*\([^)]*$/g, " ")
  .replace(/\s*-\s*live\s*$/i, "")
  .replace(/\s*feat\.?\s*[^-]+(?:-\s*[^-]+)*/gi, "")
  .replace(/\s*ft\.?\s*[^-]+(?:-\s*[^-]+)*/gi, "")
  .replace(/[\s\-–—]+/g, " ")
  .trim();
```

**Why this matters:**
Normalization quality directly impacts catalog search matching. Untested normalization branches can regress silently and degrade match rates.

---

### [MEDIUM] Finding #16: `buildSearchQuery()` tests do not cover length-capping behavior (MAX_QUERY_LENGTH) or extreme inputs

**File:** `packages/core/src/matching/search-query.ts`  
**Lines:** 3-15  
**Category:** will-break

**Description:**
Implementation caps both normalized track and artist to 200 chars. Current tests validate composition and trimming but do not validate the cap or behavior with very long strings.

**Code:**
```ts
const MAX_QUERY_LENGTH = 200;

export function buildSearchQuery(trackName: string, artistName?: string): string {
  const track = normalizeTrackName(trackName).slice(0, MAX_QUERY_LENGTH);
  const artist = (artistName?.trim() ?? "").slice(0, MAX_QUERY_LENGTH);
  const parts = [track, artist].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
```

**Why this matters:**
Query length controls are an API-compatibility boundary. Regressions could reintroduce overly-long queries that fail against upstream limits.

---

### [MEDIUM] Finding #17: `mapSetlistFmToSetlist()` tests miss invalid song item filtering and `info` mapping nuances

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 23-35  
**Category:** will-break

**Description:**
The mapper includes defensive filtering for song items that are null/non-object/missing `name` to avoid runtime throws, and maps `info` via `s.info ?? undefined` (which preserves empty strings). Current tests do not cover:
- sets with `song` arrays containing `null`, primitives, objects without `name`
- ensuring no throw occurs and filtering behaves as intended
- behavior of `info` mapping when `info` is `""` vs `undefined`

**Code:**
```ts
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
setlist.fm payloads can be inconsistent. Untested defensive mapping can regress into runtime crashes or subtle data-loss/shape changes that break downstream matching/export logic.