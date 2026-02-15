# Playlist Export Findings

Audit Date: 2026-02-15 08:12:28 +0100  
Files Examined: 3  
Total Findings: 13  

## Summary by Severity
- Critical: 0
- High: 6
- Medium: 5
- Low: 2

---

## Findings

### [HIGH] Finding #1: Authorization check collapses “not authorized” and “MusicKit/init is broken” into the same UI state

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 140-146  
**Category:** will-break

**Description:**
`isMusicKitAuthorized()` catches *all* exceptions from `initMusicKit()` and returns `false`. In `CreatePlaylistView`, `false` is interpreted as “user needs to connect Apple Music”, which means non-auth failures (missing `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`, dev token API failure, MusicKit script not loaded) can incorrectly surface as an auth prompt instead of a real error.

This can strand users in a misleading “Connect Apple Music” loop when the actual problem is configuration or runtime initialization, not authorization.

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
Users can’t distinguish “please sign in” from “app is misconfigured / token endpoint is failing / script didn’t load,” making playlist export appear broken with no actionable diagnosis.

---

### [HIGH] Finding #2: “Needs auth” path is triggered by `isMusicKitAuthorized()` and hides init/config errors from the user

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 43-48, 162-169  
**Category:** will-break

**Description:**
When `isMusicKitAuthorized()` returns `false` (including due to swallowed init errors), the UI sets `needsAuth` and shows only the `ConnectAppleMusic` prompt. There is no separate error state for “MusicKit initialization failed” in this branch, so critical failures can be mislabeled as authorization problems.

**Code:**
```tsx
const authorized = await isMusicKitAuthorized();
if (!authorized) {
  setNeedsAuth(true);
  setLoading(false);
  return;
}
```

**Why this matters:**
If the underlying failure is missing app ID / dev token fetch failure / MusicKit script load failure, “Connect Apple Music” is not a reliable recovery path and may never succeed.

---

### [HIGH] Finding #3: “Playlist created but add-tracks failed” view has no auth-revocation recovery path (retry can be a dead-end)

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 73-86, 110-128  
**Category:** will-break

**Description:**
After a playlist is created, the retry flow (`handleAddRemainingTracks`) only retries `addTracksToLibraryPlaylist` and never sets `needsAuth` or otherwise offers a reconnect UI in the “created” state. If add-tracks fails due to authorization being revoked/expired between create and add, the user is stuck repeatedly retrying an operation that will continue to fail.

**Code:**
```tsx
async function handleAddRemainingTracks() {
  if (!created || songIds.length === 0) return;
  setAddTracksError(null);
  setLoading(true);
  try {
    await addTracksToLibraryPlaylist(created.id, songIds);
    setAddTracksError(null);
  } catch (err) {
    setAddTracksError(err instanceof Error ? err.message : String(err ?? "Adding tracks failed."));
  } finally {
    setLoading(false);
  }
}
```

**Why this matters:**
The exact scenario called out in the story (“create succeeds / add-tracks fails” + “auth revocation handling”) can devolve into an unrecoverable UX state.

---

### [HIGH] Finding #4: `addTracksToLibraryPlaylist` can throw “failure” after successfully adding tracks (invalid IDs are treated as an error post-write)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 246-274  
**Category:** broken-logic

**Description:**
The function filters invalid IDs out before the POST (so valid tracks may be added), but if any IDs were dropped it throws an Error *after* the API call completes. This reports the operation as failed even when tracks were successfully added.

Because the UI uses thrown errors to show “adding tracks failed” and offers a retry button, this behavior can lead to repeated POSTs for already-added tracks (and potential duplication, depending on Apple Music playlist behavior).

**Code:**
```ts
const validIds = songIds.filter((id) => typeof id === "string" && id.trim().length > 0);
// ...
await music.music.api(path, { method: "POST", data });
// ...
if (validIds.length < songIds.length) {
  const dropped = songIds.length - validIds.length;
  throw new Error(
    `${dropped} of ${songIds.length} IDs were invalid and skipped; ${validIds.length} tracks added.`
  );
}
```

**Why this matters:**
The app can tell users “add-tracks failed” even when it partially/mostly succeeded, encouraging retries that can mutate the playlist further.

