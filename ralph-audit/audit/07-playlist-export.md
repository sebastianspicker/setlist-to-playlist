# Playlist Export Deep Audit Findings

Audit Date: 2026-02-14T10:46:29Z  
Files Examined: 3  
Total Findings: 12  

## Summary by Severity
- Critical: 0
- High: 5
- Medium: 5
- Low: 2

---

## Findings

### [HIGH] Finding #1: Playlist can be created but left empty/orphaned when add-tracks fails

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 56-64  
**Category:** will-break  

**Description:**
The flow creates the playlist first, then attempts to add tracks. If adding tracks fails (network/API/auth/etc.), the UI still marks the playlist as created (`setCreated({ id, url })`) and surfaces an error, but nothing in the flow prevents leaving an empty (or partially populated) playlist in the user’s library.

**Code:**
```tsx
const { id, url } = await createLibraryPlaylist(name);
try {
  await addTracksToLibraryPlaylist(id, songIds);
  setCreated({ id, url });
} catch (addErr) {
  setCreated({ id, url });
  setAddTracksError(/* ... */);
}
```

**Why this matters:**
Users can end up with unintended empty/partial playlists in their Apple Music library, and the UI has no cleanup or “did anything actually get added?” certainty.

---

### [HIGH] Finding #2: “Retry add tracks” can duplicate tracks because it always re-sends the full list

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 73-85  
**Category:** will-break  

**Description:**
When add-tracks fails, the retry path replays the entire `songIds` list against the same playlist ID, with no tracking of what may have already been added (including partial success cases).

**Code:**
```tsx
await addTracksToLibraryPlaylist(created.id, songIds);
setAddTracksError(null);
```

**Why this matters:**
If the first add attempt partially succeeded (or succeeded but the client observed failure), retrying can add duplicates to the playlist.

---

### [HIGH] Finding #3: Invalid IDs can still be added, then the function throws afterward (high duplicate risk on retry)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 246-274  
**Category:** broken-logic  

**Description:**
`addTracksToLibraryPlaylist` filters invalid IDs and posts *only valid IDs* to Apple Music. After the API call returns, it throws an error if any IDs were dropped. This creates a “success (some tracks added) + throw” outcome.

**Code:**
```ts
const validIds = songIds.filter((id) => typeof id === "string" && id.trim().length > 0);
// ...
const res = (await music.music.api(path, { method: "POST", data })) as /* ... */;
if (validIds.length < songIds.length) {
  const dropped = songIds.length - validIds.length;
  throw new Error(`${dropped} of ${songIds.length} IDs were invalid and skipped; ${validIds.length} tracks added.`);
}
```

**Why this matters:**
The UI treats this as “adding tracks failed” and offers a retry; retrying re-adds the already-added valid tracks, producing duplicates (and a confusing “failed” state despite progress).

---

### [HIGH] Finding #4: Auth revocation during add-tracks leaves the user stuck (no re-auth path in created state)

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 92-147  
**Category:** will-break  

**Description:**
Once `created` is set, the UI switches to the “Playlist created” view and no longer renders the Apple Music connect UI. If add-tracks fails due to authorization being revoked/expired, the user can only retry add-tracks, which will continue failing; `needsAuth` is never set in this state.

**Code:**
```tsx
if (created) {
  // ... shows retry button when addTracksError exists
}
```

**Why this matters:**
A common failure mode (“Not authorized…”) can’t be recovered from within the created view, causing a dead-end UX.

---

### [HIGH] Finding #5: No chunking/size handling for large track lists (single POST may exceed API limits)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 242-263  
**Category:** will-break  

**Description:**
All valid track IDs are sent in a single POST payload. There is no chunking, max-size enforcement, or progressive add behavior.

**Code:**
```ts
const data = {
  data: validIds.map((id) => ({ id: id.trim(), type: "songs" as const })),
};
const res = (await music.music.api(path, { method: "POST", data })) as /* ... */;
```

**Why this matters:**
For larger setlists, this can fail after playlist creation (creating orphan/partial playlists) depending on Apple API limits and payload constraints.

---

### [MEDIUM] Finding #6: `isMusicKitAuthorized()` hides init/config failures, misclassifying them as “needs auth”

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 140-147  
**Category:** will-break  

**Description:**
`isMusicKitAuthorized()` catches *all* errors from `initMusicKit()` and returns `false`. In the create flow, `false` triggers the “Connect Apple Music” prompt, even when the real problem is missing `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`, dev-token API failure, or MusicKit script load failure.

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
Users get directed to re-authenticate when authentication isn’t the root cause, masking actionable errors and creating a loop of failed retries.

---

