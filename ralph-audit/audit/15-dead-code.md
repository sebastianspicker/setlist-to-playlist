# Dead Code & Unused Files Findings

Audit Date: 2026-02-14T11:51:42Z  
Files Examined: 41  
Total Findings: 18

## Summary by Severity
- Critical: 0
- High: 0
- Medium: 2
- Low: 16

---

## Findings

### [LOW] Finding #1: Unused imports `authorizeMusicKit` and `initMusicKit`

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 6-12  
**Category:** slop

**Description:**
`authorizeMusicKit` and `initMusicKit` are imported but never referenced in this module.

**Code:**
```tsx
import {
  isMusicKitAuthorized,
  authorizeMusicKit,
  initMusicKit,
  createLibraryPlaylist,
  addTracksToLibraryPlaylist,
} from "@/lib/musickit";
```

**Why this matters:**
Unused imports add noise, can confuse readers about control flow, and can cause lint failures depending on configuration.

---

### [LOW] Finding #2: Unreachable fallback branch in `buildPlaylistName()`

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 20-25  
**Category:** dead-end

**Description:**
`parts` always contains the constant `"Setlist"` (a non-empty string), so `parts.length > 0` is always true and the fallback `"Setlist"` branch is dead code.

**Code:**
```tsx
const parts = ["Setlist", setlist.artist, setlist.eventDate].filter(
  (p) => p != null && String(p).trim() !== ""
);
return parts.length > 0 ? parts.join(" – ") : "Setlist";
```

**Why this matters:**
Dead branches make intent harder to reason about and can hide real edge-case handling needs.

---

### [LOW] Finding #3: Redundant `setLoading(false)` due to `finally` always executing

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 43-48, 68-70  
**Category:** dead-end

**Description:**
When the user is not authorized, the code sets `setLoading(false)` and returns from inside `try`, but `finally` will still run and set loading false again. The explicit `setLoading(false)` before returning is redundant.

**Code:**
```tsx
if (!authorized) {
  setNeedsAuth(true);
  setLoading(false);
  return;
}
...
} finally {
  setLoading(false);
}
```

**Why this matters:**
Redundant state updates add noise and can complicate future refactors (especially when state transitions become more complex).

---

### [LOW] Finding #4: Redundant conditional assigning `status` (both branches identical)

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 22-25  
**Category:** dead-end

**Description:**
The conditional expression assigns `result.status` in both branches, so the `"error" in result` check is dead logic here.

**Code:**
```ts
const result = await handleSetlistProxy(id);
const status = "error" in result ? result.status : result.status;
const body = "error" in result ? { error: result.error } : result.body;
```

**Why this matters:**
Dead conditionals reduce clarity and can mislead readers into thinking there are different status behaviors for success vs error.

---

### [LOW] Finding #5: `apiUrl()` and `healthUrl()` are exported but unused in the repo

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 12-19, 24  
**Category:** dead-end

**Description:**
`apiUrl()` is exported but has no in-repo import sites; `healthUrl()` is also exported but appears unused (no call sites found).

**Code:**
```ts
export function apiUrl(path: string): string {
  const raw = API_BASE_URL || "";
  const base = raw.replace(/\/$/, "").replace(/\/api$/i, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const apiSegment = "/api";
  if (base) return `${base}${apiSegment}${p}`;
  return `${API_PATH}${p}`;
}

export const healthUrl = () => apiUrl("/health");
```

**Why this matters:**
Unused exports widen the module’s public surface area, making the codebase harder to maintain and audit.

---

### [LOW] Finding #6: `getAllowOrigin()` is exported but unused outside this module

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 7-17  
**Category:** dead-end

**Description:**
`getAllowOrigin()` is exported, but there are no in-repo imports of it; only `corsHeaders()` is imported by API route handlers.

**Code:**
```ts
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
Unused exports suggest either incomplete test coverage/consumers or leftover API surface that increases maintenance burden.

---

### [LOW] Finding #7: Multiple exported symbols in `musickit.ts` appear unused outside the module

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 53-70, 125-128, 205-208  
**Category:** dead-end

**Description:**
These exports have no in-repo import sites:
- `fetchDeveloperToken()` (used internally by `initMusicKit`)
- `getMusicKitInstance()`
- `CreatePlaylistResult` (named exported interface, but callers only use `createLibraryPlaylist()`)

**Code:**
```ts
export async function fetchDeveloperToken(): Promise<string> { /* ... */ }

export function getMusicKitInstance(): MusicKitInstance {
  if (!configuredInstance) throw new Error("MusicKit not configured. Call initMusicKit() first.");
  return configuredInstance;
}

