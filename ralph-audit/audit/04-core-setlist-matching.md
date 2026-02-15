# Core Package – Setlist & Matching Findings

Audit Date: 2026-02-15T06:52:32Z  
Files Examined: 8  
Total Findings: 20  

## Summary by Severity
- Critical: 1
- High: 4
- Medium: 9
- Low: 6

---

## Findings

### CRITICAL Finding #1: `mapSetlistFmToSetlist` only reads `raw.set` and can silently drop all songs when the API returns a `sets` wrapper

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 20-22  
**Category:** broken-logic

**Description:**
The mapper only considers `raw.set` when building `sets`. Real-world setlist.fm API responses are reported to sometimes return set data under `sets: { set: [...] }` (wrapper object) instead of a top-level `set` array. In that case, `Array.isArray(raw.set)` is false, `fmSets` becomes `[]`, and the function returns a `Setlist` with `sets: []` without throwing. This is especially risky because call sites cast `unknown` JSON to `SetlistFmResponse`, so TypeScript does not protect against this shape mismatch.

**Code:**
```ts
const sets: SetlistEntry[][] = [];
const fmSets = Array.isArray(raw.set) ? raw.set : [];
```

**Why this matters:**
This can produce “successful” imports that contain zero tracks, cascading into empty previews/matching flows and making failures hard to diagnose.

---

### HIGH Finding #2: Mapper validation is too shallow; key fields can be missing or non-strings and still propagate into the domain model

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 9-18, 37-43  
**Category:** will-break

**Description:**
The function checks that `raw` is an object and that `raw.artist` is an object, but it never validates that `raw.artist.name` is a string (or even present). Because callers can cast arbitrary JSON to `SetlistFmResponse`, `raw.artist?.name ?? ""` can evaluate to a non-string (e.g., number/object) and still be assigned to `artist` in the returned `Setlist`. Similarly, `raw.id ?? ""` can propagate non-string `id` values.

**Code:**
```ts
if (!raw.artist || typeof raw.artist !== "object") {
  throw new Error("Invalid setlist response: missing artist");
}
const artistName = raw.artist?.name ?? "";

return {
  id: raw.id ?? "",
  artist: artistName,
  // ...
};
```

**Why this matters:**
Downstream UI and matching logic assume `artist`/`id` are valid strings; malformed values can create confusing labels, broken search queries, and hard-to-trace runtime errors.

---

### HIGH Finding #3: Song item “type guard” only checks for a `name` key, not that `name` is a non-empty string

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 25-33  
**Category:** broken-logic

**Description:**
The filter predicate treats any object containing a `name` property as a `SetlistFmSong`, even if `name` is `null`, a number, or an empty string. The mapper then builds entries using `s.name ?? ""`, which allows empty/invalid track names into the `Setlist`. Those invalid names can later normalize to `""`, causing artist-only or empty search queries.

**Code:**
```ts
const entries: SetlistEntry[] = songs
  .filter((s): s is SetlistFmSong => s != null && typeof s === "object" && "name" in s)
  .map((s) => ({
    name: s.name ?? "",
    artist: artistName || undefined,
    info: s.info ?? undefined,
  }));
```

**Why this matters:**
A single malformed song entry can degrade matching quality significantly (including generating empty queries), and the UI may render blank track rows.

---

### MEDIUM Finding #4: Implementation contradicts “preserves set structure” comment by dropping empty sets entirely

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 4-8, 34  
**Category:** slop

**Description:**
The doc comment claims “Preserves set structure and order”, but the implementation skips any set that maps to zero entries (`if (entries.length > 0) sets.push(entries)`). This changes the set structure by removing empty sets (including sets that might exist only for metadata like encore markers or set names).

**Code:**
```ts
* Preserves set structure and order; each song becomes a SetlistEntry.

if (entries.length > 0) sets.push(entries);
```

**Why this matters:**
Consumers that rely on set boundaries (or want to display them faithfully) can’t distinguish “empty set present” from “set missing,” and the UI can drift from the source setlist.

---

### MEDIUM Finding #5: Mapper discards set/song metadata (encore/set name/cover/with/tape), reducing fidelity and potentially harming matching

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 25-33  
**Category:** broken-logic

