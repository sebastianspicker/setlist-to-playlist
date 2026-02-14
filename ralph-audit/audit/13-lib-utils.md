```markdown
# Lib & Utils Deep Audit Findings

Audit Date: 2026-02-14T12:42:13+01:00  
Files Examined: 20  
Total Findings: 18

## Summary by Severity
- Critical: 3
- High: 3
- Medium: 4
- Low: 8

---

## Findings

### [CRITICAL] Finding #1: Localhost CORS allowlist check is prefix-based and spoofable

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 7-17  
**Category:** will-break

**Description:**
`getAllowOrigin()` treats any Origin string that *starts with* `http://localhost` or `http://127.0.0.1` as a “local origin”. This can be bypassed by attacker-controlled origins like `http://localhost.evil.com` (or similar prefix tricks), causing `Access-Control-Allow-Origin` to be returned for an unintended origin whenever `ALLOWED_ORIGIN` is unset (or when `configured.split(",")[0]` is empty and fallback logic applies).

**Code:**
```ts
const isLocalOrigin =
  origin &&
  (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
...
return isLocalOrigin ? origin : null;
```

**Why this matters:**
This is a CORS-origin validation bug that can accidentally authorize cross-origin access for non-local origins, which is especially risky for API routes returning tokens or proxying authenticated requests.

---

### [HIGH] Finding #2: CORS helper omits key headers (preflight and caching behavior may break)

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 19-26  
**Category:** will-break

