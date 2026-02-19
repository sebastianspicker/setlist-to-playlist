# Types & Interfaces Deep Audit Findings

Audit Date: 2026-02-15  
Files Examined: 35  
Total Findings: 17  

## Summary by Severity
- Critical: 2
- High: 2
- Medium: 9
- Low: 4

---

## Findings

### [CRITICAL] Finding #1: `SetlistFmResponse` models `set` but real responses use `sets: { set: ... }` (songs can be dropped)

**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 34-44  
**Category:** will-break  

**Description:**
`SetlistFmResponse` defines `set?: SetlistFmSet[]`, implying the set array is at the top level. Multiple real-world examples show setlist.fm responses using a wrapper object `sets` containing `set` (array). With the current type, downstream code is encouraged to read `raw.set`, and valid responses shaped as `raw.sets.set` will appear as “no sets”.

**Code:**
```typescript
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
This can result in silently importing a setlist with **0 tracks**, even when the API returned songs, breaking the core “import → preview → match → export” flow.

---

### [CRITICAL] Finding #2: Mapper only reads `raw.set`, so `raw.sets.set` responses map to empty `sets`

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 20-35  
**Category:** will-break  

**Description:**
The mapper uses `Array.isArray(raw.set)` and otherwise treats the setlist as having no sets. If the incoming payload uses `sets: { set: [...] }`, this produces an empty `Setlist.sets` and downstream UIs show zero tracks.

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
A valid API response shape mismatch becomes a total functional failure (no songs to preview/match/export) without an obvious error.

---

### [HIGH] Finding #3: Web client casts proxy JSON to `SetlistFmResponse` without validating shape (type safety is illusory)

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 48-72  
**Category:** will-break  

**Description:**
The client parses JSON into `{ error?: string } | SetlistFmResponse`, and on success forcibly casts `data as SetlistFmResponse` and passes it to the mapper. The only “validation” is `!res.ok || "error" in data`, which does not assert required fields (`artist`, `eventDate`, and especially the `set` vs `sets` structure). This can convert a real API payload into a mapped setlist with empty tracks (or throw inside the mapper).

**Code:**
```typescript
let data: { error?: string } | SetlistFmResponse;
try {
  data = (await res.json()) as { error?: string } | SetlistFmResponse;
} catch { /* ... */ }

if (!res.ok || "error" in data) { /* ... */ }

const mapped = mapSetlistFmToSetlist(data as SetlistFmResponse);
setSetlist(mapped);
setStep("preview");
```

**Why this matters:**
Type assertions can hide real API drift until runtime, causing broken imports that look “successful” (no explicit error) but contain no songs.

---

### [HIGH] Finding #4: MusicKit JS surface is modeled ad-hoc (`music.music.api`) and conflicts with common/typed `api` surfaces (risk of runtime `undefined`)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 27-35, 187-190, 222-228, 262-264  
**Category:** will-break  

**Description:**
The local `MusicKitInstance` interface defines a `music: { api: (path, options) => Promise<unknown> }`, and all Apple Music calls are made via `music.music.api(...)`. Widely used typings and references for MusicKit JS expose an `api` object on the instance (e.g. `music.api.music(...)`) rather than an extra `.music` nesting. If the real runtime instance does not match this hand-written shape, calls like `music.music.api` will throw (`Cannot read properties of undefined`).

**Code:**
```typescript
interface MusicKitInstance {
  authorize(): Promise<string>;
  unauthorize(): Promise<void>;
  isAuthorized: boolean;
  storefrontId: string;
  music: {
    api: (path: string, options?: { method?: string; data?: unknown }) => Promise<unknown>;
  };
}