**Description:**
The mapper only outputs `name`, `artist`, and `info`, ignoring known setlist.fm fields such as `SetlistFmSet.name`, `SetlistFmSet.encore`, and song fields like `tape`, `with`, and `cover`. Some of these fields can materially affect whether an entry is a real “song” to match (e.g., tape/intro) or can help disambiguate search.

**Code:**
```ts
.map((s) => ({
  name: s.name ?? "",
  artist: artistName || undefined,
  info: s.info ?? undefined,
}));
```

**Why this matters:**
This can lead to matching/playlist entries that include non-song items and reduces the app’s ability to explain or correct ambiguous matches.

---

### HIGH Finding #6: `SetlistFmResponse` type cannot represent the reported `sets: { set: [...] }` wrapper shape

**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 34-42  
**Category:** will-break

**Description:**
The core type models set data only as `set?: SetlistFmSet[]`. Community reports indicate that real setlist.fm API responses can return sets under a wrapper object (e.g., `sets: { set: [...] }`). With the current type, that shape is unrepresentable, encouraging unsafe casts and making it easy for the mapper to “succeed” but return zero songs.

**Code:**
```ts
export interface SetlistFmResponse {
  // ...
  set?: SetlistFmSet[];
  // ...
}
```

**Why this matters:**
This creates a false sense of type safety at the exact boundary the app relies on for song extraction.

---

### MEDIUM Finding #7: Type/runtime contract mismatch: `SetlistFmSet.song` is required in the type but treated as optional/unknown in implementation

**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 28-32  
**Category:** slop

**Description:**
`SetlistFmSet.song` is declared as a required `SetlistFmSong[]`, but the mapper treats `fmSet.song` as potentially missing/malformed (guards with `Array.isArray(fmSet.song)`). This indicates the interface does not reflect the runtime contract the code is written against.

**Code:**
```ts
export interface SetlistFmSet {
  name?: string;
  encore?: number;
  song: SetlistFmSong[];
}
```

**Why this matters:**
Consumers of the type may incorrectly assume `song` is always present/valid, while the implementation is already compensating for invalid shapes.

---

### MEDIUM Finding #8: `SetlistFmSong.cover` and `SetlistFmSong.with` are typed as `unknown` despite being structured in docs

**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 20-26  
**Category:** slop

**Description:**
The types model `cover` and `with` as `unknown`, even though setlist.fm documentation models them as structured objects (artist-like). This removes useful type information and encourages downstream code to ignore these fields entirely.

**Code:**
```ts
export interface SetlistFmSong {
  name: string;
  info?: string;
  cover?: unknown;
  with?: unknown;
  tape?: boolean;
}
```

**Why this matters:**
Loss of structure reduces the ability to disambiguate songs (covers/guest performers) and can lead to unsafe casting when someone eventually uses these fields.

---

### LOW Finding #9: `SetlistFmArtist` / `SetlistFmVenue` are partial vs docs; drift risk despite the “API response” framing

**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 1-18  
**Category:** slop

**Description:**
These interfaces omit multiple documented fields (e.g., artist disambiguation; venue/city/country details). The file comment frames them as “Types for the setlist.fm REST API response,” which can be read as more complete/authoritative than they are (even with “subset used by the app”).

**Code:**
```ts
export interface SetlistFmArtist {
  name: string;
  mbid?: string;
  sortName?: string;
  url?: string;
}
```

**Why this matters:**
Partial API modeling increases the risk of mismatched expectations and future incorrect assumptions at the setlist.fm boundary.

---

### MEDIUM Finding #10: `normalizeTrackName` removes all parentheticals anywhere, including canonical title text

**File:** `packages/core/src/matching/normalize.ts`  
**Lines:** 10-12  
**Category:** broken-logic

**Description:**
The first replace removes any `(...)` substring anywhere in the title. Many canonical song titles contain meaningful parentheticals (not just live/acoustic/feat markers). Removing them can change the title substantially and increase false positives in catalog search.

**Code:**
```ts
.replace(/\s*\([^)]*\)\s*/g, " ") // (live), (acoustic), etc.
```

**Why this matters:**
Over-stripping can lead to searching for the wrong title, especially for songs where parentheticals are part of the official name.

---

### MEDIUM Finding #11: Parenthetical stripping regex does not handle nested parentheses and can leave malformed remnants