---

### [HIGH] Finding #5: Retry/duplicate behavior relies on an unverified “idempotent per track” assumption

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 73-86  
**Category:** will-break

**Description:**
A code comment asserts that re-sending all IDs is safe because “Apple Music API add is idempotent per track.” There is no enforcement in code (no dedupe, no server-side idempotency key, no read-back to confirm membership), and Apple Music playlists are generally capable of containing duplicates.

Even if the API sometimes de-duplicates, the current implementation provides no guarantees; the audit requirement explicitly calls out “duplicate playlist on retry” and “duplicate playlist on retry/track retry” risk.

**Code:**
```tsx
/** DCI-057: Retry sends all song IDs again; Apple Music API add is idempotent per track, so duplicates are not created. */
async function handleAddRemainingTracks() {
  // ...
  await addTracksToLibraryPlaylist(created.id, songIds);
}
```

**Why this matters:**
If duplicates are allowed, the retry button can create playlists with repeated tracks, silently corrupting the exported result.

---

### [HIGH] Finding #6: MusicKit configuration + token caching has no recovery if developer token expires/invalidates mid-session

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 43-70, 96-122  
**Category:** will-break

**Description:**
The developer token is cached in-memory (`cachedToken` + `tokenExpiresAt`), and the configured MusicKit instance is cached forever (`configuredInstance`). There is no mechanism to reconfigure MusicKit after the initial `configure()` call, and no logic to clear caches/re-init on auth-like failures from Apple endpoints.

If the dev token expires earlier than expected, is rejected, or becomes invalid mid-session, playlist creation and add-tracks can fail until a full page reload.

**Code:**
```ts
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
// ...
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
Long-lived sessions can “randomly” break playlist export flows (create/add) with no in-app recovery besides reload.

---

### [MEDIUM] Finding #7: `createLibraryPlaylist` request shape/type appears inconsistent with Apple’s documented request object and library playlist types

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 218-225  
**Category:** will-break

**Description:**
`createLibraryPlaylist` sends a JSON:API-style payload with a `data` array and `type: "playlists"`. Apple’s documented creation request object for library playlists is `LibraryPlaylistCreationRequest`, which describes top-level `attributes` (required) and optional `relationships` (not a JSON:API `data` wrapper). Additionally, library playlists are commonly identified as `type: "library-playlists"` in responses.

This mismatch can cause request failures (400s) or subtle incompatibilities, and in the worst case could contribute to “retry creates duplicates” if creation succeeds server-side but the client fails to parse/accept the response.

**Code:**
```ts
const body = {
  data: [{ type: "playlists" as const, attributes: { name } }],
};
const res = (await music.music.api(path, {
  method: "POST",
  data: body,
})) as { /* ... */ };
```

**Why this matters:**
If the request payload doesn’t match the API contract, playlist export fails at the first step (playlist creation).

---

### [MEDIUM] Finding #8: Playlist URL is likely unavailable/incorrectly sourced for library playlists, so the “Open in Apple Music” link may rarely appear

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 226-236  
**Category:** will-break

**Description:**
The code expects `playlist.attributes?.url` from the create response. Library playlist objects commonly include `playParams` and do not reliably include a direct `url` attribute. If `url` is usually absent, `CreatePlaylistView` will almost always fall back to “Open the Apple Music app and check your library…”, even on successful creation.

**Code:**
```ts
data?: Array<{ id: string; attributes?: { url?: string } }>;
// ...
return { id: playlist.id, url: playlist.attributes?.url };
```

**Why this matters:**
This degrades the post-create UX: users can’t easily verify the playlist or open it directly from the app, even when everything succeeded.

---

### [MEDIUM] Finding #9: `addTracksToLibraryPlaylist` accepts `undefined` response and treats it as success unless `errors` exists

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 262-268  
**Category:** will-break

**Description:**
The function’s local typing explicitly allows `res` to be `undefined`, and the code only checks `res.errors`. If the MusicKit API wrapper returns `undefined` (or a non-object) on some failure mode without throwing, this code will treat the operation as successful and the UI will report no error.

**Code:**
```ts
const res = (await music.music.api(path, { method: "POST", data })) as
  | { data?: unknown[]; errors?: Array<{ detail?: string; status?: string }> }
  | undefined;

