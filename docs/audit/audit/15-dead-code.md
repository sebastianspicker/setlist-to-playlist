# Dead Code & Unused Files Findings

Audit Date: 2026-02-15T08:22:02Z  
Files Examined: 41  
Total Findings: 15

## Summary by Severity
- Critical: 0
- High: 0
- Medium: 3
- Low: 12

---

## Files Examined
- `apps/api/src/index.ts`
- `apps/api/src/lib/jwt.ts`
- `apps/api/src/lib/setlistfm.ts`
- `apps/api/src/middleware/.gitkeep`
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
- `apps/web/src/components/.gitkeep`
- `apps/web/src/features/matching/ConnectAppleMusic.tsx`
- `apps/web/src/features/matching/MatchingView.tsx`
- `apps/web/src/features/matching/index.ts`
- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`
- `apps/web/src/features/playlist-export/index.ts`
- `apps/web/src/features/setlist-import/SetlistImportView.tsx`
- `apps/web/src/features/setlist-import/SetlistPreview.tsx`
- `apps/web/src/features/setlist-import/index.ts`
- `apps/web/src/lib/.gitkeep`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/config.ts`
- `apps/web/src/lib/cors.ts`
- `apps/web/src/lib/musickit.ts`
- `apps/web/src/styles/globals.css`
- `apps/web/src/types/.gitkeep`
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

---

## Findings

### [MEDIUM] Finding #1: Unused imports in `CreatePlaylistView` (likely lint/typecheck noise)

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 6-12  
**Category:** slop

**Description:**
`authorizeMusicKit` and `initMusicKit` are imported but never referenced in this module. If `noUnusedLocals` / ESLint unused-import rules are enabled, this becomes a failing warning/error; even without enforcement it’s dead code in the module’s import surface.

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
Unused imports add noise, can break CI when lint/typecheck strictness increases, and obscure the actual runtime dependencies of the component.

---

### [LOW] Finding #2: Dead conditional (ternary branches are identical)

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 33-37  
**Category:** dead-end

**Description:**
The ternary expression is redundant: both branches return `result.status`. This is dead branching that can’t produce different behavior.

**Code:**
```ts
const result = await handleSetlistProxy(id);
const status = "error" in result ? result.status : result.status;
const body = "error" in result ? { error: result.error } : result.body;
return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
```

**Why this matters:**
Redundant logic makes control flow harder to reason about and can hide real branching errors when future edits are made.

---

### [LOW] Finding #3: Exported helpers are unused within the repo (`apiUrl`, `healthUrl`)

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 12-19, 24  
**Category:** dead-end

**Description:**
Within this repository, `apiUrl` and `healthUrl` are exported but have no import sites. They increase module surface area without corresponding usage.

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
Unused exports create misleading “supported” APIs and make later refactors riskier (unclear what is intentionally public vs. accidental).

---

### [LOW] Finding #4: `getAllowOrigin` is exported but only used internally

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 8-18  
**Category:** dead-end

**Description:**
`getAllowOrigin` is exported but (in this repo) only referenced within `cors.ts` itself (`corsHeaders`, `corsHeadersForOptions`). No other module imports it.

**Code:**
```ts
export function getAllowOrigin(origin: string | null): string | null {
  const configured = (process.env.ALLOWED_ORIGIN ?? "").trim();
  const isLocalOrigin =
    origin &&
    (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
  if (configured) {
    const single = configured.split(",")[0].trim().replace(/\/$/, "");
    return single || (isLocalOrigin ? origin : null);
  }
  return isLocalOrigin ? origin : null;
}
```

**Why this matters:**
Exporting internal helpers grows the “API surface” other code might start depending on later, making cleanup harder.

---

### [LOW] Finding #5: Multiple exports in `musickit.ts` are unused outside the module

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 53-70, 125-128, 205-208  
**Category:** dead-end

**Description:**
The following are exported but have no import sites in this repo:
- `fetchDeveloperToken` (used internally by `initMusicKit`)
- `getMusicKitInstance` (not referenced anywhere)
- `CreatePlaylistResult` (used internally as the return type of `createLibraryPlaylist`, but never imported by consumers)