**File:** `packages/core/src/matching/normalize.ts`  
**Lines:** 11-12  
**Category:** will-break

**Description:**
The regex `\([^)]*\)` cannot correctly handle nested parentheses (it stops at the first `)`), potentially leaving stray `)` characters or partially stripping content. The follow-up “unbalanced trailing parens” rule only addresses an opening `(` without a closing `)` at the end of the string, not nested/mid-string artifacts.

**Code:**
```ts
.replace(/\s*\([^)]*\)\s*/g, " ")
.replace(/\s*\([^)]*$/g, " ")
```

**Why this matters:**
Malformed normalization output can reduce search quality and create confusing queries that don’t match catalog titles.

---

### MEDIUM Finding #12: “- live” stripping only recognizes hyphen-minus, not en dash/em dash variants

**File:** `packages/core/src/matching/normalize.ts`  
**Lines:** 13, 16  
**Category:** broken-logic

**Description:**
The code strips only `- live` with a literal hyphen-minus. If a setlist track uses `– Live` or `— Live` (common typography), it won’t be stripped. The later normalization collapses dashes into spaces, leaving an extra `Live` token in the query.

**Code:**
```ts
.replace(/\s*-\s*live\s*$/i, "")
.replace(/[\s\-–—]+/g, " ")
```

**Why this matters:**
Live versions are a primary normalization target; failing to strip common dash variants undermines the stated intent and can skew results.

---

### LOW Finding #13: Comment claims “strip extra punctuation,” but implementation largely only normalizes whitespace/dashes

**File:** `packages/core/src/matching/normalize.ts`  
**Lines:** 1-4, 16  
**Category:** slop

**Description:**
The function comment describes stripping “extra punctuation,” but the code does not remove punctuation such as `! ? . , / : ' "`. Aside from collapsing hyphen/dash runs into spaces, punctuation remains in the returned string.

**Code:**
```ts
* Normalize track name for search: strip "feat.", "live", extra punctuation, parentheticals.

.replace(/[\s\-–—]+/g, " ")
```

**Why this matters:**
Mismatch between comment and behavior can mislead callers and reviewers, and punctuation can materially affect search terms depending on the API’s tokenization.

---

### HIGH Finding #14: `buildSearchQuery` can return artist-only queries when the track normalizes to empty

**File:** `packages/core/src/matching/search-query.ts`  
**Lines:** 10-14  
**Category:** will-break

**Description:**
If `normalizeTrackName(trackName)` returns `""` (empty input, fully stripped titles, or invalid `name` values leaking from the mapper), the returned query becomes just the artist name. In catalog search flows, an artist-only query can return arbitrary popular tracks by that artist, increasing the chance of incorrect “top result” matches.

**Code:**
```ts
const track = normalizeTrackName(trackName).slice(0, MAX_QUERY_LENGTH);
const artist = (artistName?.trim() ?? "").slice(0, MAX_QUERY_LENGTH);
const parts = [track, artist].filter(Boolean);
return parts.join(" ").replace(/\s+/g, " ").trim();
```

**Why this matters:**
This can produce systematically wrong suggestions that still look plausible to users (same artist, wrong song).

---

### MEDIUM Finding #15: Query length capping is not applied to the final query, despite the stated intent

**File:** `packages/core/src/matching/search-query.ts`  
**Lines:** 3-5, 10-14  
**Category:** broken-logic

**Description:**
`MAX_QUERY_LENGTH` is applied independently to `track` and `artist`, but the final query can still exceed the limit once joined (up to ~401 chars plus normalization). This contradicts the comment that the length is capped to avoid very long queries hitting API limits.

**Code:**
```ts
/** DCI-051: Cap length to avoid very long queries hitting API limits. */
const MAX_QUERY_LENGTH = 200;

const track = normalizeTrackName(trackName).slice(0, MAX_QUERY_LENGTH);
const artist = (artistName?.trim() ?? "").slice(0, MAX_QUERY_LENGTH);
```

**Why this matters:**
If upstream search endpoints enforce term-length limits, the cap may not prevent failures in worst-case inputs.

---

### MEDIUM Finding #16: `buildSearchQuery` can return an empty string when both inputs are empty/stripped

