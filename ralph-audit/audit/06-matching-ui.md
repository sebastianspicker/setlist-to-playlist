# Matching UI Deep Audit Findings

Audit Date: 2026-02-14T10:41:59Z  
Files Examined: 4  
Total Findings: 26  

## Summary by Severity
- Critical: 1
- High: 5
- Medium: 12
- Low: 8

---

## Findings

### [HIGH] Finding #1: Suggestion effect dependencies miss content changes (stale suggestions)

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 44-86  
**Category:** will-break

**Description:**
The suggestions `useEffect` re-runs only when `setlist.id` changes or when the *lengths* of each set change. If the setlist content changes (song names/artists corrected, re-ordered within a set, substitutions) but the set lengths remain the same and `id` is unchanged, the effect does not re-run, leaving `matches` and suggested Apple tracks stale relative to the rendered setlist content.

**Code:**
```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [setlist.id, (setlist.sets ?? []).map((s) => s.length).join(",")]);
```

**Why this matters:**
Users can see suggestions for a previous version of the setlist and “confirm” incorrect matches without realizing the UI didn’t refresh.

---

### [MEDIUM] Finding #2: Hook dependency lint is disabled, increasing risk of subtle stale-state bugs

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 84-86  
**Category:** slop

**Description:**
The effect explicitly disables `react-hooks/exhaustive-deps`. The effect body depends on `setlist` (not just `setlist.id` and set lengths) and uses `buildSearchQuery` and `searchCatalog`. Disabling the rule removes guardrails that would otherwise highlight dependency drift over time.

**Code:**
```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [setlist.id, (setlist.sets ?? []).map((s) => s.length).join(",")]);
```

**Why this matters:**
A future refactor can introduce silent staleness (effect not re-running when it logically should) without lint catching it.

---

### [MEDIUM] Finding #3: Suggestions are fetched sequentially (slow for larger setlists)

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 54-80  
**Category:** will-break

**Description:**
The suggestion loop awaits each `searchCatalog` call in series. This makes total suggestion time roughly the sum of all per-track searches. For larger setlists, the UI can remain in “Fetching suggestions…” for a long time.

**Code:**
```tsx
for (let i = 0; i < entriesFlat.length; i++) {
  const tracks = await searchCatalog(query, 1);
  ...
}
```

**Why this matters:**
Perceived performance can degrade sharply with setlist length, and any upstream slowness (token fetch, MusicKit readiness, network) is multiplied across entries.

---

### [HIGH] Finding #4: Missing MusicKit script can stall suggestions for N×10s and still appear as “No match”

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 54-80, 125-129, 148-157  
**Category:** will-break

**Description:**
If `searchCatalog` is failing because MusicKit isn’t available (e.g., script never loaded), the loop continues per entry. Because the loop is sequential, each entry can incur the full wait before failing (see `waitForMusicKit` timeout in `musickit.ts`). Errors are caught and converted into `appleTrack: null`, so the UI shows “No match” rather than indicating a system failure.

**Code:**
```tsx
try {
  const tracks = await searchCatalog(query, 1);
  ...
} catch {
  setMatches((prev) => { ... appleTrack: null ... });
}
...
{row.appleTrack ? (...) : (<span style={{ color: "#888" }}>No match</span>)}
```

**Why this matters:**
A configuration/runtime failure (MusicKit not present) is indistinguishable from “Apple Music has no match,” and the page can feel frozen for long periods on realistic setlists.

---

### [MEDIUM] Finding #5: No user-visible error state for suggestion failures

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 61-77, 125-129, 156  
**Category:** will-break

**Description:**
Suggestion failures are swallowed (`catch { ... }`) and rendered as “No match.” There is no UI state to communicate that suggestion search failed (network error, dev token fetch failure, MusicKit not loaded, API error).

**Code:**
```tsx
} catch {
  ... appleTrack: null ...
}
...
<span style={{ color: "#888" }}>No match</span>
```

**Why this matters:**
Users can’t tell whether they should manually correct a specific song vs. whether the entire matching system is currently non-functional.

---

### [HIGH] Finding #6: Manual search results can display for the wrong row due to shared state and no request identity/cancellation

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 39-43, 100-114, 160-167, 181-228  
**Category:** will-break

**Description:**
`searchQuery`, `searchResults`, and `searching` are shared across all rows, and `runSearch` does not guard its response updates based on the row/index that is currently active when the request resolves. If a user switches rows (or triggers multiple searches quickly), the latest-resolving request can overwrite `searchResults` and show results under a different row’s expanded search UI.

**Code:**
```tsx
const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState<AppleMusicTrack[]>([]);
...
const tracks = await searchCatalog(q, 8);
setSearchResults(tracks);
```