**Description:**
`corsHeaders()` only sets `Content-Type` and (optionally) `Access-Control-Allow-Origin`. It does not set other commonly required CORS headers like `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, `Access-Control-Max-Age`, nor `Vary: Origin`.

**Code:**
```ts
export function corsHeaders(request: NextRequest, contentType = "application/json"): HeadersInit {
  const origin = request.headers.get("origin");
  const allowOrigin = getAllowOrigin(origin);
  const headers: HeadersInit = { "Content-Type": contentType };
  if (allowOrigin) {
    (headers as Record<string, string>)["Access-Control-Allow-Origin"] = allowOrigin;
  }
  return headers;
}
```

**Why this matters:**
Depending on how callers use these API routes (custom headers, non-simple requests), browsers may fail CORS preflights. Missing `Vary: Origin` can also produce incorrect caching behavior in shared caches/CDNs (serving an allow-origin response intended for one origin to another).

---

### [MEDIUM] Finding #3: `ALLOWED_ORIGIN` supports comma-separated input but only the first origin is used

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 12-15  
**Category:** slop

**Description:**
When `ALLOWED_ORIGIN` is set, the code splits on commas and uses only the first entry. Any additional configured origins are ignored silently. The behavior also falls back to `origin` only when `single` is falsy, which can mask misconfigurations (e.g., `ALLOWED_ORIGIN=" ,https://example.com"`).

**Code:**
```ts
if (configured) {
  const single = configured.split(",")[0].trim();
  return single || (isLocalOrigin ? origin : null);
}
```

**Why this matters:**
Multi-origin deployments (or staging + prod) can be configured incorrectly without obvious signals, leading to unexpected CORS failures.

---

### [CRITICAL] Finding #4: MusicKit API usage likely references a non-existent property chain (`music.music.api`)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 27-35, 168-203, 210-236, 238-275  
**Category:** will-break

**Description:**
The code models the MusicKit instance as having a nested `music.music.api(...)` function, and all catalog search / playlist create / add-tracks operations call `music.music.api(...)`. Official MusicKit JS examples show API calls made via `music.api.*` (e.g., `music.api.search(...)`, `music.api.library.*(...)`), not `music.music.api(...)`.

If the real runtime instance does not include `music.music.api`, these calls will throw at runtime (e.g., `TypeError: Cannot read properties of undefined`).

**Code:**
```ts
interface MusicKitInstance {
  ...
  music: {
    api: (path: string, options?: { method?: string; data?: unknown }) => Promise<unknown>;
  };
}
...
const data = (await music.music.api(path)) as { ... };
...
const res = (await music.music.api(path, { method: "POST", data: body })) as { ... };
```

**Why this matters:**
This is a fundamental integration risk: search and playlist export features depend on these calls and may crash immediately if the API surface differs from what this wrapper assumes.

---

### [CRITICAL] Finding #5: Developer token “refresh” cache is ineffective because MusicKit is never reconfigured after first init

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 43-70, 96-122  
**Category:** will-break

**Description:**
The module implements a TTL-based developer-token cache (comment says “server token is 1h; refresh 5min before”), but `initMusicKit()` returns early once `configuredInstance` is set and does not fetch/refresh the developer token again, nor reconfigure MusicKit with a new token after initialization.

**Code:**
```ts
const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes
...
export async function initMusicKit(): Promise<MusicKitInstance> {
  if (configuredInstance) return configuredInstance;
  ...
  const token = await fetchDeveloperToken();
  const MusicKit = await waitForMusicKit();
  MusicKit.configure({ developerToken: token, ... });
  configuredInstance = MusicKit.getInstance();
  return configuredInstance;
}
```

**Why this matters:**
If developer tokens are short-lived (as the code comments imply), the app can degrade after token expiration during long-lived sessions: API calls may begin failing even though the code appears to have a refresh strategy.

---

### [HIGH] Finding #6: MusicKit initialization hard-fails on `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`, but official configure examples do not require `appId`

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 103-116  
**Category:** will-break

**Description:**
`initMusicKit()` throws if `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` is unset/blank and passes it as `appId` into `MusicKit.configure(...)`. Official examples demonstrate configuring MusicKit with `developerToken` and `app: { name, build }` (and optionally `storefrontId`), without an `appId` field.

This creates two risks:
1) the app may refuse to run in otherwise-valid configurations, and  
2) passing an unsupported/ignored option can provide misleading confidence that `appId` is being used.

**Code:**
```ts
if (!APPLE_MUSIC_APP_ID || APPLE_MUSIC_APP_ID.trim() === "") {
  throw new Error("NEXT_PUBLIC_APPLE_MUSIC_APP_ID is required for MusicKit...");
}
...
const configureResult = MusicKit.configure({
  developerToken: token,
  app: { name: "Setlist to Playlist", build: "1" },
  appId: APPLE_MUSIC_APP_ID,
});
```

**Why this matters:**
This can block the entire Apple Music flow at runtime due to environment configuration, and it may not correspond to the actual requirements of the MusicKit JS SDK.

---

### [HIGH] Finding #7: `addTracksToLibraryPlaylist()` throws after successful partial adds when any IDs are invalid

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 242-274  
**Category:** broken-logic

**Description:**
The function filters out invalid IDs, performs the POST to add the remaining IDs, and then throws an error if any IDs were dropped. That means the operation can succeed (tracks added) but still report failure via exception.

**Code:**
```ts
const validIds = songIds.filter((id) => typeof id === "string" && id.trim().length > 0);
...
const res = (await music.music.api(path, { method: "POST", data })) as ...;
...
if (validIds.length < songIds.length) {
  const dropped = songIds.length - validIds.length;
  throw new Error(
    `${dropped} of ${songIds.length} IDs were invalid and skipped; ${validIds.length} tracks added.`
  );
}
```

**Why this matters:**
Callers that treat exceptions as “nothing happened” may prompt retries or alternate flows, potentially leading to duplicated tracks or confusing UX (“failed” even though some tracks were added).

---

### [MEDIUM] Finding #8: `searchCatalog()` cache key ignores `limit` and storefront, returning potentially wrong results

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 149-166, 172-203  
**Category:** will-break

**Description:**
The cache key is the raw `term` only. Results can be incorrect when:
- the same term is searched with different `limit` values (cache may return fewer/more results than requested), or
- the storefront changes (`music.storefrontId` differs across users/authorization states) but the cached result is reused.

**Code:**
```ts
const searchCache = new Map<string, { tracks: AppleMusicTrack[]; expires: number }>();
...
export async function searchCatalog(term: string, limit = 5): Promise<AppleMusicTrack[]> {
  const entry = searchCache.get(term);
  if (entry && Date.now() < entry.expires) return entry.tracks;
  ...
  const storefront = music.storefrontId || "us";
  ...
  searchCache.set(term, { tracks, expires: Date.now() + SEARCH_CACHE_TTL_MS });
  return tracks;
}
```

**Why this matters:**
Search suggestions can become inconsistent or “stuck” across different request shapes, and results can be wrong for users outside the default storefront.

---

### [MEDIUM] Finding #9: `searchCatalog()` does not validate/normalize the search term (empty/whitespace can pollute cache and trigger API errors)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 172-185, 201-203  
**Category:** will-break

**Description:**
The function accepts `term: string` and directly sends it to the API and also uses it as the cache key. There is no trimming or empty-string guard. Empty/whitespace terms can:
- generate confusing API errors,
- cache “empty-term” results under distinct keys (`""`, `" "`, `"   "`), and
- create repeated pointless calls.

**Code:**
```ts
export async function searchCatalog(term: string, limit = 5): Promise<AppleMusicTrack[]> {
  const entry = searchCache.get(term);
  ...
  const params = new URLSearchParams({
    term,
    limit: String(limit),
    types: "songs",
  });
  ...
  searchCache.set(term, { tracks, expires: Date.now() + SEARCH_CACHE_TTL_MS });
  return tracks;
}
```

**Why this matters:**
This increases the chance of non-actionable errors in the matching UI and makes behavior dependent on incidental whitespace.

---

### [MEDIUM] Finding #10: `createLibraryPlaylist()` does not validate playlist name before sending API request

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 213-236  
**Category:** will-break

**Description:**
`name` is used directly in the request body without basic checks (blank/whitespace-only, extremely long strings). Resulting API errors are converted into generic exceptions and may be hard to distinguish from other failures.

**Code:**
```ts
export async function createLibraryPlaylist(name: string): Promise<CreatePlaylistResult> {
  const music = await initMusicKit();
  if (!music.isAuthorized) {
    throw new Error("Not authorized. Please connect Apple Music first.");
  }
  const body = {
    data: [{ type: "playlists" as const, attributes: { name } }],
  };
  const res = (await music.music.api(path, { method: "POST", data: body })) as { ... };
  ...
}
```

**Why this matters:**
This can produce avoidable API-side failures and confusing UX when input is invalid, especially because the function is responsible for a user-visible “create playlist” action.

---

### [LOW] Finding #11: `isMusicKitAuthorized()` swallows all initialization errors and reports `false`

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 140-147  
**Category:** slop

**Description:**
The function catches all errors thrown by `initMusicKit()` (including configuration problems, token fetch failures, and script load failures) and returns `false`, making “not authorized” indistinguishable from “misconfigured” or “broken integration”.

**Code:**
```ts
export async function isMusicKitAuthorized(): Promise<boolean> {
  try {
    const music = await initMusicKit();
    return music.isAuthorized === true;
  } catch {
    return false;
  }
}
```

**Why this matters:**
UI can present the wrong next action (e.g., “connect Apple Music”) when the real issue is missing env, failed dev-token API, or missing MusicKit script.

---

### [LOW] Finding #12: `initMusicKit()` has no in-flight initialization guard (concurrent callers can duplicate work)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 96-122  
**Category:** slop

**Description:**
The function caches `configuredInstance`, but if multiple callers invoke `initMusicKit()` before `configuredInstance` is assigned, each will fetch a developer token and run configuration work concurrently.

**Code:**
```ts
let configuredInstance: MusicKitInstance | null = null;

