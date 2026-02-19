# Lib & Utils Deep Audit Findings

Audit Date: 2026-02-15  
Files Examined: 11  
Total Findings: 14  

## Summary by Severity
- Critical: 2
- High: 4
- Medium: 4
- Low: 4

---

## Findings

### [CRITICAL] Finding #1: Localhost CORS allowlist is bypassable via `startsWith("http://localhost")`

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 8-18  
**Category:** broken-logic  

**Description:**
When `ALLOWED_ORIGIN` is unset, `getAllowOrigin()` treats any `Origin` beginning with `http://localhost` or `http://127.0.0.1` as local. This can match attacker-controlled origins like `http://localhost.evil.com` (string prefix match), potentially enabling cross-origin reads of sensitive responses (e.g., Apple Developer Token endpoint, setlist proxy responses) in misconfigured deployments.

**Code:**
```ts
const isLocalOrigin =
  origin &&
  (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
...
return isLocalOrigin ? origin : null;
```

**Why this matters:**
This is a credential/privileged-data exposure risk if `ALLOWED_ORIGIN` is not set correctly in production or staging, and it weakens the intended “localhost-only” safety boundary.

---

### [MEDIUM] Finding #2: CORS headers omit `Vary: Origin` despite origin-dependent responses

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 20-28  
**Category:** will-break  

**Description:**
`corsHeaders()` conditionally sets `Access-Control-Allow-Origin` based on the request `Origin`, but does not emit `Vary: Origin`. If any caching layer is introduced (CDN/proxy/browser intermediate caches), responses for one origin can be reused for another, leading to confusing and potentially unsafe behavior.

**Code:**
```ts
const headers: HeadersInit = { "Content-Type": contentType };
if (allowOrigin) {
  (headers as Record<string, string>)["Access-Control-Allow-Origin"] = allowOrigin;
}
return headers;
```

**Why this matters:**
Origin-varying CORS responses without `Vary: Origin` can cause intermittent, environment-specific failures and policy mismatches.

---

### [CRITICAL] Finding #3: MusicKit API usage likely incorrect (`music.music.api` vs documented `music.api.*`)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 27-35, 172-203, 210-268  
**Category:** will-break  