**File:** `packages/core/src/matching/search-query.ts`  
**Lines:** 10-14  
**Category:** will-break

**Description:**
When both `track` and `artist` are empty after trimming/normalization, `parts` becomes empty and the function returns `""`. There is no guard here; callers can pass an empty term to a search API, which commonly results in errors or broad/unexpected results.

**Code:**
```ts
const parts = [track, artist].filter(Boolean);
return parts.join(" ").replace(/\s+/g, " ").trim();
```

**Why this matters:**
Empty queries are a common edge case in user-driven flows and in the presence of malformed upstream data (e.g., blank song names).

---

### LOW Finding #17: `AppleTrack` / `MatchResult` appear unused in the repo, and `MatchResult.setlistEntry` duplicates shape while dropping fields

**File:** `packages/core/src/matching/types.ts`  
**Lines:** 1-12  
**Category:** dead-end

**Description:**
Repo-wide usage (excluding audit artifacts/docs) shows no imports of `AppleTrack` or `MatchResult`. Additionally, `MatchResult.setlistEntry` redefines a `{ name; artist? }` shape instead of referencing `SetlistEntry`, dropping `info` and risking divergence if the domain model evolves.

**Code:**
```ts
export interface MatchResult {
  /** Original setlist entry */
  setlistEntry: { name: string; artist?: string };
  /** Matched Apple Music track, or null if no match */
  appleTrack: AppleTrack | null;
}
```

**Why this matters:**
Unused exported types add maintenance surface area, and duplicated shapes tend to drift subtly over time.

---

### LOW Finding #18: `normalizeTrackName` is exported from the package barrel but has no non-test consumers

**File:** `packages/core/src/matching/index.ts`  
**Lines:** 1-3  
**Category:** dead-end

**Description:**
Within the repo (excluding tests), matching flows use `buildSearchQuery`, not `normalizeTrackName` directly. Exporting `normalizeTrackName` increases public API surface area without a demonstrated consumer in production code.

**Code:**
```ts
export { normalizeTrackName } from "./normalize.js";
export { buildSearchQuery } from "./search-query.js";
```

**Why this matters:**
Broader public surface area increases the cost of changing normalization semantics later, even if the export is effectively unused.

---

### LOW Finding #19: `SetlistFmArtist` / `SetlistFmVenue` / `SetlistFmSong` / `SetlistFmSet` are re-exported but unused in production code

**File:** `packages/core/src/setlist/index.ts`  
**Lines:** 2-8  
**Category:** dead-end

**Description:**
Repo-wide usage (excluding audit artifacts/docs) shows only `SetlistFmResponse` imported outside `packages/core`; the other setlist.fm type exports are not consumed. This expands the public API for types that are partial and already drifting vs the real API.

**Code:**
```ts
export type {
  SetlistFmResponse,
  SetlistFmArtist,
  SetlistFmVenue,
  SetlistFmSong,
  SetlistFmSet,
} from "./setlistfm-types.js";
```

**Why this matters:**
Unused exports raise the chance of external dependence on incomplete/stale types, making future refactors harder.

---

### LOW Finding #20: `Setlist.eventDate` contract is ambiguous vs setlist.fm’s `eventDate` format

**File:** `packages/core/src/setlist/types.ts`  
**Lines:** 17-18  
**Category:** slop

**Description:**
`Setlist.eventDate` is optional and documented as “ISO or display,” but the mapper assigns `raw.eventDate` directly and setlist.fm documents `eventDate` as `dd-MM-yyyy`. This creates ambiguity for downstream consumers (e.g., playlist naming/formatting) and weakens guarantees about date parsing/formatting expectations.

**Code:**
```ts
/** Event date (ISO or display) */
eventDate?: string;
```

**Why this matters:**
Ambiguous date formats commonly lead to inconsistent UI output and subtle bugs when formatting or sorting by date.

---

## External References
- setlist.fm REST API docs — Setlist JSON (accessed 2026-02-15): https://api.setlist.fm/docs/1.0/json_Setlist.html  
- setlist.fm forum thread reporting `sets: { set: [...] }` wrapper returned by the API (accessed 2026-02-15): https://www.setlist.fm/forum/setlistfm-api-6/the-rest-api-returns-setsset-instead-of-set-7bd6aaec