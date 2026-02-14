# Types & Interfaces Findings

Audit Date: 2026-02-14T11:21:05Z  
Files Examined: 39  
Total Findings: 16  

## Summary by Severity
- Critical: 0
- High: 3
- Medium: 11
- Low: 2

---

## Files Examined
- `packages/core/src/apple/index.ts`
- `packages/core/src/apple/types.ts`
- `packages/core/src/index.ts`
- `packages/core/src/matching/index.ts`
- `packages/core/src/matching/normalize.ts`
- `packages/core/src/matching/search-query.ts`
- `packages/core/src/matching/types.ts`
- `packages/core/src/setlist/index.ts`
- `packages/core/src/setlist/mapper.ts`
- `packages/core/src/setlist/setlistfm-types.ts`
- `packages/core/src/setlist/types.ts`
- `packages/core/tests/normalize.test.ts`
- `packages/core/tests/search-query.test.ts`
- `packages/core/tests/setlist-mapper.test.ts`
- `apps/api/src/index.ts`
- `apps/api/src/lib/jwt.ts`
- `apps/api/src/lib/setlistfm.ts`
- `apps/api/src/routes/apple/dev-token.ts`
- `apps/api/src/routes/health.ts`
- `apps/api/src/routes/setlist/proxy.ts`
- `apps/web/src/app/api/apple/dev-token/route.ts`
- `apps/web/src/app/api/health/route.ts`
- `apps/web/src/app/api/setlist/proxy/route.ts`
- `apps/web/src/app/error.tsx`
- `apps/web/src/app/global-error.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/features/matching/ConnectAppleMusic.tsx`
- `apps/web/src/features/matching/MatchingView.tsx`
- `apps/web/src/features/matching/index.ts`
- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`
- `apps/web/src/features/playlist-export/index.ts`
- `apps/web/src/features/setlist-import/SetlistImportView.tsx`
- `apps/web/src/features/setlist-import/SetlistPreview.tsx`
- `apps/web/src/features/setlist-import/index.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/config.ts`
- `apps/web/src/lib/cors.ts`
- `apps/web/src/lib/musickit.ts`

---

## Findings

### [HIGH] Finding #1: setlist.fm “sets” shape mismatch risk (`set` vs `sets: { set: ... }`) can silently drop all songs
**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 34-42  
**Category:** will-break  

**Description:**
`SetlistFmResponse` models the set structure as a top-level `set?: SetlistFmSet[]`. Official setlist.fm docs describe a top-level `set` array, but setlist.fm community reports indicate real API responses can instead return `sets: { set: [...] }` (a wrapper object), creating a shape mismatch at the exact field the app relies on for songs. With the current types, that wrapper shape is not representable, encouraging unsafe casts and making it easy for the mapper to “successfully” produce an empty `sets` array (no tracks) rather than failing loudly.

**Code:**
```ts
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
If the upstream payload uses a `sets` wrapper, the app will import a setlist with **zero tracks** and proceed through matching/export with empty data, producing broken UX and wrong playlists.

---

### [HIGH] Finding #2: Mapper hardcodes `raw.set` and has no typed path for `sets.set` wrapper
**File:** `packages/core/src/setlist/mapper.ts`  
**Lines:** 20-25  
**Category:** will-break  

**Description:**
The mapper reads `raw.set` directly. If the upstream response shape is `sets: { set: [...] }`, the mapper will treat it as “no sets” and return `sets: []` without any error, because it defaults to an empty array.

**Code:**
```ts
const sets: SetlistEntry[][] = [];
const fmSets = Array.isArray(raw.set) ? raw.set : [];

for (const fmSet of fmSets) {
  if (!fmSet || typeof fmSet !== "object") continue;
  const songs = Array.isArray(fmSet.song) ? fmSet.song : [];
```

**Why this matters:**
This is a silent failure mode: the type system and runtime checks won’t catch it, and downstream UI logic will just see an empty setlist.