**Why this matters:**
Users can accidentally assign the wrong Apple Music track to a setlist entry because the UI can show mismatched results without warning.

---

### [MEDIUM] Finding #7: Manual search state is global, forcing single-search-at-a-time and causing context loss

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 39-43, 160-167, 88-98  
**Category:** slop

**Description:**
The component maintains a single `searchQuery` and `searchResults` for all rows. Opening “Change” on a row clears the global search state, discarding any prior query/results. This is a UX limitation and makes multi-song corrections more tedious.

**Code:**
```tsx
onClick={() => {
  setSearchingIndex(index);
  setSearchQuery("");
  setSearchResults([]);
}}
```

**Why this matters:**
It increases the likelihood of user error and frustration when correcting multiple matches in sequence.

---

### [MEDIUM] Finding #8: In-flight manual search can repopulate results after user closes/changes the selection

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 88-98, 100-114, 181-228  
**Category:** will-break

**Description:**
`setMatch` closes the search UI and clears `searchResults`, but `runSearch` has no cancellation/guard. If a search is in-flight and the user selects a track (or clicks “Skip” / changes rows), the in-flight promise can later resolve and call `setSearchResults(tracks)`, repopulating results unexpectedly.

**Code:**
```tsx
function setMatch(...) {
  ...
  setSearchingIndex(null);
  setSearchQuery("");
  setSearchResults([]);
}
...
const tracks = await searchCatalog(q, 8);
setSearchResults(tracks);
```

**Why this matters:**
Unexpected UI updates after the user “finished” an action can cause confusion and accidental mis-clicks.

---

### [MEDIUM] Finding #9: Rows are keyed by array index, risking incorrect UI association when the list changes

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 132-135, 181  
**Category:** will-break

**Description:**
Each match row uses `key={index}`. If the underlying `matches` order/length changes (including from setlist updates or structural changes), React may reuse DOM/state incorrectly across rows. This is particularly risky because row identity is also tracked by `searchingIndex`.

**Code:**
```tsx
{matches.map((row, index) => (
  <li key={index}>
...
{searchingIndex === index && ( ... )}
```

**Why this matters:**
The “Change” UI (and any transient state) can appear on the wrong song after list changes, increasing the chance of wrong matches.

---

### [LOW] Finding #10: Search input has no explicit accessible label

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 183-195  
**Category:** slop

**Description:**
The manual search `<input>` relies on placeholder text and has no `<label>` or `aria-label`.

**Code:**
```tsx
<input
  type="text"
  value={searchQuery}
  ...
  placeholder="Search Apple Music…"
/>
```

**Why this matters:**
Screen reader users may not get a reliable control name, and placeholder-only labeling is fragile for accessibility.

---

### [LOW] Finding #11: No “0 results” feedback for manual search

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 204-226  
**Category:** unfinished

**Description:**
The UI only renders results when `searchResults.length > 0`. If a search completes with no matches (or fails and sets `[]`), nothing indicates whether the search is still running, yielded 0 results, or errored.

**Code:**
```tsx
{searchResults.length > 0 && (
  <ul> ... </ul>
)}
```

**Why this matters:**
Users can’t distinguish “no results” from “nothing happened,” causing repeated searches and confusion.

---

### [LOW] Finding #12: Proceed gating only checks “at least one match,” not “how incomplete is the playlist”

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 116-117, 233-251  
**Category:** slop

**Description:**
The “Create playlist” button becomes enabled as soon as a single match exists. The UI does not summarize how many entries are unmatched/skipped at the decision point, beyond the generic instruction text.

**Code:**
```tsx
const canProceed = matches.some((m) => m.appleTrack !== null);
...
disabled={!canProceed}
```

**Why this matters:**
A user can unintentionally create a playlist missing most songs with minimal friction and limited visibility into completeness.

---

### [MEDIUM] Finding #13: Authorization handler can run concurrently (double init/authorize)

**File:** `apps/web/src/features/matching/ConnectAppleMusic.tsx`  
**Lines:** 21-41, 45-57, 71-77  
**Category:** will-break

**Description:**
`handleAuthorize` does not short-circuit when `loading` is already true. The “Try again” button inside the error block is not disabled during loading, and rapid clicks can invoke `initMusicKit()` / `authorizeMusicKit()` multiple times concurrently.

**Code:**
```tsx
async function handleAuthorize() {
  setLoading(true);
  try {
    await initMusicKit();
    await authorizeMusicKit();
```

**Why this matters:**
Concurrent authorization flows can lead to inconsistent UI state, unexpected errors, and difficult-to-reproduce edge cases around MusicKit configuration and auth popups.

---