**Description:**
This module models the MusicKit instance as having a `music` property containing an `api()` function, and calls `music.music.api(...)` for catalog search and library playlist operations. Apple’s MusicKit web examples use `music.api...` methods on the instance (not `music.music...`). Additionally, widely used TypeScript definitions for MusicKit model the instance with an `api` property (and many API methods), not a nested `music.api` function. This mismatch strongly suggests runtime `TypeError` risks (e.g., `music.music` being `undefined`) and broken core flows (search, playlist creation, add-tracks). ([js-cdn.music.apple.com](https://js-cdn.music.apple.com/musickit/v1/index.html))

**Code:**
```ts
const data = (await music.music.api(path)) as { ... };

const res = (await music.music.api(path, {
  method: "POST",
  data: body,
})) as { ... };

const res = (await music.music.api(path, { method: "POST", data })) as ...;
```

**Why this matters:**
If the MusicKit instance API surface differs as the external docs/types indicate, these calls will crash at runtime and block matching + playlist export entirely.

---

### [HIGH] Finding #4: Library playlist creation request shape conflicts with Apple’s documented request object

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 218-225  
**Category:** will-break  

**Description:**
`createLibraryPlaylist()` builds a request body wrapped in a JSON:API-like `{ data: [...] }` array. Apple’s documentation for `LibraryPlaylistCreationRequest` describes a top-level object with required `attributes` and optional `relationships` (no `data` wrapper). This discrepancy risks consistent 4xx failures when attempting to create playlists. ([developer.apple.com](https://developer.apple.com/documentation/applemusicapi/libraryplaylistcreationrequest?utm_source=openai))

**Code:**
```ts
const body = {
  data: [{ type: "playlists" as const, attributes: { name } }],
};
```

**Why this matters:**
Playlist export depends on creation succeeding; a request-shape mismatch is a hard failure in a primary app path.

---

### [HIGH] Finding #5: Developer token TTL caching conflicts with one-time MusicKit configuration (token refresh likely impossible)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 43-70, 96-122  
**Category:** will-break  

**Description:**
The module implements a developer token TTL cache (~55 minutes), but `initMusicKit()` memoizes `configuredInstance` and returns it forever without reconfiguration. If the configured developer token expires, the TTL cache cannot help because `initMusicKit()` never re-runs `MusicKit.configure()` once `configuredInstance` is set. Type definitions also commonly model `developerToken` as read-only on the instance, implying a refresh requires reconfiguration rather than mutation. 

**Code:**
```ts
const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000;
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

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
This can produce time-based production breakage where Apple Music API calls start failing after a period of use, with no recovery path short of reload.

---

### [HIGH] Finding #6: `searchCatalog()` cache key ignores `limit` and storefront

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 149-203  
**Category:** broken-logic  

**Description:**
The search cache is keyed only by `term`. Calls with different `limit` values can return cached results from an earlier call with a different limit. The cache key also does not include `storefront`, so storefront changes can reuse results from a different storefront.

**Code:**
```ts
const searchCache = new Map<string, { tracks: AppleMusicTrack[]; expires: number }>();

export async function searchCatalog(term: string, limit = 5): Promise<AppleMusicTrack[]> {
  const entry = searchCache.get(term);
  if (entry && Date.now() < entry.expires) return entry.tracks;
  ...
  searchCache.set(term, { tracks, expires: Date.now() + SEARCH_CACHE_TTL_MS });
  return tracks;
}
```

**Why this matters:**
Matching quality and UI behavior can become inconsistent and non-deterministic depending on call order.

---

### [HIGH] Finding #7: `addTracksToLibraryPlaylist()` throws after doing a successful partial add

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 250-274  
**Category:** broken-logic  

**Description:**
The function filters invalid IDs, performs the add-tracks request for `validIds`, and then throws if any IDs were dropped. This means the caller sees an error even though tracks were added, encouraging retry flows that can create duplicates or unclear state.

**Code:**
```ts
const validIds = songIds.filter((id) => typeof id === "string" && id.trim().length > 0);
...
const res = (await music.music.api(path, { method: "POST", data })) as ...;
...
if (validIds.length < songIds.length) {
  const dropped = songIds.length - validIds.length;
  throw new Error(`${dropped} of ${songIds.length} IDs were invalid and skipped; ${validIds.length} tracks added.`);
}
```

**Why this matters:**
This can convert a recoverable validation issue into a user-visible “failure” that is hard to reason about and may worsen outcomes on retry.

---

### [MEDIUM] Finding #8: `playlistId` is validated with `.trim()` but used untrimmed in the request path

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 247-261  
**Category:** broken-logic  

**Description:**
The function checks `playlistId?.trim()` for validity, but builds the request URL with the original `playlistId` string. If upstream passes whitespace-padded IDs, the request path becomes invalid.

**Code:**
```ts
if (!playlistId?.trim()) {
  throw new Error("Invalid playlist ID");
}
...
const path = `/v1/me/library/playlists/${playlistId}/tracks`;
```

**Why this matters:**
Whitespace bugs become hard failures that are easy to introduce through UI state or pasted IDs.

---

### [MEDIUM] Finding #9: `waitForMusicKit()` leaves a timeout running after resolve (dangling timer + late reject)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 73-93  
**Category:** slop  

**Description:**
When `window.MusicKit` becomes available, the interval is cleared and the promise resolves, but the 10-second timeout is not cleared. That timeout later fires and calls `reject()` even though the promise already resolved.

**Code:**
```ts
const check = setInterval(() => {
  if (window.MusicKit) {
    clearInterval(check);
    resolve(window.MusicKit);
  }
}, 50);

setTimeout(() => {
  clearInterval(check);
  reject(new Error("MusicKit script did not load"));
}, 10000);
```

**Why this matters:**
This creates avoidable timers and complicates debugging (late “did not load” paths can still execute).

---

### [MEDIUM] Finding #10: `setlistProxyUrl()` encourages malformed query construction

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 21-23  
**Category:** will-break  

**Description:**
`setlistProxyUrl(query?: string)` appends `?${query}` verbatim. Callers must remember to (1) omit the leading `?` and (2) pre-encode values. Passing a query that already includes `?` results in `??...`, and passing unencoded content can break the URL.

**Code:**
```ts
export const setlistProxyUrl = (query?: string) =>
  apiUrl("/setlist/proxy") + (query ? `?${query}` : "");
```

**Why this matters:**
URL construction bugs tend to show up as environment-specific failures and are easy to introduce in future call sites.

---

### [LOW] Finding #11: `api.ts` comment suggests `API_PATH` may be empty, but it is hardcoded to `"/api"`

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 3-7  
**Category:** slop  

**Description:**
The docstring implies `API_PATH` could be empty depending on configuration, but the constant is always `"/api"`. This mismatch can mislead future changes around API base URL behavior.

**Code:**
```ts
/**
 * Base path for API routes (same app: /api, or empty when using API_BASE_URL with trailing path).
 */
const API_PATH = "/api";
```

**Why this matters:**
Stale comments cause configuration mistakes and incorrect assumptions during refactors.

---

### [LOW] Finding #12: Unused exports in `apps/web/src/lib/*`

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 24  
**Category:** dead-end  

**Description:**
`healthUrl()` is exported but appears unused within the repo, increasing surface area and maintenance cost.

**Code:**
```ts
export const healthUrl = () => apiUrl("/health");
```

**Why this matters:**
Unused exports accumulate and make it harder to know what is actually supported/relied on.

---

### [LOW] Finding #13: Unused exports in `apps/web/src/lib/musickit.ts`

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 53-70, 124-128  
**Category:** dead-end  

**Description:**
- `fetchDeveloperToken()` is exported but only used internally by `initMusicKit()` in this repo.
- `getMusicKitInstance()` is exported but unused.

**Code:**
```ts
export async function fetchDeveloperToken(): Promise<string> { ... }

export function getMusicKitInstance(): MusicKitInstance {
  if (!configuredInstance) throw new Error("MusicKit not configured. Call initMusicKit() first.");
  return configuredInstance;
}
```

**Why this matters:**
This increases API surface area without corresponding usage, and can lock in accidental contracts.

---

### [LOW] Finding #14: `@repo/shared` utilities appear unused by apps (dead-end package); entrypoint exports are not covered by tests

**File:** `packages/shared/src/utils/constants.ts`  
**Lines:** 1  
**Category:** dead-end  

**Description:**
`SETLIST_FM_BASE_URL` is exported but only referenced by the package’s own example test; no app/package in the monorepo appears to import it. Similar applies to `API_ERROR` / `ApiErrorCode`. This suggests `@repo/shared` may be dead weight or at risk of drifting from real usage.

**Code:**
```ts
export const SETLIST_FM_BASE_URL = 'https://api.setlist.fm/rest/1.0';
```

**Why this matters:**
Unused shared utilities tend to diverge from reality and create confusion about the “source of truth.”

---

## External References

- `https://js-cdn.music.apple.com/musickit/v1/index.html` (accessed 2026-02-15). ([js-cdn.music.apple.com](https://js-cdn.music.apple.com/musickit/v1/index.html))  
- `https://unpkg.com/@types/musickit-js@1.1.14/index.d.ts` (accessed 2026-02-15).   
- `https://unpkg.com/@types/musickit-js@1.1.14/api.d.ts` (accessed 2026-02-15).   
- `https://developer.apple.com/documentation/applemusicapi/libraryplaylistcreationrequest` (accessed 2026-02-15; crawler summary). ([developer.apple.com](https://developer.apple.com/documentation/applemusicapi/libraryplaylistcreationrequest?utm_source=openai))