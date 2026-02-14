# Core Package – Setlist & Matching Findings

Audit Date: 2026-02-14T00:00:00Z  
Files Examined: 8  
Total Findings: 13  

## Summary by Severity
- Critical: 0
- High: 4
- Medium: 5
- Low: 4

---

## Findings

### [HIGH] Finding #1: `mapSetlistFmToSetlist` only reads `raw.set` and silently drops set data when the API returns a `sets` wrapper

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 20-35  
**Category:** will-break  

**Description:**
The mapper only attempts to read sets via `raw.set` and treats anything else as “no sets”. setlist.fm’s published JSON model documents a top-level `set` array, but the setlist.fm API forum documents a known discrepancy where responses can include a `sets` object containing the `set` array. In that scenario, this mapper returns `sets: []` without error, making imports appear successful while yielding zero tracks.

**Code:**
```typescript
const sets: SetlistEntry[][] = [];
const fmSets = Array.isArray(raw.set) ? raw.set : [];

for (const fmSet of fmSets) {
  if (!fmSet || typeof fmSet !== "object") continue;
  const songs = Array.isArray(fmSet.song) ? fmSet.song : [];
  // ...
}
```

**Why this matters:**
A setlist import can “succeed” but produce an empty tracklist, breaking the core flow (preview/matching/export) and making debugging difficult because no error is surfaced.

---

### [HIGH] Finding #2: Mapper “validates” `raw.artist` is an object but does not validate `artist.name` (or other fields) are strings, allowing invalid domain data

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 10-19  
**Category:** will-break  

**Description:**
The function checks `raw` and `raw.artist` are objects, but never validates `raw.artist.name` is a string. Because call sites can cast unknown JSON into `SetlistFmResponse`, runtime values can violate the TypeScript interfaces. If `raw.artist.name` is missing, empty, or a non-string, the function returns a `Setlist` with an empty or non-string `artist`, which then propagates into UI labels and Apple Music search queries.

**Code:**
```typescript
if (!raw || typeof raw !== "object") {
  throw new Error("Invalid setlist response");
}
if (!raw.artist || typeof raw.artist !== "object") {
  throw new Error("Invalid setlist response: missing artist");
}
const artistName = raw.artist?.name ?? "";
```

**Why this matters:**
Downstream code assumes `setlist.artist` is meaningful. Invalid/empty artist names can degrade matching quality and can present confusing UX (“Setlist: ”).

---

### [HIGH] Finding #3: Song filtering/type-guard is too weak; `SetlistEntry.name` can become non-string and empty-string entries are preserved

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 25-33  
**Category:** broken-logic  

**Description:**
The filter only checks that the song value is an object and that `"name" in s`, but does not validate that `s.name` is a string. As a result:
- If `name` exists but is non-string (number/object), it passes the filter and is assigned to `SetlistEntry.name` via `s.name ?? ""` (non-nullish non-string values survive).
- If `name` is missing/undefined, the code coerces it to `""` and still includes the entry.

**Code:**
```typescript
const entries: SetlistEntry[] = songs
  .filter((s): s is SetlistFmSong => s != null && typeof s === "object" && "name" in s)
  .map((s) => ({
    name: s.name ?? "",
    artist: artistName || undefined,
    info: s.info ?? undefined,
  }));
```

**Why this matters:**
Invalid track names can lead to bad rendering (“” track rows) and can generate overly broad Apple Music searches (including artist-only queries), producing incorrect suggested matches.

---

### [HIGH] Finding #4: `normalizeTrackName` “feat/ft” regexes are missing word boundaries, so they can match inside unrelated words and corrupt titles

**File:** `packages/core/src/matching/normalize.ts`  
**Lines:** 8-14  
**Category:** broken-logic  

**Description:**
The `feat`/`ft` regexes begin with `\s*`, which can match zero characters, and do not require a word boundary before `feat`/`ft`. This allows matches starting inside other words (e.g., substrings like `...feat...` / `...ft...`), and then strips subsequent characters due to `[^-]+...`.

**Code:**
```typescript
.replace(/\s*feat\.?\s*[^-]+(?:-\s*[^-]+)*/gi, "")
.replace(/\s*ft\.?\s*[^-]+(?:-\s*[^-]+)*/gi, "")
```

**Why this matters:**
Track normalization can mangle legitimate titles, producing poor search queries and significantly increasing the chance of wrong matches.

---

### [MEDIUM] Finding #5: `normalizeTrackName` comment and implementation disagree; the “match until next ' - '” behavior is not what the regex does