**Code:**
```ts
export async function fetchDeveloperToken(): Promise<string> {
  if (isTokenValid()) return cachedToken!;
  // ...
}

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
Unused exports make it unclear which functions/types are meant to be consumed by the app vs. implementation details.

---

### [LOW] Finding #6: Barrel re-export is unused (`SetlistPreview`)

**File:** `apps/web/src/features/setlist-import/index.ts`  
**Lines:** 1-2  
**Category:** dead-end

**Description:**
`SetlistPreview` is exported from the feature barrel but there are no imports of `SetlistPreview` from `@/features/setlist-import` in this repo. The component is consumed via direct relative import from `SetlistImportView.tsx` instead.

**Code:**
```ts
export { SetlistImportView } from "./SetlistImportView";
export { SetlistPreview } from "./SetlistPreview";
```

**Why this matters:**
Dead barrel exports bloat the feature’s public surface and encourage inconsistent import patterns.

---

### [LOW] Finding #7: Exported props type is unused outside its module (`ConnectAppleMusicProps`)

**File:** `apps/web/src/features/matching/ConnectAppleMusic.tsx`  
**Lines:** 6-9  
**Category:** dead-end

**Description:**
`ConnectAppleMusicProps` is exported but has no import sites in this repo (it’s only used locally to type the component parameters).

**Code:**
```tsx
export interface ConnectAppleMusicProps {
  onAuthorized?: () => void;
  label?: string;
}
```

**Why this matters:**
Exporting types that aren’t consumed externally adds surface area without value and can accumulate as dead public API.

---

### [LOW] Finding #8: Exported props type is unused outside its module (`MatchingViewProps`)

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 28-31  
**Category:** dead-end

**Description:**
`MatchingViewProps` is exported but not imported anywhere in the repo (it’s only used locally in the component signature).

**Code:**
```tsx
export interface MatchingViewProps {
  setlist: Setlist;
  onProceedToCreatePlaylist: (matches: MatchRow[]) => void;
}
```

**Why this matters:**
Same pattern as other unused exported prop types: it expands public API without corresponding consumers.

---

### [LOW] Finding #9: Exported props type is unused outside its module (`CreatePlaylistViewProps`)

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 15-18  
**Category:** dead-end

**Description:**
`CreatePlaylistViewProps` is exported but not imported anywhere else in the repo.

**Code:**
```tsx
export interface CreatePlaylistViewProps {
  setlist: Setlist;
  matchRows: MatchRow[];
}
```

**Why this matters:**
Unused exports create long-term cleanup debt and make it harder to tell what is part of a stable API.

---

### [LOW] Finding #10: `api` entrypoint re-exports types that are unused in the repo

**File:** `apps/api/src/index.ts`  
**Lines:** 1-5  
**Category:** dead-end

**Description:**
`DevTokenResponse` and `ProxyResponse` are re-exported from the `api` package entrypoint but have no import sites anywhere in the repo (outside audit/docs). The runtime exports (`handleDevToken`, `handleHealth`, `handleSetlistProxy`) are used, but the type exports appear unused.

**Code:**
```ts
export { handleDevToken } from "./routes/apple/dev-token.js";
export type { DevTokenResponse } from "./routes/apple/dev-token.js";
export { handleHealth } from "./routes/health.js";
export { handleSetlistProxy } from "./routes/setlist/proxy.js";
export type { ProxyResponse } from "./routes/setlist/proxy.js";
```

**Why this matters:**
Unused type exports grow the published surface of the `api` module, which can lead to accidental coupling and confusion about supported contracts.

---

### [LOW] Finding #11: Exported type alias is unused outside its module (`FetchSetlistResult`)

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 72-75  
**Category:** dead-end

**Description:**
`FetchSetlistResult` is exported but not imported anywhere else in the repo. It is only referenced locally as the return type of `fetchSetlistFromApi`.

**Code:**
```ts
export type FetchSetlistResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; message: string };
```

**Why this matters:**
Dead exported types add surface area and can mislead readers into thinking there are multiple consumers.

---

### [MEDIUM] Finding #12: Orphan core “apple” module: placeholder type exported but unused across the repo

**File:** `packages/core/src/apple/index.ts`  
**Lines:** 1  
**Category:** dead-end

**Description:**
`@repo/core` re-exports `AppleCatalogTrack` via `packages/core/src/apple/index.ts`, but there are no import sites for `AppleCatalogTrack` anywhere in the repository (outside audit/docs). This makes the entire `core/apple` surface effectively dead code from the repo’s perspective.

**Code:**
```ts
export type { AppleCatalogTrack } from './types.js';
```

**Why this matters:**
Shipping unused modules/types increases maintenance burden and encourages “placeholder” APIs to linger indefinitely.

---

### [MEDIUM] Finding #13: Orphan core matching exports: types and helper exported publicly but unused in the repo

**File:** `packages/core/src/matching/index.ts`  
**Lines:** 1-3  
**Category:** dead-end

**Description:**
The core matching entrypoint exports:
- `AppleTrack`, `MatchResult` from `./types.js`
- `normalizeTrackName` from `./normalize.js`

Within this repo, there are no imports of `AppleTrack`, `MatchResult`, or `normalizeTrackName`. Additionally, `packages/core/src/matching/types.ts` is only referenced via a type-only re-export and has no direct import sites.

**Code:**
```ts
export type { AppleTrack, MatchResult } from "./types.js";
export { normalizeTrackName } from "./normalize.js";
export { buildSearchQuery } from "./search-query.js";
```

**Why this matters:**
Public exports that have no consumers are dead surface area; they make it harder to distinguish “core API” from unused leftovers.

---

### [LOW] Finding #14: Core setlist barrel re-exports types that are unused in the repo

**File:** `packages/core/src/setlist/index.ts`  
**Lines:** 2-8  
**Category:** dead-end

**Description:**
The repo imports `SetlistFmResponse` from `@repo/core`, but does not import the following re-exported types anywhere:
- `SetlistFmArtist`
- `SetlistFmVenue`
- `SetlistFmSong`
- `SetlistFmSet`

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
Unused re-exports expand the core package’s apparent contract, increasing cognitive load for readers and maintainers.

---

### [LOW] Finding #15: Empty `.gitkeep` files in `src/` trees are orphan placeholders

**File:** `apps/api/src/middleware/.gitkeep`  
**Lines:** (empty file)  
**Category:** dead-end

**Description:**
These empty placeholder files are present in the audited `src/` trees and have no import/usage sites (they only exist to keep otherwise-empty directories in git):

- `apps/api/src/middleware/.gitkeep`
- `apps/web/src/components/.gitkeep`
- `apps/web/src/lib/.gitkeep`
- `apps/web/src/types/.gitkeep`

**Code:**
```text
(empty file)
```

**Why this matters:**
`.gitkeep` placeholders often indicate unfinished scaffolding or abandoned structure; over time they can obscure which directories are intentionally used vs. vestigial.