export async function initMusicKit(): Promise<MusicKitInstance> {
  if (configuredInstance) return configuredInstance;
  const token = await fetchDeveloperToken();
  const MusicKit = await waitForMusicKit();
  MusicKit.configure({ developerToken: token, ... });
  configuredInstance = MusicKit.getInstance();
  return configuredInstance;
}
```

**Why this matters:**
This can cause redundant token requests and non-deterministic configuration behavior under rapid UI interactions.

---

### [LOW] Finding #13: `setlistProxyUrl()` accepts an unstructured query string and blindly concatenates it

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 22-23  
**Category:** slop

**Description:**
`setlistProxyUrl(query?: string)` assumes callers pass a correctly formatted, already-encoded query string. It does not prevent malformed input (including a leading `?`, unescaped characters, or accidental duplication), and it does not offer a structured API (e.g., taking key/value pairs).

**Code:**
```ts
export const setlistProxyUrl = (query?: string) =>
  apiUrl("/setlist/proxy") + (query ? `?${query}` : "");
```

**Why this matters:**
This is easy to misuse in call sites and can produce subtle URL bugs that look like backend failures.

---

### [LOW] Finding #14: `apiUrl()` / `healthUrl()` exports appear unused and `API_PATH` comment does not match behavior

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 3-6, 12-19, 24  
**Category:** dead-end

**Description:**
- `apiUrl()` is exported but appears to be used only internally within `apps/web/src/lib/api.ts` (no other imports/calls found in the repo).
- `healthUrl()` is exported but appears unused (no call sites found in the repo).
- The `API_PATH` comment mentions “or empty when using API_BASE_URL with trailing path”, but the implementation always injects an `/api` segment when `API_BASE_URL` is set.

**Code:**
```ts
/**
 * Base path for API routes (same app: /api, or empty when using API_BASE_URL with trailing path).
 */