// Usage:
const data = (await music.music.api(path)) as { /* ... */ };
```

**Why this matters:**
This is a single-point-of-failure abstraction: if the real MusicKit API surface differs, **catalog search, playlist create, and add-tracks all fail**.

---

### [MEDIUM] Finding #5: `SetlistFmVenue.city` / `country` shape is truncated and has incorrect required fields vs observed payloads

**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 13-18  
**Category:** slop  

**Description:**
`city` is modeled as `{ name: string; country?: { code: string } }`, but observed payloads commonly include `city.id`, `state`, `stateCode`, `coords`, and `country.name`, and may include empty objects for `country` in some cases. As written, if `country` is present but missing `code`, the type encourages unsafe access patterns.

**Code:**
```typescript
export interface SetlistFmVenue {
  name: string;
  id?: string;
  city?: { name: string; country?: { code: string } };
  url?: string;
}
```

**Why this matters:**
When UI/logic later starts using location data (city/country), these types can create false confidence and lead to undefined reads or incorrect displays.

---

### [MEDIUM] Finding #6: `SetlistFmSong.cover` / `with` typed as `unknown` despite being documented/observed as artist objects

**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 20-26  
**Category:** slop  

**Description:**
`cover` and `with` are typed as `unknown`, losing a clear domain shape (artist-like objects). This pushes consumers toward unsafe casting or ignoring useful metadata.

**Code:**
```typescript
export interface SetlistFmSong {
  name: string;
  info?: string;
  cover?: unknown;
  with?: unknown;
  tape?: boolean;
}
```

**Why this matters:**
It prevents type-safe handling of common setlist features (covers, guest performers) and increases the chance of ad-hoc casts later.

---

### [MEDIUM] Finding #7: `SetlistFmResponse` omits `lastUpdated` and weakens `versionId` / `url` optionality compared to documented contracts

**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 34-44  
**Category:** slop  

**Description:**
The type does not include `lastUpdated`, and marks `versionId` and `url` optional. Documentation indicates `lastUpdated` and `url` exist on the Setlist object; weakening these fields makes it easy to forget attribution (`url`) and obscures update/refresh logic (`lastUpdated`, `versionId`).

**Code:**
```typescript
export interface SetlistFmResponse {
  id: string;
  versionId?: string;
  eventDate: string;
  // ...
  url?: string;
}
```

**Why this matters:**
Missing/optional attribution fields can become a compliance/UX issue, and missing update metadata makes caching/refresh behavior harder to reason about.

---

### [MEDIUM] Finding #8: `SetlistFmSet.song` is required in the type, but mapper treats it as optional/malformed (type and runtime expectations disagree)

**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 28-32  
**Category:** slop  

**Description:**
The type requires `song: SetlistFmSong[]`, but the mapper defensively does `Array.isArray(fmSet.song) ? fmSet.song : []`, implying `song` may be missing or non-array at runtime. This mismatch means the type contract does not reflect real-world variability or the app’s own defensive posture.

**Code:**
```typescript
export interface SetlistFmSet {
  name?: string;
  encore?: number;
  song: SetlistFmSong[];
}
```

**Why this matters:**
Misleading required fields encourage consumers to skip checks, while production data can still be malformed (or shaped differently), leading to runtime errors or silent data loss.

---

### [MEDIUM] Finding #9: Mapper’s type guard `s is SetlistFmSong` is unsound (only checks `"name" in s`)

**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 27-33  
**Category:** slop  

**Description:**
The filter claims to narrow to `SetlistFmSong` but only asserts that `name` exists as a key, not that `name` is a string (or that other fields match). This undermines the value of the `SetlistFmSong` type within the mapper and can let unexpected values through as if they were valid songs.

**Code:**
```typescript
.filter((s): s is SetlistFmSong => s != null && typeof s === "object" && "name" in s)
.map((s) => ({
  name: s.name ?? "",
  artist: artistName || undefined,
  info: s.info ?? undefined,
}));
```

**Why this matters:**
It can propagate non-string `name` values into `SetlistEntry.name` (typed as `string`), causing surprising UI behavior and making debugging harder.

---

### [MEDIUM] Finding #10: Proxy and fetcher return `unknown` bodies, forcing unsafe assertions across the API boundary

**File:** `apps/api/src/routes/setlist/proxy.ts`  
**Lines:** 6-8  
**Category:** slop  

**Description:**
Successful proxy responses carry `body: unknown`, and the proxy does not validate/normalize the upstream response into a known `SetlistFmResponse` shape before returning it.

**Code:**
```typescript
export type ProxyResponse =
  | { body: unknown; status: number }
  | { error: string; status: number };
```

**Why this matters:**
Clients must cast to a presumed shape, which can easily drift from reality and break at runtime (especially given `set` vs `sets` uncertainty).

---

### [MEDIUM] Finding #11: setlist.fm fetcher result type also uses `body: unknown`, reinforcing downstream casts

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 72-74, 96-100  
**Category:** slop  

**Description:**
`FetchSetlistResult` uses `body: unknown` even on `ok: true`, and stores cached payloads as `unknown`. This spreads uncertainty downstream and makes it hard to prove that the mapper receives the expected setlist shape.

**Code:**
```typescript
export type FetchSetlistResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; message: string };

body = (await res.json()) as unknown;
```

**Why this matters:**
It encourages “cast-and-pray” patterns at the edges and increases the likelihood that shape drift becomes a runtime failure.

---

### [MEDIUM] Finding #12: `DevTokenResponse` is duplicated and weakened in the web client (union vs “all-optional” object)

**File:** `apps/api/src/routes/apple/dev-token.ts`  
**Lines:** 3  
**Category:** slop  

**Description:**
The API defines a strict union `{ token } | { error }`, but the client models the parsed JSON as `{ token?: string; error?: string }`, which permits impossible states (`{}` or `{ token, error }`) and loses the mutual exclusivity guarantee.

**Code:**
```typescript
export type DevTokenResponse = { token: string } | { error: string };
```

**Why this matters:**
A weaker client type makes it easier for unexpected server responses to slip through without being caught by TypeScript (and complicates reasoning about control flow).

---

### [MEDIUM] Finding #13: MusicKit `configure()` return type is overly broad, forcing “thenable duck-typing”

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 9-12, 112-120  
**Category:** slop  

**Description:**
`configure()` is typed as returning `Promise<MusicKitInstance> | MusicKitInstance | void`, and the implementation checks for `.then` at runtime. This suggests the code does not know the real contract and makes the integration more fragile.

**Code:**
```typescript
interface MusicKitGlobal {
  configure(options: MusicKitConfigureOptions): Promise<MusicKitInstance> | MusicKitInstance | void;
  getInstance(): MusicKitInstance;
}