---

### [HIGH] Finding #3: MusicKit JS typings are ad-hoc and conflict with documented `music.api` surface (risk of runtime `undefined` access)
**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 27-35  
**Category:** will-break  

**Description:**
The local `MusicKitInstance` type defines a nested `music: { api: (...) => Promise<unknown> }`, and the implementation calls `music.music.api(...)` (e.g. catalog search, playlist creation, add-tracks). Apple’s MusicKit JS documentation shows the instance surface centered on `music.api...` (object with methods), not a nested `music.music.api` function. Because these types are handwritten, TypeScript will accept usages that may not exist at runtime.

**Code:**
```ts
interface MusicKitInstance {
  authorize(): Promise<string>;
  unauthorize(): Promise<void>;
  isAuthorized: boolean;
  storefrontId: string;
  music: {
    api: (path: string, options?: { method?: string; data?: unknown }) => Promise<unknown>;
  };
}
```

**Why this matters:**
If the runtime instance does not match this guessed shape, calls like `music.music.api(...)` can throw (e.g. “Cannot read properties of undefined”), breaking matching and playlist export flows.

---

### [MEDIUM] Finding #4: `SetlistFmResponse` omits documented `lastUpdated` field (and treats `versionId` as optional)
**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 34-44  
**Category:** slop  

**Description:**
Official setlist.fm setlist docs include `lastUpdated` and show `versionId` as a normal field. This type omits `lastUpdated` entirely and makes `versionId` optional. Even if the app doesn’t currently use `lastUpdated`, exporting these types from `@repo/core` makes them part of a public contract and increases drift risk.

**Code:**
```ts
export interface SetlistFmResponse {
  id: string;
  versionId?: string;
  eventDate: string;
  artist: SetlistFmArtist;
  // ...
}
```

**Why this matters:**
Missing/incorrect fields in a “source-of-truth” API type encourage downstream `as any`/casting, and can cause subtle bugs when new features start relying on fields that the types claim don’t exist.

---

### [MEDIUM] Finding #5: `SetlistFmArtist` is missing documented `disambiguation` (and other known fields)
**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 6-11  
**Category:** slop  

**Description:**
setlist.fm docs show `artist.disambiguation` as part of the artist shape. The core type doesn’t include it, and it also doesn’t model other commonly present fields seen in docs/examples. This is a partial type presented as “Types for the setlist.fm REST API response”, which increases mismatch risk for consumers.

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
Consumers of `@repo/core` types can’t accurately type against documented responses and may “paper over” mismatches with unsafe casts.

---

### [MEDIUM] Finding #6: `SetlistFmSong.cover` / `with` are `unknown` but documented as `artist` objects
**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 20-26  
**Category:** slop  

**Description:**
setlist.fm docs model `cover` and `with` as objects (artist-like). Typing them as `unknown` is an overuse of `unknown` that prevents safe access and invites untyped narrowing/casting wherever they’re needed.

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
This reduces type safety precisely where the upstream schema is known and stable enough to model, and it makes it harder to correctly support covers/guest artists in the future.

---

### [MEDIUM] Finding #7: `SetlistFmVenue.city` shape is heavily truncated vs docs (and `venue.id` is optional)
**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 13-18  
**Category:** slop  

**Description:**
Docs show `venue.city` containing fields like `id`, `state`, `stateCode`, `coords`, plus `country` as an object (not just `{ code }`). This type reduces city to `{ name; country?: { code } }` and makes both `venue.id` and `city` optional. Even if the app doesn’t currently use these fields, this is presented as an API response type and re-exported publicly.

**Code:**
```ts
export interface SetlistFmVenue {
  name: string;
  id?: string;
  city?: { name: string; country?: { code: string } };
  url?: string;
}
```

**Why this matters:**
Downstream code may assume the real payload matches these definitions and lose access to documented fields without realizing they exist.

---

