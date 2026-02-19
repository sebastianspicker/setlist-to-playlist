# Matching UI Deep Audit Findings

Audit Date: 2026-02-15T07:04:41Z  
Files Examined: 4  
Total Findings: 16  

## Summary by Severity
- Critical: 1
- High: 6
- Medium: 7
- Low: 2

---

## Findings

### [CRITICAL] Finding #1: `useEffect` dependency can crash on non-array/nullable `sets` entries

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 14-25, 44-86  
**Category:** will-break

**Description:**
`flattenSetlist()` explicitly tolerates malformed `setlist.sets` items by skipping non-arrays (`if (!Array.isArray(set)) continue;`). However, the `useEffect` dependency array assumes every `setlist.sets` item has a `.length` property and is safe to access:

- If `setlist.sets` contains `null`, `undefined`, or a non-object, `s.length` will throw at render time, crashing the matching UI.
- This crash path is especially concerning because the code comment and runtime behavior already anticipate malformed set data.

**Code:**
```ts
for (const set of setlist.sets ?? []) {
  if (!Array.isArray(set)) continue;
}

}, [setlist.id, (setlist.sets ?? []).map((s) => s.length).join(",")]);
```

**Why this matters:**
A single malformed `sets` entry can take down the entire matching screen (hard crash), even though the rest of the component is written to tolerate malformed setlist data.

---

### [HIGH] Finding #2: Suggestion fetch effect dependencies are insufficient (stale suggestions + stale UI state)

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 44-86  
**Category:** broken-logic

**Description:**
The suggestions `useEffect` only re-runs when `setlist.id` or the comma-joined list of `set` lengths changes. It does not account for changes to:

- Song names
- Per-entry artist overrides
- `setlist.artist` (used as fallback artist)
- Entry order changes within sets
- Any structural changes that preserve set lengths (e.g., swap two songs, rename, change artist)

Because the component stores a snapshot of `setlistEntry` inside state (`matches`), missing an effect re-run can leave the UI showing outdated entries and suggestions.

**Code:**
```ts
useEffect(() => {
  const entriesFlat = flattenSetlist(setlist);
  // ...
  setMatches(entriesFlat.map((setlistEntry) => ({ setlistEntry, appleTrack: null })));
  // ...
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [setlist.id, (setlist.sets ?? []).map((s) => s.length).join(",")]);
```

**Why this matters:**
Edits/refreshes to the setlist that don’t change lengths can silently leave users matching tracks for an older version of the setlist.

---

### [HIGH] Finding #3: UI renders from derived state snapshots, not the `setlist` prop (enables desync)

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 33-37, 44-53, 140-146  
**Category:** broken-logic

**Description:**
The displayed setlist content (song name/artist) comes from `matches` state (`row.setlistEntry`) rather than directly from the `setlist` prop. Since `matches` is initialized from props and only conditionally re-synced by the effect, any missed dependency update (or partial update) leaves the rendered list potentially out of sync with the actual `setlist` prop.

**Code:**
```ts
const [matches, setMatches] = useState<MatchRow[]>(() =>
  entries.map((setlistEntry) => ({ setlistEntry, appleTrack: null }))
);

<strong>{row.setlistEntry?.name ?? "—"}</strong>
{row.setlistEntry?.artist && (
  <span> — {row.setlistEntry.artist}</span>
)}
```

**Why this matters:**
Users can be shown (and make matching decisions against) stale setlist entries, which can cascade into incorrect playlist exports.

---

### [HIGH] Finding #4: Unstable list keys (`key={index}`) can mis-associate rows and user selections

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 131-139  
**Category:** will-break

**Description:**
The main list uses array index keys. If rows are inserted/removed/reordered (including via setlist refresh or re-flattening), React may reuse DOM/state in a way that visually attaches the wrong match/search UI to the wrong setlist entry.

**Code:**
```tsx
{matches.map((row, index) => (
  <li key={index}>
```

**Why this matters:**
A user can believe they’re changing the match for one song while actually modifying a different row after a setlist update or reordering.

---

### [HIGH] Finding #5: Suggestion-fetch failures are silently treated as “No match” (no error surface)

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 55-77, 148-157  
**Category:** will-break

**Description:**
All failures during suggestion fetching (including MusicKit not loaded, dev token fetch failing, Apple API errors) are caught and converted into `appleTrack: null`, with no user-visible indication that the suggestion system failed.

The rendered UI shows `No match` for both “no catalog result” and “system error”.

**Code:**
```ts
try {
  const tracks = await searchCatalog(query, 1);
  const track = tracks[0] ?? null;
  // ...
} catch {
  setMatches((prev) => { /* ... */ appleTrack: null });
}

{row.appleTrack ? (
  <span>→ {row.appleTrack.name}</span>
) : (
  <span style={{ color: "#888" }}>No match</span>
)}
```