if (configureResult && typeof (configureResult as Promise<unknown>).then === "function") {
  await (configureResult as Promise<MusicKitInstance>);
}
```

**Why this matters:**
If the real return value differs (or is a non-Promise thenable), initialization and all dependent API calls can behave unpredictably.

---

### [MEDIUM] Finding #14: MusicKit API response typing is under-specified and can silently produce empty-string track names

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 187-200, 37-41  
**Category:** slop  

**Description:**
The search response is cast with optional `attributes?.name`, and the mapping falls back to `""` when missing. Meanwhile, `AppleMusicTrack.name` is typed as required `string`, implying it’s always meaningful. This mismatch can silently create blank track labels and degrade matching/selection UX.

**Code:**
```typescript
export interface AppleMusicTrack {
  id: string;
  name: string;
  artistName?: string;
}

const tracks: AppleMusicTrack[] = songs.map((s) => ({
  id: s.id,
  name: s.attributes?.name ?? "",
  artistName: s.attributes?.artistName,
}));
```

**Why this matters:**
It hides API/typing issues by substituting empty strings, leading to confusing UI states and potentially worse matching behavior.

---

### [MEDIUM] Finding #15: Apple track shapes are duplicated across core and web (risk of drift/inconsistent optionality)

**File:** `packages/core/src/matching/types.ts`  
**Lines:** 1-5  
**Category:** slop  

**Description:**
Core defines `AppleTrack`, while web defines `AppleMusicTrack` with a similar shape. These are parallel contracts that can drift (fields, optionality, meaning) without TypeScript catching mismatches across package boundaries.

**Code:**
```typescript
export interface AppleTrack {
  id: string;
  name: string;
  artistName?: string;
}
```

**Why this matters:**
Type duplication across layers increases maintenance burden and makes subtle inconsistencies (e.g. required vs optional fields) more likely over time.

---

### [LOW] Finding #16: Placeholder type exported publicly but unused (`AppleCatalogTrack`)

**File:** `packages/core/src/apple/types.ts`  
**Lines:** 1-8  
**Category:** dead-end  

**Description:**
`AppleCatalogTrack` is explicitly labeled “Placeholder” and exported via `@repo/core` (through `packages/core/src/apple/index.ts`), but no usages exist in the repo. Its high optionality (`attributes?`, `name?`) also indicates it is not a stable contract.

**Code:**
```typescript
/** Placeholder for Apple Music API types used by core (e.g. catalog track). */
export interface AppleCatalogTrack {
  id: string;
  attributes?: {
    name?: string;
    artistName?: string;
  };
}
```

**Why this matters:**
Dead, placeholder exports tend to rot and can mislead consumers into treating them as authoritative contracts.

---

### [LOW] Finding #17: `Setlist.sets` is required by type but treated as optional in web usage (inconsistent contract assumptions)

**File:** `packages/core/src/setlist/types.ts`  
**Lines:** 10-21  
**Category:** slop  

**Description:**
`Setlist.sets` is required (`SetlistEntry[][]`), but web code frequently uses `setlist.sets ?? []` patterns, implying it may be missing/undefined. This inconsistency suggests the domain contract isn’t trusted by consumers.

**Code:**
```typescript
export interface Setlist {
  // ...
  /** Ordered list of tracks/songs */
  sets: SetlistEntry[][];
}
```

**Why this matters:**
It signals contract ambiguity: either the type is too strict for real runtime states, or consumers are defensive due to prior shape problems—both reduce TypeScript’s effectiveness.

---

## External References

- `https://api.setlist.fm/docs/1.0/json_Setlist.html` (accessed 2026-02-15)  
- `https://api.setlist.fm/forum/12-issues/suggestions/49034497-the-actual-response-doesn-t-match-the-swagger-defin` (accessed 2026-02-15)  
- `https://api.setlist.fm/forum/12-issues/suggestions/49966162-a-typical-setlist-response-looks-like-sets-set` (accessed 2026-02-15)  
- `https://stackoverflow.com/questions/70576780/need-help-parsing-the-response-data-from-setlist-fm-api` (accessed 2026-02-15)  
- `https://app.unpkg.com/@types/musickit-js@1.0.10/files/MusicKit.MusicKitInstance.d.ts` (accessed 2026-02-15)  
- `https://app.unpkg.com/@types/musickit-js@1.0.10/files/MusicKit.API.d.ts` (accessed 2026-02-15)