### [MEDIUM] Finding #8: `SetlistFmSet.song` is required in the type, but implementation treats it as optional/malformed
**File:** `packages/core/src/setlist/setlistfm-types.ts`  
**Lines:** 28-32  
**Category:** will-break  

**Description:**
The type claims every set always has `song: SetlistFmSong[]`. In practice, the mapper treats `fmSet.song` as unknown and guards with `Array.isArray`. This mismatch means the TypeScript types do not reflect the runtime contract the code is written against.

**Code:**
```ts
export interface SetlistFmSet {
  name?: string;
  encore?: number;
  song: SetlistFmSong[];
}
```

**Why this matters:**
When types don’t match runtime realities, developers are forced into repetitive runtime checks and casts, and it becomes unclear what the app actually expects.

---

### [MEDIUM] Finding #9: API proxy returns untyped `unknown` setlist bodies; core API types are not used at the boundary
**File:** `apps/api/src/routes/setlist/proxy.ts`  
**Lines:** 6-8  
**Category:** will-break  

**Description:**
The proxy response explicitly returns `body: unknown`. This ensures the client boundary has no structural guarantees, yet the web client later casts the JSON into `SetlistFmResponse`. The repo contains setlist.fm types, but they are not used to validate or type the body at the server boundary.

**Code:**
```ts
export type ProxyResponse =
  | { body: unknown; status: number }
  | { error: string; status: number };
```

**Why this matters:**
This promotes a pattern where the client treats upstream JSON as typed without verification, increasing the risk of runtime shape mismatches (especially around `set` / `sets`).

---

### [MEDIUM] Finding #10: setlist.fm fetcher result type is also `unknown`, reinforcing unsafe casts downstream
**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 70-72  
**Category:** slop  

**Description:**
`FetchSetlistResult` returns `{ ok: true; body: unknown }`. This is a second layer where the payload is intentionally untyped, despite the repo having a `SetlistFmResponse` interface. The app currently relies on client-side casting + best-effort mapper guards.

**Code:**
```ts
export type FetchSetlistResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; message: string };
```

**Why this matters:**
It increases the probability that setlist.fm schema drift (or wrapper shapes like `sets.set`) will reach the client unnoticed.

---

### [MEDIUM] Finding #11: Web client casts proxy JSON to `SetlistFmResponse` without validation (type safety is illusory)
**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 48-63  
**Category:** will-break  

**Description:**
The client parses JSON and immediately treats it as `{ error?: string } | SetlistFmResponse`. Because the upstream body is `unknown`, this cast can easily be wrong. The mapper validates only a small subset of fields, so incorrect shapes can propagate into UI/matching as empty or malformed data rather than being rejected.

**Code:**
```ts
const res = await fetch(url, { signal });
const data = (await res.json()) as { error?: string } | SetlistFmResponse;

// ...

const mapped = mapSetlistFmToSetlist(data as SetlistFmResponse);
```

**Why this matters:**
Incorrect type assumptions at the network boundary are a common source of production-only failures (API changes, partial outages returning HTML, wrapper objects, etc.).

---

### [MEDIUM] Finding #12: MusicKit `configure()` return type is overly broad and forces “duck-typing thenable” logic
**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 9-12  
**Category:** slop  

**Description:**
`MusicKitGlobal.configure()` is typed as `Promise<MusicKitInstance> | MusicKitInstance | void`, which is so broad that the code must check for a `.then` function at runtime (instead of relying on types). This is a symptom of guessy/inaccurate typings and makes it hard to reason about the real contract.

**Code:**
```ts
interface MusicKitGlobal {
  configure(options: MusicKitConfigureOptions): Promise<MusicKitInstance> | MusicKitInstance | void;
  getInstance(): MusicKitInstance;
}
```

**Why this matters:**
It weakens type guarantees and makes the integration fragile across MusicKit script updates.

---