if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
  throw new Error(`Adding tracks to playlist failed: ${detail}`);
}
```

**Why this matters:**
Silent add-tracks failures produce “Playlist created” success UI while the playlist is missing tracks.

---

### [MEDIUM] Finding #10: Duplicate track IDs are not deduplicated before add-tracks; duplicates can be sent and added

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 35-36, 58-64, 73-86  
**Category:** will-break

**Description:**
`songIds` is a simple map/filter over match rows and is passed directly to add-tracks. If matching can produce duplicate Apple track IDs (e.g., repeated songs in setlist, user selects same track for multiple entries), duplicates are sent in the POST body. There is no dedupe step in UI or in `addTracksToLibraryPlaylist`.

**Code:**
```tsx
const songIds = matchRows.map((r) => r.appleTrack?.id).filter(Boolean) as string[];
// ...
await addTracksToLibraryPlaylist(id, songIds);
```

**Why this matters:**
The resulting playlist can contain repeated tracks that don’t match user expectations, and retries amplify this risk.

---

### [MEDIUM] Finding #11: “Create playlist” button enablement uses `count`, but runtime empty-check uses `songIds.length`

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 35-36, 50-54, 153-160, 175  
**Category:** will-break

**Description:**
The UI disables the create button based on `count` (`appleTrack !== null`) but the actual no-tracks guard uses `songIds.length === 0` (truthy IDs only). If an `appleTrack` object exists but has a falsy/empty `id`, the UI can say it’s ready to create a playlist with N tracks and enable the button, but clicking “Create playlist” immediately errors with “No tracks to add…”.

**Code:**
```tsx
const songIds = matchRows.map((r) => r.appleTrack?.id).filter(Boolean) as string[];

if (songIds.length === 0) {
  setError("No tracks to add. Match at least one track first.");
  // ...
}

const count = matchRows.filter((m) => m.appleTrack !== null).length;
// ...
disabled={loading || count === 0}
```

**Why this matters:**
This creates confusing UX and can mask upstream data integrity problems in the matching output.

---

### [LOW] Finding #12: Minor export-flow slop: unused imports and redundant state updates

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 6-12, 44-47, 50-53  
**Category:** slop

**Description:**
- `authorizeMusicKit` and `initMusicKit` are imported but never used.
- In early-return branches inside `try`, `setLoading(false)` is called before `return`, but `finally` also calls `setLoading(false)`, producing redundant state updates.

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
This can fail lint/CI in stricter configurations and adds unnecessary re-render churn.

---

### [LOW] Finding #13: Minor reliability/UX gaps: waitForMusicKit timer cleanup and overly strict URL scheme check

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 72-93  
**Category:** will-break

**Description:**
- `waitForMusicKit` starts a `setTimeout` but doesn’t store/clear it on success; the callback still runs later (wasted work and potential confusion during debugging).
- In the “playlist created” UI, only `http(s)` URLs are considered safe. If Apple returns a valid non-HTTP deep link scheme, the UI will suppress the link and fall back to manual instructions.

**Code:**
```ts
setTimeout(() => {
  clearInterval(check);
  reject(new Error("MusicKit script did not load"));
}, 10000);
```

**Why this matters:**
These don’t usually break the flow, but they add friction in edge cases (slow script load, unusual URL formats).

---

## External References (accessed 2026-02-15)

- https://developer.apple.com/documentation/applemusicapi/get-a-library-playlist  
- https://developer.apple.com/documentation/applemusicapi/libraryplaylistcreationrequest  
- https://developer.apple.com/documentation/applemusicapi/create-a-new-library-playlist-folder  
- https://stackoverflow.com/questions/60789226/obtaining-a-library-playlists-artwork-apple-music-api  
- https://stackoverflow.com/questions/51843417/musickit-js-add-video-to-playlist  
- https://9to5mac.com/2015/08/11/apple-music-duplicate-songs/  
- https://www.reddit.com/r/AppleMusic/comments/1ps5zh/duplicate_songs_in_playlist/