### [LOW] Finding #14: Redundant initialization call (initMusicKit + authorizeMusicKit also inits)

**File:** `apps/web/src/features/matching/ConnectAppleMusic.tsx`  
**Lines:** 24-27  
**Category:** slop

**Description:**
`handleAuthorize` calls `initMusicKit()` and then `authorizeMusicKit()`, but `authorizeMusicKit()` itself calls `initMusicKit()` (see `musickit.ts`). This duplication is unnecessary and can complicate reasoning about init sequencing.

**Code:**
```tsx
await initMusicKit();
await authorizeMusicKit();
```

**Why this matters:**
It increases complexity and can amplify issues if `initMusicKit()` has side effects or races under concurrent calls.

---

### [LOW] Finding #15: Error “friendly” mapping is brittle and may expose raw internal messages

**File:** `apps/web/src/features/matching/ConnectAppleMusic.tsx`  
**Lines:** 28-37  
**Category:** slop

**Description:**
The “friendly” messaging relies on case-sensitive substring checks (`includes("cancel")`, `includes("denied")`, etc.). Errors that differ in casing or wording won’t be mapped. Unmatched errors are displayed verbatim to the user.

**Code:**
```tsx
const friendly =
  message.includes("cancel") || message.includes("denied")
    ? "You cancelled or denied access. Click below to try again."
    : ...
    : message;
```

**Why this matters:**
User-visible errors may be confusing, inconsistent, or overly technical depending on upstream error text.

---

### [CRITICAL] Finding #16: MusicKit instance is cached indefinitely; developer token refresh is effectively disabled

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 43-70, 96-122  
**Category:** will-break

**Description:**
Developer tokens are cached with a TTL, but `initMusicKit()` returns early if `configuredInstance` is set and never re-fetches a developer token or reconfigures MusicKit after that point. This makes token refresh moot after the first successful configuration, and long-lived sessions can break once the developer token expires (or otherwise becomes invalid).

**Code:**
```ts
const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000;
...
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
After enough time in-app, catalog search, playlist creation, or add-tracks can fail due to token expiration with no supported path to recover besides a full reload.

---

### [HIGH] Finding #17: initMusicKit has no in-flight deduping; concurrent calls can race and double-configure

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 96-122  
**Category:** will-break

**Description:**
If multiple callers invoke `initMusicKit()` before `configuredInstance` is set, each call runs the full init path (fetch token, wait for script, configure). There’s no shared in-flight promise, so initialization work can be duplicated and timing-dependent.

**Code:**
```ts
export async function initMusicKit(): Promise<MusicKitInstance> {
  if (configuredInstance) return configuredInstance;
  const token = await fetchDeveloperToken();
  const MusicKit = await waitForMusicKit();
  const configureResult = MusicKit.configure({ ... });
  ...
  configuredInstance = MusicKit.getInstance();
  return configuredInstance;
}
```

**Why this matters:**
Racy initialization can cause inconsistent runtime behavior and intermittent failures, especially in React where multiple components can mount and call initialization near-simultaneously.

---

### [LOW] Finding #18: waitForMusicKit leaves a timeout running after resolve (timer leak)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 73-93  
**Category:** slop

**Description:**
When `window.MusicKit` becomes available, the interval is cleared and the promise resolves, but the `setTimeout` is not cleared. The timeout handler will still run later.

**Code:**
```ts
const check = setInterval(() => { ... resolve(window.MusicKit); }, 50);
setTimeout(() => {
  clearInterval(check);
  reject(new Error("MusicKit script did not load"));
}, 10000);
```

**Why this matters:**
It adds avoidable background timers and can contribute to memory/timer churn when `waitForMusicKit()` is called repeatedly.

---

### [HIGH] Finding #19: search cache key ignores `limit` (and storefront), causing incorrect results; suggestions can poison manual search

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 149-175, 172-203  
**Category:** broken-logic

**Description:**
`searchCatalog(term, limit)` caches results by `term` only. Calls with different `limit` values reuse the same cached tracks array. In the matching UI, suggestions call `searchCatalog(query, 1)` and manual search calls `searchCatalog(q, 8)`; if `q` matches the suggestion query, manual search can incorrectly return only the single cached result.

**Code:**
```ts
const searchCache = new Map<string, { tracks: AppleMusicTrack[]; expires: number }>();