### [MEDIUM] Finding #13: MusicKit API response typing is under-specified and can silently generate empty-string track names
**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 187-200  
**Category:** will-break  

**Description:**
`searchCatalog()` asserts a partial response shape and then maps `name` to `s.attributes?.name ?? ""`. This allows “tracks” with empty names to be considered valid matches, and it hides whether missing attributes are a genuine API issue vs a typing mismatch.

**Code:**
```ts
const data = (await music.music.api(path)) as {
  results?: { songs?: { data?: Array<{ id: string; attributes?: { name?: string; artistName?: string } }> } };
  errors?: Array<{ detail?: string; status?: string }>;
};

const tracks: AppleMusicTrack[] = songs.map((s) => ({
  id: s.id,
  name: s.attributes?.name ?? "",
  artistName: s.attributes?.artistName,
}));
```

**Why this matters:**
Silent coercion to `""` makes downstream matching and UI behavior incorrect without clear error signals, and it obscures whether the underlying response shape is being handled correctly.

---

### [MEDIUM] Finding #14: Apple track shapes are duplicated across core and web (risk of drift and inconsistent optionality)
**File:** `packages/core/src/matching/types.ts`  
**Lines:** 1-5  
**Category:** slop  

**Description:**
Core defines `AppleTrack` with `artistName?: string`. Web defines `AppleMusicTrack` with the same fields and optionality (`apps/web/src/lib/musickit.ts:37-41`). These are parallel types representing the same concept, but they live in different packages and are not tied together.

**Code:**
```ts
export interface AppleTrack {
  id: string;
  name: string;
  artistName?: string;
}
```

**Why this matters:**
Duplicate “same-shape” types are a common source of subtle bugs when one evolves (e.g., making `artistName` required, adding `url`, changing `id` semantics) and the other doesn’t.

---

### [MEDIUM] Finding #15: `DevTokenResponse` is duplicated (discriminated union in API vs “all-optional” shape in web)
**File:** `apps/api/src/routes/apple/dev-token.ts`  
**Lines:** 3-3  
**Category:** slop  

**Description:**
The API exports a discriminated-by-property union (`{ token } | { error }`). The web client does not import this type and instead uses a weaker `{ token?: string; error?: string }` shape (`apps/web/src/lib/musickit.ts:58-66`). This loses the guarantee that a successful response contains a token and that an error response cannot contain a token.

**Code:**
```ts
export type DevTokenResponse = { token: string } | { error: string };
```

**Why this matters:**
Type drift here can cause subtle runtime failures (e.g., server returning a malformed payload that still type-checks client-side), and it weakens the safety of the token-fetch path.

---

### [LOW] Finding #16: Placeholder types are exported publicly but unused, and do not represent stable API contracts
**File:** `packages/core/src/apple/types.ts`  
**Lines:** 1-8  
**Category:** dead-end  

**Description:**
`AppleCatalogTrack` is explicitly labeled “Placeholder” and is exported from `@repo/core` (`packages/core/src/apple/index.ts:1`) but is not used anywhere in the repo. Its fields are also highly optional (`attributes?.name?`, `attributes?.artistName?`) even though catalog track resources typically have stable required attributes. Similarly, `AppleTrack`/`MatchResult` are exported but unused (see `packages/core/src/matching/index.ts:1`).

**Code:**
```ts
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
Exported-but-unused placeholder types increase public surface area and can mislead future code into depending on incomplete or incorrect contracts.

---

## External References (accessed 2026-02-14)
- https://api.setlist.fm/docs/1.0/json_Setlist.html
- https://api.setlist.fm/docs/1.0/json_Artist.html
- https://api.setlist.fm/docs/1.0/json_Venue.html
- https://api.setlist.fm/docs/1.0/json_Set.html
- https://www.setlist.fm/forum/setlistfm/setlistfm-api/possible-bug-with-swagger-definition-6bd77efa
- https://js-cdn.music.apple.com/musickit/v1/index.html