**Why this matters:**
A broken integration (token/API/script) can look identical to legitimate “no match” results, preventing users from diagnosing why matching is empty.

---

### [MEDIUM] Finding #6: Suggestions are fetched sequentially with a global loading indicator (slow + unclear progress)

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 55-80, 125-129  
**Category:** slop

**Description:**
Suggestions are fetched in a `for` loop with `await` per entry, making total time scale linearly with setlist size. The UI shows a single “Fetching suggestions…” message until the entire loop completes.

**Code:**
```ts
for (let i = 0; i < entriesFlat.length; i++) {
  const tracks = await searchCatalog(query, 1);
  // ...
}
{loadingSuggestions && <p role="status">Fetching suggestions…</p>}
```

**Why this matters:**
Large setlists can feel sluggish with limited feedback, even though partial results may be appearing row-by-row.

---

### [HIGH] Finding #7: Manual search results can display under the wrong row (in-flight search not tied to index)

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 100-114, 160-167, 181-226  
**Category:** broken-logic

**Description:**
Manual search uses global `searchResults`/`searching` state that is not associated with the specific row being searched. If the user changes `searchingIndex` while a search is in flight (by clicking “Change” on a different row), the in-flight promise resolves and writes results into the global `searchResults`, which will then render under whichever row is currently open.

**Code:**
```ts
async function runSearch(index: number) {
  // ...
  const tracks = await searchCatalog(q, 8);
  setSearchResults(tracks);
}

onClick={() => {
  setSearchingIndex(index);
  setSearchQuery("");
  setSearchResults([]);
}}

{searchingIndex === index && (
  <>
    {/* ... */}
    {searchResults.length > 0 && (
      <ul>
        {searchResults.map((track) => (
          <li key={track.id}>
            <button onClick={() => setMatch(index, track)}>{track.name}</button>
          </li>
        ))}
      </ul>
    )}
  </>
)}
```

**Why this matters:**
Users can accidentally pick a result that was fetched for a different song, leading to incorrect matching selections.

---

### [MEDIUM] Finding #8: Manual search requests can race (no cancellation / last-resolve-wins)

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 100-114  
**Category:** will-break

**Description:**
`runSearch()` does not cancel prior requests or guard against out-of-order resolution. Multiple searches (rapid clicks, Enter presses, or searches with changing queries) can resolve in an unexpected order and overwrite `searchResults` with stale data.

**Code:**
```ts
setSearching(true);
try {
  const tracks = await searchCatalog(q, 8);
  setSearchResults(tracks);
} finally {
  setSearching(false);
}
```

**Why this matters:**
Search results can flicker or regress, and the user may select from an older result set without realizing it.

---

### [MEDIUM] Finding #9: Manual search has no explicit “no results” or “error” UI state

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 106-113, 204-226  
**Category:** unfinished

**Description:**
When search returns zero results or throws, the UI just shows nothing (empty area). There is no user-visible distinction between:

- “No results for this query”
- “Search failed (token, network, MusicKit, API error)”
- “Haven’t searched yet”

**Code:**
```ts
} catch {
  setSearchResults([]);
}

{searchResults.length > 0 && (
  <ul>
    {searchResults.map((track) => (
      <li key={track.id}>...</li>
    ))}
  </ul>
)}
```

**Why this matters:**
Users can’t tell whether the system is working, which increases repeated retries and confusion.

---

### [LOW] Finding #10: Search input is placeholder-only (missing accessible label)

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 183-195  
**Category:** slop

**Description:**
The search input has no associated `<label>` and relies on placeholder text. This reduces accessibility and can make the control ambiguous for assistive technologies.

**Code:**
```tsx
<input
  type="text"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Search Apple Music…"
/>
```

**Why this matters:**
Accessibility regressions can block some users from completing manual matching.

---

### [MEDIUM] Finding #11: Manual-search UI state is not reset when the setlist changes

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 38-43, 44-53, 88-98  
**Category:** will-break

**Description:**
On setlist changes, the effect reinitializes `matches` but does not reset `searchingIndex`, `searchQuery`, `searchResults`, or `searching`. This can leave:

- Stale query/results logically associated with an older setlist
- `searchingIndex` pointing at a different entry after refresh/reorder
- A hidden search panel (index out of range) with leftover state

**Code:**
```ts
const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState<AppleMusicTrack[]>([]);
const [searching, setSearching] = useState(false);

setMatches(entriesFlat.map((setlistEntry) => ({ setlistEntry, appleTrack: null })));
```

**Why this matters:**
Users can see mismatched search behavior after setlist refreshes, including results appearing unexpectedly for the “wrong” context.

---

### [HIGH] Finding #12: `searchCatalog` cache key ignores `limit` and `storefront` (truncates manual search + cross-region staleness)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 149-203  
**Category:** broken-logic