export async function searchCatalog(term: string, limit = 5): Promise<AppleMusicTrack[]> {
  const entry = searchCache.get(term);
  if (entry && Date.now() < entry.expires) return entry.tracks;
  ...
  const params = new URLSearchParams({ term, limit: String(limit), types: "songs" });
  ...
  searchCache.set(term, { tracks, expires: Date.now() + SEARCH_CACHE_TTL_MS });
  return tracks;
}
```

**Why this matters:**
Manual correction becomes unreliable: users may be unable to see more than one candidate result for a song, even though they requested more results.

---

### [MEDIUM] Finding #20: Default storefront fallback to `"us"` can yield wrong-catalog matches for non-US users

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 178-186  
**Category:** will-break

**Description:**
If `music.storefrontId` is falsy, the code forces `"us"`. This can produce incorrect search results (different catalogs, regional availability) for non-US users, especially before authorization if storefront isn’t populated.

**Code:**
```ts
const storefront = music.storefrontId || "us";
const path = `/v1/catalog/${storefront}/search?${params.toString()}`;
```

**Why this matters:**
Matching quality and correctness can vary by region; forcing a US storefront can systematically mis-match tracks for users elsewhere.

---

### [MEDIUM] Finding #21: searchCatalog does not validate/normalize empty or whitespace-only search terms

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 172-185  
**Category:** will-break

**Description:**
`searchCatalog` accepts `term` as-is and sends it to the API. There’s no guard for empty/whitespace-only strings.

**Code:**
```ts
export async function searchCatalog(term: string, limit = 5): Promise<AppleMusicTrack[]> {
  ...
  const params = new URLSearchParams({ term, limit: String(limit), types: "songs" });
```

**Why this matters:**
Callers that accidentally pass an empty term can trigger avoidable API errors or confusing “no results” behavior.

---

### [MEDIUM] Finding #22: Token caching uses a fixed TTL instead of token claims; can drift from real expiry

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 43-50, 52-70  
**Category:** will-break

**Description:**
The cache expiry is calculated as “now + 55 minutes” without inspecting the JWT’s `exp` (or any server-provided expiry). If the server changes token duration, issues a shorter-lived token, or the client clock is skewed, `isTokenValid()` can return true for an actually-invalid token.

**Code:**
```ts
const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000;
...
tokenExpiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
```

**Why this matters:**
It can cause hard-to-diagnose failures where requests start failing even though the client believes it has a valid token.

---

### [MEDIUM] Finding #23: fetchDeveloperToken uses default fetch caching semantics (developer token may be HTTP-cached)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 57-70  
**Category:** will-break

**Description:**
The developer token is fetched via `fetch(devTokenUrl())` without explicit cache controls. Depending on hosting/proxy headers and browser behavior, the response could be cached beyond the intended in-memory lifetime.

**Code:**
```ts
const res = await fetch(devTokenUrl());
```

**Why this matters:**
This increases the chance of the client using stale tokens and broadens the surface area where a sensitive token might persist (e.g., HTTP caches).

---

### [MEDIUM] Finding #24: addTracksToLibraryPlaylist can throw after partial success (invalid IDs), risking duplicate adds on retry

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 250-253, 269-274  
**Category:** will-break

**Description:**
If some `songIds` are invalid, the function filters them out and still performs the API call for valid IDs, but then throws an error afterwards. Higher-level flows may treat this as a failure and prompt a retry, potentially re-adding tracks that were already successfully added.

**Code:**
```ts
const validIds = songIds.filter((id) => typeof id === "string" && id.trim().length > 0);
...
await music.music.api(path, { method: "POST", data });
...
if (validIds.length < songIds.length) {
  throw new Error(`${dropped} of ${songIds.length} IDs were invalid...`);
}
```

**Why this matters:**
It creates ambiguity about outcome (“did anything succeed?”) and can lead to duplicated tracks in the created playlist depending on how the UI handles retries.

---

### [LOW] Finding #25: isMusicKitAuthorized swallows all initialization errors, hiding the root cause

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 140-147  
**Category:** slop

**Description:**
All errors (missing script, missing app ID, dev token fetch failure, etc.) are caught and converted into `false` with no surfaced context.

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
It makes it difficult for the UI to distinguish “not authorized” from “MusicKit is broken/unavailable,” resulting in misleading UX.

---

### [LOW] Finding #26: Expired search cache entries persist unless cache exceeds max size

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 154-166, 173-176  
**Category:** slop

**Description:**
Expired entries are only purged opportunistically by `evictSearchCache()`, and `evictSearchCache()` returns early if the cache is not above `SEARCH_CACHE_MAX_SIZE`. This means expired entries can remain in memory until the cache grows large enough to trigger eviction behavior, even though they’re no longer usable.

**Code:**
```ts
function evictSearchCache(): void {
  if (searchCache.size <= SEARCH_CACHE_MAX_SIZE) return;
  ...
}
```

**Why this matters:**
While bounded, the cache can retain unnecessary data and contributes to long-lived memory usage patterns in a session.