**File:** `packages/core/src/matching/normalize.ts`  
**Lines:** 8-13  
**Category:** slop  

**Description:**
The inline comment claims the `feat/ft` segment is matched “until next ` - ` or end”, but the regex actually stops at any literal hyphen (`-`) (not specifically ` - `), and does not treat en-dash/em-dash consistently during the `feat/ft` removal step (those are handled later by the whitespace/hyphen normalization). This makes the actual removal behavior sensitive to punctuation choices and can under/over-strip.

**Code:**
```typescript
// ... match until next " - " or end
.replace(/\s*feat\.?\s*[^-]+(?:-\s*[^-]+)*/gi, "")
```

**Why this matters:**
Misleading comments make future changes risky, and inconsistent stripping leads to unstable search behavior across real-world title formats.

---

### [MEDIUM] Finding #6: Parenthetical stripping is unconditional and removes canonical title content (not only metadata)

**File:** `packages/core/src/matching/normalize.ts`  
**Lines:** 10-10  
**Category:** broken-logic  

**Description:**
The normalization removes all parenthetical segments anywhere in the string, not just trailing metadata like “(live)” or “(acoustic)”. Many legitimate titles contain parentheses as part of the official name; removing them changes the search term materially.

**Code:**
```typescript
.replace(/\s*\([^)]*\)\s*/g, " ") // (live), (acoustic), etc.
```

**Why this matters:**
Over-stripping can reduce match accuracy or cause the “best” match to be the wrong song (especially when multiple songs share the remaining token(s)).

---

### [MEDIUM] Finding #7: `buildSearchQuery` length cap is per-part, not total; combined query can exceed `MAX_QUERY_LENGTH` and the cap is a magic number

**File:** `packages/core/src/matching/search-query.ts`  
**Lines:** 3-15  
**Category:** slop  

**Description:**
`MAX_QUERY_LENGTH` is applied independently to track and artist, so the final query can be roughly `200 + 1 + 200` characters (plus normalization effects). If the intent is to prevent total query length from exceeding API limits, this does not enforce it. The constant is also a “magic number” without a referenced limit.

**Code:**
```typescript
const MAX_QUERY_LENGTH = 200;

const track = normalizeTrackName(trackName).slice(0, MAX_QUERY_LENGTH);
const artist = (artistName?.trim() ?? "").slice(0, MAX_QUERY_LENGTH);
const parts = [track, artist].filter(Boolean);
return parts.join(" ").replace(/\s+/g, " ").trim();
```

**Why this matters:**
Long inputs can still produce long queries and trigger upstream request failures or truncation behavior that is hard to reason about.

---

### [MEDIUM] Finding #8: `buildSearchQuery` can return artist-only queries, enabling “random” auto-suggestions when track normalizes to empty

**File:** `packages/core/src/matching/search-query.ts`  
**Lines:** 10-14  
**Category:** will-break  

**Description:**
When `normalizeTrackName(trackName)` returns `""` (e.g., empty track name, or a name that is fully stripped), `buildSearchQuery` returns only the artist name. In the matching flow, an artist-only catalog search can return arbitrary popular tracks by that artist, and the first result can be incorrectly suggested as the match.

**Code:**
```typescript
const parts = [track, artist].filter(Boolean);
return parts.join(" ").replace(/\s+/g, " ").trim();
```

**Why this matters:**
Incorrect default matches create bad playlists unless the user manually audits every row, undermining trust in the “suggestions” step.

---

### [MEDIUM] Finding #9: `setlistfm-types` is incomplete and can be out-of-sync with both the docs and reported real responses (missing `lastUpdated`, missing `sets` wrapper, `cover/with` are `unknown`)

**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 1-44  
**Category:** will-break  

**Description:**
Problems in the setlist.fm type modeling:
- `SetlistFmResponse` omits documented fields like `lastUpdated`, increasing the odds that consumers cast/ignore fields and drift from reality.
- The types only represent a top-level `set?: SetlistFmSet[]`, but the setlist.fm forum reports a known discrepancy where responses can include `sets: { set: [...] }`.
- `SetlistFmSong.cover` and `SetlistFmSong.with` are typed as `unknown`, even though the docs model them as structured artist-like objects. This reduces type safety and discourages proper runtime checks.