export interface CreatePlaylistResult {
  id: string;
  url?: string;
}
```

**Why this matters:**
Unused exports enlarge public API surface area and can encourage inconsistent usage patterns (multiple “ways” to do the same thing).

---

### [LOW] Finding #8: `SetlistPreview` is re-exported from the feature barrel but not used via the barrel

**File:** `apps/web/src/features/setlist-import/index.ts`  
**Lines:** 1-2  
**Category:** dead-end

**Description:**
`SetlistPreview` is re-exported, but the only usage imports it directly from `./SetlistPreview` (and no other module imports it from the feature index).

**Code:**
```ts
export { SetlistImportView } from "./SetlistImportView";
export { SetlistPreview } from "./SetlistPreview";
```

**Why this matters:**
Unused re-exports create the impression of a supported public API that the codebase doesn’t actually rely on.

---

### [LOW] Finding #9: `DevTokenResponse` and `ProxyResponse` are re-exported from the `api` entrypoint but unused in the repo

**File:** `apps/api/src/index.ts`  
**Lines:** 1-5  
**Category:** dead-end

**Description:**
The `api` package entrypoint re-exports `DevTokenResponse` and `ProxyResponse`, but there are no import sites for these types in the repo.

**Code:**
```ts
export { handleDevToken } from "./routes/apple/dev-token.js";
export type { DevTokenResponse } from "./routes/apple/dev-token.js";
export { handleHealth } from "./routes/health.js";
export { handleSetlistProxy } from "./routes/setlist/proxy.js";
export type { ProxyResponse } from "./routes/setlist/proxy.js";
```

**Why this matters:**
Unused exported types inflate the public API surface and can mislead readers about intended consumers.

---

### [LOW] Finding #10: `FetchSetlistResult` is exported but unused outside `setlistfm.ts`

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 70-72  
**Category:** dead-end

**Description:**
`FetchSetlistResult` is exported but has no in-repo imports. It is only used as the return type of `fetchSetlistFromApi()` within the same module.

**Code:**
```ts
export type FetchSetlistResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; message: string };
```

**Why this matters:**
Unused exports add API surface without providing actual reuse in the codebase.

---

### [MEDIUM] Finding #11: Entire `core/apple` export surface appears unused (placeholder module)

**File:** `packages/core/src/apple/index.ts`  
**Lines:** 1  
**Category:** dead-end

**Description:**
`@repo/core` re-exports `AppleCatalogTrack` via `packages/core/src/apple/index.ts`, but there are no imports/usages of this type in the repository (outside audit/docs). This makes `core/apple` effectively orphaned as a public module.

**Code:**
```ts
export type { AppleCatalogTrack } from './types.js';
```

**Why this matters:**
An unused “placeholder” public module can confuse maintainers about supported domain concepts and increases long-term maintenance surface.

---

### [MEDIUM] Finding #12: Exported matching result types appear unused across the repo

**File:** `packages/core/src/matching/types.ts`  
**Lines:** 1-12  
**Category:** dead-end

**Description:**
`AppleTrack` and `MatchResult` are exported (and re-exported through `packages/core/src/matching/index.ts`), but there are no in-repo consumers importing them. The web app defines and uses its own parallel type (`AppleMusicTrack`) instead.

**Code:**
```ts
export interface AppleTrack {
  id: string;
  name: string;
  artistName?: string;
}

export interface MatchResult {
  setlistEntry: { name: string; artist?: string };
  appleTrack: AppleTrack | null;
}
```

**Why this matters:**
Unused “domain” types strongly suggest abandoned or unfinished abstractions and can mislead readers about where matching logic/results are modeled.

---

### [LOW] Finding #13: Several setlist.fm types are re-exported but unused in the repo

**File:** `packages/core/src/setlist/index.ts`  
**Lines:** 2-8  
**Category:** dead-end

**Description:**
`SetlistFmArtist`, `SetlistFmVenue`, `SetlistFmSong`, and `SetlistFmSet` are re-exported, but no code in the repo imports these symbols directly (outside audit/docs). Only `SetlistFmResponse` is imported in the web app.

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
Unused re-exports expand API surface and add maintenance overhead (more “public” types to keep consistent with real responses).

---

### [LOW] Finding #14: Orphan placeholder file (empty `.gitkeep`) in API middleware directory

**File:** `apps/api/src/middleware/.gitkeep`  
**Lines:** (empty file)  
**Category:** dead-end

**Description:**
The middleware directory contains only an empty `.gitkeep` and no implementation files in scope.

**Code:**
```
// empty file
```

**Why this matters:**
Empty placeholder files/directories can indicate abandoned scaffolding and make it harder to tell what infrastructure is actually in use.

---

### [LOW] Finding #15: Orphan placeholder file (empty `.gitkeep`) for `components/`

**File:** `apps/web/src/components/.gitkeep`  
**Lines:** (empty file)  
**Category:** dead-end

**Description:**
`apps/web/src/components/` is empty aside from `.gitkeep`.

**Code:**
```
// empty file
```

**Why this matters:**
Empty placeholder directories can be mistaken for active architecture and increase “where should this go?” ambiguity.

---

### [LOW] Finding #16: Orphan placeholder file (empty `.gitkeep`) in `lib/`

**File:** `apps/web/src/lib/.gitkeep`  
**Lines:** (empty file)  
**Category:** dead-end

**Description:**
`apps/web/src/lib/` includes an empty `.gitkeep` even though the directory already contains real code files.

**Code:**
```
// empty file
```

**Why this matters:**
Redundant placeholders add clutter and can complicate future cleanups or tooling that treats dotfiles specially.

---

### [LOW] Finding #17: Orphan placeholder file (empty `.gitkeep`) for `types/`

**File:** `apps/web/src/types/.gitkeep`  
**Lines:** (empty file)  
**Category:** dead-end

**Description:**
`apps/web/src/types/` is empty aside from `.gitkeep` and has no in-scope imports referencing this directory.

**Code:**
```
// empty file
```

**Why this matters:**
An unused types directory can lead to duplicated or ad-hoc typing elsewhere, since the “intended place” exists but is not used.

---

### [LOW] Finding #18: Exported component props interfaces appear unused outside their defining modules

**File:** `apps/web/src/features/matching/ConnectAppleMusic.tsx`  
**Lines:** 6-9  
**Category:** dead-end

**Description:**
Several props interfaces are exported but have no in-repo import sites:
- `ConnectAppleMusicProps` (`ConnectAppleMusic.tsx`)
- `MatchingViewProps` (`MatchingView.tsx`)
- `CreatePlaylistViewProps` (`CreatePlaylistView.tsx`)

**Code:**
```tsx
export interface ConnectAppleMusicProps {
  onAuthorized?: () => void;
  label?: string;
}
```

**Why this matters:**
Exporting types that aren’t consumed elsewhere increases public API surface area and can imply supported reuse patterns that don’t exist in practice.