const API_PATH = "/api";
...
export function apiUrl(path: string): string { ... }
...
export const healthUrl = () => apiUrl("/health");
```

**Why this matters:**
Unused exports and misleading comments increase maintenance overhead and can confuse future refactors around API URL construction.

---

### [LOW] Finding #15: `@repo/shared` appears unused by consumers (dead code / dependency bloat)

**File:** `packages/shared/src/index.ts`  
**Lines:** 1-2  
**Category:** dead-end

**Description:**
The shared package exports only two symbols (API error codes and a setlist.fm base URL). Repo-wide searches did not find any imports from `@repo/shared`, nor usages of `API_ERROR` / `SETLIST_FM_BASE_URL` outside `packages/shared` itself (including `packages/core`, despite listing the dependency).

**Code:**
```ts
export * from './types/api.js';
export * from './utils/constants.js';
```

**Why this matters:**
Carrying an unused workspace package and dependency increases build complexity and makes it harder to know which utilities are canonical.

---

### [LOW] Finding #16: `SETLIST_FM_BASE_URL` duplicates the API base constant defined elsewhere

**File:** `packages/shared/src/utils/constants.ts`  
**Lines:** 1  
**Category:** slop

**Description:**
`SETLIST_FM_BASE_URL` is defined here, but the setlist.fm base URL is also defined elsewhere in the repo (e.g., the API implementation has its own constant). With the shared export currently unused, this is duplicate “source of truth” risk.

**Code:**
```ts
export const SETLIST_FM_BASE_URL = 'https://api.setlist.fm/rest/1.0';
```

**Why this matters:**
If different call sites drift (one updates, one doesn’t), debugging API behavior becomes harder; duplicate constants commonly cause silent divergence.

---

### [LOW] Finding #17: `API_ERROR` / `ApiErrorCode` exports are unused and may not match real API error shapes

**File:** `packages/shared/src/types/api.ts`  
**Lines:** 1-9  
**Category:** dead-end

**Description:**
The package defines a small set of “common API error codes”, but there are no usages of these exports outside the shared package itself. This makes it unclear whether these codes are authoritative or aligned with actual backend responses.

**Code:**
```ts
export const API_ERROR = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMIT: 'RATE_LIMIT',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

export type ApiErrorCode = (typeof API_ERROR)[keyof typeof API_ERROR];
```

**Why this matters:**
Unused types/constants create false confidence and clutter; if they’re later adopted without verifying backend alignment, they can encode incorrect assumptions.

---

### [LOW] Finding #18: Shared package test is a minimal “exports exist” smoke test (likely placeholder)

**File:** `packages/shared/tests/example.test.ts`  
**Lines:** 1-12  
**Category:** stub

**Description:**
The test suite only asserts that exported constants equal fixed string values / contain a substring. It does not test any behavior beyond verifying the module exports, and the filename (`example.test.ts`) suggests it may be scaffolding.

**Code:**
```ts
it('exports API_ERROR', () => {
  expect(API_ERROR.UNAUTHORIZED).toBe('UNAUTHORIZED');
});
it('exports setlist base URL', () => {
  expect(SETLIST_FM_BASE_URL).toContain('setlist.fm');
});
```

**Why this matters:**
This provides little confidence in integration correctness, and it can be mistaken for meaningful coverage during refactors.

---

## External References

- Apple MusicKit JS “Sample code” page (configure + API usage examples), accessed 2026-02-14: https://js-cdn.music.apple.com/musickit/v3/docs/index.html
- Apple MusicKit JS “Sample code” page (alternate entry), accessed 2026-02-14: https://js-cdn.music.apple.com/musickit/v1/index.html
```