**Code:**
```typescript
export interface SetlistFmSong {
  name: string;
  info?: string;
  cover?: unknown;
  with?: unknown;
  tape?: boolean;
}

export interface SetlistFmResponse {
  id: string;
  versionId?: string;
  eventDate: string;
  artist: SetlistFmArtist;
  venue?: SetlistFmVenue;
  tour?: { name?: string };
  set?: SetlistFmSet[];
  info?: string;
  url?: string;
}
```

**Why this matters:**
Type drift increases the chance that production data doesn’t match compile-time assumptions, leading to silent data loss (missing sets) or runtime oddities when values don’t conform.

---

### [LOW] Finding #10: `normalizeTrackName` docstring claims “extra punctuation” stripping, but implementation mostly preserves punctuation (except hyphens/dashes)

**File:** `packages/core/src/matching/normalize.ts`  
**Lines:** 1-16  
**Category:** slop  

**Description:**
The comment claims punctuation is stripped, but the implementation does not remove most punctuation characters (e.g., `!`, `.`, `,`, `'`, `:`). The only “punctuation-ish” normalization is collapsing hyphen/dash characters into spaces.

**Code:**
```typescript
/**
 * Normalize track name for search: strip "feat.", "live", extra punctuation, parentheticals.
 */
  // ...
  .replace(/[\s\-–—]+/g, " ")
```

**Why this matters:**
Comments are used as “intent”; when they diverge from behavior, callers may overestimate normalization strength and rely on it for cases it does not handle.

---

### [LOW] Finding #11: `Setlist.eventDate` comment is ambiguous (“ISO or display”), but imported data is a fixed `dd-MM-yyyy` string per setlist.fm docs

**File:** `packages/core/src/setlist/types.ts`  
**Lines:** 17-18  
**Category:** slop  

**Description:**
The type comment suggests `eventDate` could be ISO, but the mapped setlist.fm field is documented as `dd-MM-yyyy`. This can cause downstream assumptions (sorting, formatting, parsing) to be wrong or inconsistent if a caller treats it as ISO.

**Code:**
```typescript
/** Event date (ISO or display) */
eventDate?: string;
```

**Why this matters:**
Date strings that look structured but aren’t ISO frequently lead to subtle bugs (lexicographic sorts, locale parsing differences, invalid `Date` parsing in JS).

---

### [LOW] Finding #12: `AppleTrack` / `MatchResult` types are exported but unused anywhere in the repo (dead-end surface area)

**File:** `packages/core/src/matching/types.ts`  
**Lines:** 1-12  
**Category:** dead-end  

**Description:**
`AppleTrack` and `MatchResult` are defined and re-exported, but there are no imports/usages in the repository. This is a maintenance burden and can mislead readers into thinking there is core matching logic that produces/consumes `MatchResult` objects when there is not.

**Code:**
```typescript
export interface AppleTrack { /* ... */ }
export interface MatchResult { /* ... */ }
```

**Why this matters:**
Unused exported types expand the public API of `@repo/core` without corresponding implementation or adoption, increasing the cost of future refactors.

---

### [LOW] Finding #13: `SetlistFmArtist` / `SetlistFmVenue` / `SetlistFmSong` / `SetlistFmSet` are re-exported but unused in the repo

**File:** `packages/core/src/setlist/index.ts`  
**Lines:** 2-8  
**Category:** dead-end  

**Description:**
The setlist package index re-exports multiple setlist.fm API types, but repo usage appears to only depend on `SetlistFmResponse`. This creates additional public surface area and implies stability/accuracy requirements for types that are not actively consumed or validated.

**Code:**
```typescript
export type {
  SetlistFmResponse,
  SetlistFmArtist,
  SetlistFmVenue,
  SetlistFmSong,
  SetlistFmSet,
} from "./setlistfm-types.js";
```

**Why this matters:**
Exporting more API-facing types than needed increases the blast radius of type drift (especially given the known doc/response discrepancies for sets).

---

## External References

- https://api.setlist.fm/docs/1.0/json_Setlist.html (accessed 2026-02-14)  
- https://api.setlist.fm/docs/1.0/json_Set.html (accessed 2026-02-14)  
- https://www.setlist.fm/forum/setlistfm/setlistfm-api/bug-on-the-documentation-63d706bf (accessed 2026-02-14)  
- https://www.setlist.fm/forum/setlistfm/setlistfm-api/inconsistent-sets-object-in-api-response-for-get-10artistmbidsetlists-23d700e3 (accessed 2026-02-14)  
- https://www.setlist.fm/forum/setlistfm/setlistfm-api/possible-bug-with-swagger-definition-6bd77efa (accessed 2026-02-14)