**Description:**
`searchCatalog(term, limit)` caches results only by `term`. It does not include `limit` or the resolved `storefront` in the cache key:

- In matching flow, suggestions call `searchCatalog(query, 1)` first, caching only 1 result for that `term`.
- Manual search later calls `searchCatalog(q, 8)` and will return the cached 1-result array, preventing users from seeing broader options.
- If storefront changes (e.g., after authorization or region detection), cached results can be returned for the wrong storefront.

**Code:**
```ts
const entry = searchCache.get(term);
if (entry && Date.now() < entry.expires) return entry.tracks;

const storefront = music.storefrontId || "us";
// ...
searchCache.set(term, { tracks, expires: Date.now() + SEARCH_CACHE_TTL_MS });
```

**Why this matters:**
The “Change → Search” flow can be functionally broken (only 1 option shown) in common usage, and results may not match the user’s actual storefront context.

---

### [MEDIUM] Finding #13: `waitForMusicKit()` leaves a live timeout even after resolving (timer accumulation)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 73-93  
**Category:** slop

**Description:**
When `window.MusicKit` becomes available, the interval is cleared and the promise resolves, but the `setTimeout` is never cleared. The timeout will still fire later (up to 10s), performing work and calling `reject` after the promise already resolved.

Repeated calls before MusicKit loads (or in concurrent init paths) can leave many pending timeouts.

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
This is an avoidable timer leak pattern that can add noise and overhead during initialization-heavy flows.

---

### [MEDIUM] Finding #14: `initMusicKit()` / `fetchDeveloperToken()` have no in-flight guard (concurrent calls can race)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 53-70, 96-122  
**Category:** will-break

**Description:**
Both token fetching and MusicKit configuration rely on module-level caches (`cachedToken`, `configuredInstance`) but do not gate concurrent calls:

- If multiple components (or double-clicks) call `initMusicKit()` before `configuredInstance` is set, they can run parallel token fetches and parallel `MusicKit.configure()` calls.
- `configuredInstance` is assigned after async operations; whichever concurrent call finishes last “wins,” potentially overwriting a prior configured instance.

**Code:**
```ts
let configuredInstance: MusicKitInstance | null = null;

export async function initMusicKit(): Promise<MusicKitInstance> {
  if (configuredInstance) return configuredInstance;
  const token = await fetchDeveloperToken();
  const MusicKit = await waitForMusicKit();
  const configureResult = MusicKit.configure({ developerToken: token, /* ... */ });
  // ...
  configuredInstance = MusicKit.getInstance();
  return configuredInstance;
}
```

**Why this matters:**
Racing initialization increases the chance of inconsistent behavior (multiple token requests/configure calls) during matching/search/authorization flows.

---

### [MEDIUM] Finding #15: Connect flow allows concurrent authorization attempts (re-entrancy)

**File:** `apps/web/src/features/matching/ConnectAppleMusic.tsx`  
**Lines:** 21-40, 45-57, 71-77  
**Category:** will-break

**Description:**
`handleAuthorize()` does not guard against re-entrancy. While the main button is disabled via `disabled={loading}`, there is a window where the handler can be triggered multiple times (double-click before React state applies), and the error “Try again” button does not check `loading` at all (it relies on `setError(null)` hiding the alert after state updates).

**Code:**
```ts
async function handleAuthorize() {
  setError(null);
  setLoading(true);
  try {
    await initMusicKit();
    await authorizeMusicKit();
    onAuthorized?.();
  } finally {
    setLoading(false);
  }
}

<button onClick={handleAuthorize} disabled={loading}>...</button>

<button type="button" onClick={handleAuthorize}>Try again</button>
```

**Why this matters:**
Concurrent authorization flows can create unpredictable UX (multiple prompts / racing init calls) and magnify the initialization race risks in `musickit.ts`.

---

### [LOW] Finding #16: Error classification is fragile and can surface raw internal messages

**File:** `apps/web/src/features/matching/ConnectAppleMusic.tsx`  
**Lines:** 29-37  
**Category:** slop

**Description:**
The code matches substrings in the error message (`includes("cancel")`, `includes("denied")`, etc.) in a case-sensitive way and otherwise displays the raw error message. This is brittle and may lead to inconsistent user-facing messaging depending on the exact casing/wording of underlying errors.

**Code:**
```ts
const friendly =
  message.includes("cancel") || message.includes("denied")
    ? "You cancelled or denied access. Click below to try again."
    : message.includes("revoked") || message.includes("unauthorized")
      ? "Apple Music access was revoked. Click below to connect again."
      : message;
```

**Why this matters:**
Users may see confusing or overly-technical errors, and “friendly” messaging may fail to trigger for the same underlying scenario if message casing differs.