### [MEDIUM] Finding #7: No playlist URL fallback when `url` is missing/unsafe (only generic instruction)

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 93-145  
**Category:** unfinished  

**Description:**
If `created.url` is missing or not `http(s)`, the UI falls back to a generic message (“check your library”). There is no fallback derivation from playlist ID, no display of playlist ID, and no other navigation affordance.

**Code:**
```tsx
const rawUrl = created.url?.trim();
const isSafeUrl = rawUrl && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://"));
// ...
{isSafeUrl ? <a href={rawUrl}>Open in Apple Music →</a> : <p>check your library...</p>}
```

**Why this matters:**
Even when the playlist was created successfully, users may be unable to find/open it via the app, especially if add-tracks failed and the link is also suppressed by the error-state branch.

---

### [MEDIUM] Finding #8: MusicKit instance is cached indefinitely; developer token refresh logic may be bypassed after first init

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 43-50, 96-122  
**Category:** will-break  

**Description:**
The module implements a developer token TTL cache, but once `configuredInstance` is set, subsequent calls to `initMusicKit()` return early and never re-run configuration with a refreshed developer token.

**Code:**
```ts
let configuredInstance: MusicKitInstance | null = null;

export async function initMusicKit(): Promise<MusicKitInstance> {
  if (configuredInstance) return configuredInstance;
  const token = await fetchDeveloperToken();
  const MusicKit = await waitForMusicKit();
  MusicKit.configure({ developerToken: token, /* ... */ });
  configuredInstance = MusicKit.getInstance();
  return configuredInstance;
}
```

**Why this matters:**
If the configured developer token expires during a long-lived session, playlist create/add flows can fail later with no in-module path to refresh configuration (behavior depends on MusicKit internals, but the module’s own refresh cache is effectively one-shot).

---

### [MEDIUM] Finding #9: “Create playlist” button gating uses a count that may not match `songIds` (can enable a no-op create)

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 35, 50-54, 152-185  
**Category:** broken-logic  

**Description:**
`songIds` is derived via optional chaining and truthy filtering; `count` is derived via `appleTrack !== null`. If `appleTrack` can be `undefined` (distinct from `null`), `count` may be > 0 while `songIds.length === 0`. The button enables based on `count`, but the handler errors based on `songIds`.

**Code:**
```tsx
const songIds = matchRows.map((r) => r.appleTrack?.id).filter(Boolean) as string[];
const count = matchRows.filter((m) => m.appleTrack !== null).length;

<button disabled={loading || count === 0}>Create playlist</button>
```

**Why this matters:**
Users can click “Create playlist” and then immediately get “No tracks to add…” despite the UI claiming tracks are ready.

---

### [MEDIUM] Finding #10: Retry add-tracks uses live `matchRows`-derived IDs, not a snapshot of what the playlist was created for

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 35, 73-85, 92-149  
**Category:** will-break  

**Description:**
`songIds` is computed from current `matchRows` props each render. After a playlist is created (`created` state set), retries still use the current `songIds`, not a snapshot captured at create time.

**Code:**
```tsx
const songIds = matchRows.map((r) => r.appleTrack?.id).filter(Boolean) as string[];
// later, after created:
await addTracksToLibraryPlaylist(created.id, songIds);
```

**Why this matters:**
If the parent updates `matchRows` while this component remains mounted (navigation back/forward, edits in other steps, async updates), retrying can add an unintended set of tracks to an already-created playlist.

---

### [LOW] Finding #11: Unused imports in `CreatePlaylistView` (noise/maintenance risk)

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 7-10  
**Category:** slop  

**Description:**
`authorizeMusicKit` and `initMusicKit` are imported but never referenced in this file.

**Code:**
```ts
import {
  isMusicKitAuthorized,
  authorizeMusicKit,
  initMusicKit,
  createLibraryPlaylist,
  addTracksToLibraryPlaylist,
} from "@/lib/musickit";
```

**Why this matters:**
Increases cognitive load and suggests refactors in progress; also risks lint failures depending on repo rules.

---

### [LOW] Finding #12: `waitForMusicKit()` does not clear its timeout after resolve (minor async slop)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 73-93  
**Category:** slop  

**Description:**
When MusicKit becomes available, the interval is cleared and the promise resolves, but the `setTimeout` handler remains scheduled and will still fire later (calling `reject` after resolution, which is ignored but still runs).

**Code:**
```ts
const check = setInterval(() => { /* resolve when available */ }, 50);
setTimeout(() => {
  clearInterval(check);
  reject(new Error("MusicKit script did not load"));
}, 10000);
```

**Why this matters:**
Minor unnecessary work and confusing control flow during debugging; also makes timing-related issues harder to reason about.