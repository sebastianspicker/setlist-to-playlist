# Deep Code Inspection – Findings

Static code review of the setlist-to-playlist codebase, aligned to the Implementation Task List (§1–§11). Each finding has a unique id, priority, location, and rationale.

**Priority legend:** P0 = critical (security/data), P1 = high (breaking UX or correctness), P2 = nice-to-have (listed only).

---

## Fixes applied (all priorities)

All listed bugs have been fixed. Summary of changes. (Seventh and eighth inspection fixes: see tables under "Fixes applied (seventh inspection)" and "Fixes applied (eighth inspection)" below.)

| Id | Fix |
|----|-----|
| **DCI-001** | CORS: When `ALLOWED_ORIGIN` is unset, only `http://localhost*` origins are allowed. No reflection of arbitrary `https://` origins. Set `ALLOWED_ORIGIN` in production. |
| **DCI-002** | Playlist success: When `created.url` is missing, the UI shows “Open the Apple Music app and check your library for the new playlist” instead of a generic link. |
| **DCI-003** | Partial success: If playlist create succeeds but add-tracks fails, the UI shows the created state with message “Playlist was created but adding tracks failed” and a button “Add tracks to this playlist” that retries only the add-tracks call (no duplicate playlist). |
| **DCI-004** | `addTracksToLibraryPlaylist` now checks the API response for an `errors` array and throws with a clear message so the UI can surface failures. |
| **DCI-005** | `parseSetlistIdFromInput` URL regex and fallback now accept 4–12 hex chars (was 6–12), so short setlist IDs in URLs (e.g. `...-abc1.html`) work. |
| **DCI-006** | React keys: `SetlistPreview` and `MatchingView` use the list index as key (stable per position) to avoid duplicate keys when track names repeat. |
| **DCI-007** | `initMusicKit` now requires `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`; throws with a clear message if missing. |
| **DCI-008** | `normalizeTrackName` feat./ft. regex extended to match segments containing hyphens (e.g. “feat. A - B”) so the whole segment is stripped. |
| **DCI-009** | `MatchingView` effect dependency includes a fingerprint of set structure (`setlist.sets.map(s => s.length).join(',')`) so suggestions re-run when setlist data is replaced. |
| **DCI-010** | Setlist import: input length limited to 2000 chars; longer input shows an error asking the user to use the setlist ID or a shorter URL. |
| **DCI-011** | JWT private key: PEM is normalized with `\r\n` and `\r` replaced by `\n` in addition to literal `\n`. |

---

## Summary

| Id       | Priority | Section        | One-line description |
|----------|----------|----------------|----------------------|
| DCI-001  | P0       | §2 API Token   | CORS allows any HTTPS origin when `ALLOWED_ORIGIN` unset |
| DCI-002  | P1       | §9 Playlist    | Success link goes to Apple Music homepage when playlist URL missing |
| DCI-003  | P1       | §9 Playlist    | Create-succeeds / add-tracks-fails leaves empty playlist; retry duplicates |
| DCI-004  | P1       | §7 MusicKit    | Add-tracks response not checked; partial/error responses not surfaced |
| DCI-005  | P1       | §3 Setlist proxy | URL parser rejects valid short setlist IDs (4–5 hex chars) |
| DCI-006  | P2       | §6 / §8       | Duplicate React keys when setlist has repeated track names |
| DCI-007  | P2       | §7 MusicKit   | MusicKit configured without `appId` when env var empty |
| DCI-008  | P2       | §5 Core       | Normalize “feat.” can over-strip titles with hyphen (e.g. “A - B”) |
| DCI-009  | P2       | §8 Matching   | Effect depends only on `setlist.id`; stale matches if setlist data replaced |
| DCI-010  | P2       | §6 Import     | Very long setlist URLs in query string may hit URL length limits |
| DCI-011  | P2       | §2 JWT        | Private key only normalizes `\n`; CRLF / `\r\n` not normalized |

---

## 1. Environment and configuration (§1)

No P0/P1/breaking issues found. `.env.example` lists the required vars; `.gitignore` covers `.env` and variants; `config.ts` uses `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` consistently.

---

## 2. API – Developer Token (§2)

### DCI-001 — CORS allows any HTTPS origin when `ALLOWED_ORIGIN` is unset [P0]

- **Where:** `apps/web/src/app/api/apple/dev-token/route.ts`, `apps/web/src/app/api/setlist/proxy/route.ts` (same pattern in both).
- **What:** `allowOrigin` is set to `ALLOWED_ORIGIN || (origin && (origin.startsWith("http://localhost") || origin.startsWith("https://")) ? origin : null`. If `ALLOWED_ORIGIN` is empty (e.g. in production), any request with an `Origin` starting with `https://` gets that origin reflected in `Access-Control-Allow-Origin`.
- **Why it matters:** A page on `https://evil.com` can call `GET /api/apple/dev-token` (and the setlist proxy) from the user’s browser and receive the Developer Token or setlist data. Token leakage and abuse of setlist proxy from arbitrary sites.
- **Why it happens:** Fallback was likely intended for local dev (localhost) and “any HTTPS” is overly permissive when `ALLOWED_ORIGIN` is not set in production.

---

## 3. API – setlist.fm proxy (§3)

### DCI-005 — URL parser rejects valid short setlist IDs [P1]

- **Where:** `apps/api/src/lib/setlistfm.ts`, `parseSetlistIdFromInput`.
- **What:** For setlist.fm URLs, the regex is `-([a-f0-9]{6,12})\.html$`, so the suffix must be 6–12 hex chars. Raw ID path allows `[a-f0-9-]{4,64}`. So a URL like `.../venue-name-abc1.html` (ID `abc1`, 4 chars) never matches; the function returns `null` and the user sees “Invalid setlist ID or URL.”
- **Why it matters:** Valid setlist URLs with short IDs (4–5 hex chars) fail in the UI even though the API may accept the ID when passed as raw ID.
- **Why it happens:** Regex was written for the common 6–8 character ID format; short IDs were not considered.

---

## 4. API – Health and wiring (§4)

No P0/P1/breaking issues. Health route returns JSON; backend docs describe same-origin API and optional `NEXT_PUBLIC_API_URL`; `apiUrl()` in `apps/web/src/lib/api.ts` builds URLs correctly for both same-origin and custom base URL.

---

## 5. Core – Setlist and matching (§5)

### DCI-008 — Normalize “feat.” can over-strip titles with hyphen [P2]

- **Where:** `packages/core/src/matching/normalize.ts`, `normalizeTrackName`.
- **What:** The `feat.` removal uses `\s*feat\.?\s*[^-]+/gi`. The `[^-]+` stops at the first hyphen. So “Song feat. Artist A - Artist B” becomes “Song Artist B” (only the part after the hyphen remains).
- **Why it could matter:** Rare edge case for complex “feat.” titles that contain a hyphen; search query may be wrong or truncated.
- **Why it happens:** Regex is designed to strip “feat. …” but doesn’t account for hyphens inside that segment.

---

## 6. Web – Setlist import UI (§6)

### DCI-006 — Duplicate React keys when track names repeat [P2]

- **Where:** `apps/web/src/features/setlist-import/SetlistPreview.tsx`: `key={\`${i}-${t.name}\`}`.
- **What:** If the same track name appears more than once (e.g. same song in two sets), two list items share the same key.
- **Why it could matter:** React key warnings and possible rendering/update glitches.
- **Why it happens:** Key is derived from index and name only; no unique id per setlist entry.

### DCI-010 — Long setlist URLs in query string [P2]

- **Where:** `apps/web/src/features/setlist-import/SetlistImportView.tsx` builds `setlistProxyUrl(\`id=${encodeURIComponent(trimmed)}\`)`; backend reads `id` or `url` from query.
- **What:** Very long pasted URLs can produce query strings exceeding server or proxy limits (e.g. 2048–8192 bytes).
- **Why it could matter:** Import could fail for long URLs with no clear error.
- **Why it happens:** No length check or use of POST body for long input.

---

## 7. Web – MusicKit integration (§7)

### DCI-004 — Add-tracks response not checked [P1]

- **Where:** `apps/web/src/lib/musickit.ts`, `addTracksToLibraryPlaylist`.
- **What:** After `music.music.api(path, { method: "POST", data })` the return value is ignored. If the API returns 207 (partial success) or an error body, the code does not throw or surface it.
- **Why it matters:** UI can show success while some or all tracks were not added (e.g. region restrictions). User believes the playlist is complete.
- **Why it happens:** Implementation assumes success on no throw; MusicKit JS may not throw for all error responses.

### DCI-007 — MusicKit without `appId` when env empty [P2]

- **Where:** `apps/web/src/lib/musickit.ts`, `initMusicKit`: `...(APPLE_MUSIC_APP_ID && { appId: APPLE_MUSIC_APP_ID })`.
- **What:** When `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` is `""`, MusicKit is configured without `appId`.
- **Why it could matter:** May work in dev but fail or behave differently in production; Apple may require `appId` for certain flows.
- **Why it happens:** Env var is optional in config; no guard to block init when appId is required.

---

## 8. Web – Matching UI (§8)

### DCI-006 — Duplicate React keys (MatchingView) [P2]

- **Where:** `apps/web/src/features/matching/MatchingView.tsx`: `key={\`${index}-${row.setlistEntry.name}\`}`.
- **What:** Same as in SetlistPreview: repeated setlist entry names produce duplicate keys.
- **Why it could matter:** React key warnings and possible list update issues.
- **Why it happens:** Key uses index and name only.

### DCI-009 — Effect depends only on `setlist.id` [P2]

- **Where:** `apps/web/src/features/matching/MatchingView.tsx`, `useEffect(..., [setlist.id])`.
- **What:** Suggestions are fetched only when `setlist.id` changes. If the same setlist (same id) is ever replaced with updated data (e.g. re-fetch), the effect does not re-run and `matches` can be stale.
- **Why it could matter:** If the app later supports “refresh setlist” or in-place updates, matching state would not refresh.
- **Why it happens:** Dependency was minimized to avoid re-fetching on every parent re-render; identity of `setlist` is not considered.

---

## 9. Web – Playlist creation (§9)

### DCI-002 — Success link to generic Apple Music when playlist URL missing [P1]

- **Where:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`: `const openUrl = created.url || "https://music.apple.com";`
- **What:** When MusicKit does not return `attributes.url` for the created playlist, the “Open in Apple Music” link points to the generic Apple Music homepage, not the new playlist.
- **Why it matters:** User expects to open the created playlist; they land on a generic page and may think creation failed or have to search for the playlist.
- **Why it happens:** No handling for missing `url`; fallback is generic.

### DCI-003 — Partial success: empty playlist created, then add-tracks fails [P1]

- **Where:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`: `handleCreate` calls `createLibraryPlaylist(name)` then `addTracksToLibraryPlaylist(id, songIds)`. On failure of the second call, only the error is shown.
- **What:** If the first call succeeds and the second fails (network, rate limit, or API error), an empty playlist exists in the user’s library. “Try again” runs the same flow again and creates another empty playlist.
- **Why it matters:** Orphaned empty playlists and duplicate playlists on retry; no rollback or “add tracks to existing playlist” path.
- **Why it happens:** No transactional handling; no check of add-tracks result before treating as full success; retry is full create again.

---

## 10. PWA and polish (§10)

No P0/P1/breaking issues. Manifest and icons are present; error and global-error boundaries render a message and “Try again”; layout is inline-style responsive. P2: no service worker (documented as optional).

---

## 11. Quality and CI (§11)

No P0/P1/breaking issues. Core and API tests exist; CI runs install, lint, test, build; AGENTS.md documents lint and test. Optional e2e not present (allowed by task list).

---

## Additional note (§2 JWT)

### DCI-011 — Private key newline normalization [P2]

- **Where:** `apps/api/src/lib/jwt.ts`: `privateKeyPem.replace(/\\n/g, "\n")`.
- **What:** Only literal backslash-n is converted to newline. Keys stored with real `\r\n` or with `\n` already present are unchanged; behavior with CRLF may depend on Node/crypto.
- **Why it could matter:** Some deployment or env systems might inject CRLF; key parsing could fail or be inconsistent.
- **Why it happens:** Only the common `.env` “\n” string case was handled.

---

## Recommended order of fixes

1. **DCI-001** – Set and enforce `ALLOWED_ORIGIN` in production; avoid reflecting arbitrary `Origin` when unset.
2. **DCI-005** – Widen URL ID regex (or accept 4–5 hex chars) to align with raw ID rules.
3. **DCI-004** – In `addTracksToLibraryPlaylist`, inspect response (and/or errors) and throw or report when add-tracks fails or is partial.
4. **DCI-002** – When `created.url` is missing, show a message or alternative (e.g. “Playlist created; open Apple Music and check your library”) instead of a generic link.
5. **DCI-003** – Consider: retry only add-tracks when playlist already exists, or show “Playlist created but some tracks could not be added” and offer “Add remaining tracks” to the same playlist.

P2 items (DCI-006–DCI-011) can be scheduled as follow-ups.

---

## Second inspection – new findings

Second pass over the codebase after the above fixes. New issues only; each has a unique id (DCI-012 and onward).

### Fixes applied (second inspection – DCI-012 to DCI-018)

| Id | Fix |
|----|-----|
| **DCI-012** | Developer token is cached with a 55-minute TTL; after expiry the cache is cleared and a new token is fetched on next use. |
| **DCI-013** | When the effect runs (setlist id or structure change), `matches` is re-initialized to `entriesFlat.map(entry => ({ setlistEntry: entry, appleTrack: null }))` before the suggestion loop, so length and rows stay in sync. |
| **DCI-014** | `runSearch(index)` guards with `index` range and `row?.setlistEntry`; row label uses `row.setlistEntry?.name ?? "—"` so corrupt rows render safely. |
| **DCI-015** | Dev-token route catch returns a generic message: "Token signing failed. Check server configuration and logs." (no `err.message` to client). |
| **DCI-016** | `fetchSetlistFromApi` wraps `res.json()` in try/catch when `res.ok`; on parse error returns `{ ok: false, status: 502, message: "Invalid response from setlist.fm (non-JSON body)." }`. |
| **DCI-017** | `createLibraryPlaylist` checks `res?.errors` and throws with API error detail, consistent with `addTracksToLibraryPlaylist`. |
| **DCI-018** | `mapSetlistFmToSetlist` validates: `raw` must be a non-null object; `raw.artist` must be an object; `raw.set` is used only if `Array.isArray(raw.set)`; each `fmSet` in the loop is guarded; invalid input throws with a clear message. |

### Summary (new)

| Id       | Priority | Section        | One-line description |
|----------|----------|----------------|----------------------|
| DCI-012  | P1       | §7 MusicKit    | Developer token cached indefinitely; expires after 1h, no refresh |
| DCI-013  | P1       | §8 Matching    | When setlist structure changes (same id), matches state not re-initialized; corrupt or stale rows |
| DCI-014  | P1       | §8 Matching    | runSearch(index) can throw if matches[index] is undefined (e.g. after structure change) |
| DCI-015  | P2       | §2 API Token   | Dev-token catch returns err.message to client; may leak internal error text |
| DCI-016  | P2       | §3 Setlist proxy | fetchSetlistFromApi: res.json() on 200 can throw if body is non-JSON; unhandled |
| DCI-017  | P2       | §7 MusicKit    | createLibraryPlaylist does not check response.errors; API error detail not surfaced |
| DCI-018  | P2       | §5 Core        | mapSetlistFmToSetlist does not validate API response shape; malformed response can yield empty/inconsistent Setlist |

---

### DCI-012 — Developer token cached indefinitely; expires after 1 hour [P1]

- **Where:** `apps/web/src/lib/musickit.ts`: `cachedToken` is set in `fetchDeveloperToken()` and never cleared.
- **What:** The Apple Developer Token has a 1-hour lifetime (see `apps/api/src/lib/jwt.ts`). The client caches it in memory and reuses it. After 1 hour the token is expired; MusicKit or catalog/playlist API calls can then fail with authorization errors.
- **Why it matters:** Users who leave the app open for more than an hour (or use it again after a long pause) see failures until they reload the page. No automatic refresh or re-fetch.
- **Why it happens:** Cache was added to avoid repeated dev-token requests; token expiry and refresh were not considered.

---

### DCI-013 — MatchingView: matches state not re-initialized when setlist structure changes [P1]

- **Where:** `apps/web/src/features/matching/MatchingView.tsx`: initial state `useState<MatchRow[]>(() => entries.map(...))` runs only on mount; the effect updates `matches` by index when `setlist.id` or set-structure fingerprint changes.
- **What:** When the same setlist (same id) is replaced with updated data that has a different number of sets/songs (e.g. re-fetch, or future “refresh” feature), `entries` from props has a new length but `matches` in state still has the old length. The effect loops over the new `entriesFlat` and does `setMatches((prev) => { const next = [...prev]; next[i] = { ...next[i], appleTrack }; return next; })`. If the new setlist has more entries than the old, `prev` is shorter than the loop range, so for new indices `next[i]` is undefined and the update produces rows with `setlistEntry: undefined`. If the new setlist has fewer entries, the effect only updates the first N indices and leaves stale rows at the end.
- **Why it matters:** Corrupt or stale match rows; possible runtime errors when rendering or when the user interacts (e.g. “Change” on a corrupt row). Breaking when setlist data is refreshed or replaced in place.
- **Why it happens:** Effect was designed to refresh suggestions when setlist identity/structure changes, but `matches` was not re-initialized to the new entry list; only per-index updates were applied.

---

### DCI-014 — runSearch(index) can throw when matches[index] is undefined [P1]

- **Where:** `apps/web/src/features/matching/MatchingView.tsx`: `runSearch(index)` uses `matches[index].setlistEntry.name` and `matches[index].setlistEntry.artist` without checking that `matches[index]` exists.
- **What:** If `matches` and the visible list get out of sync (e.g. after a setlist structure change that produced corrupt or truncated state as in DCI-013), or in any edge case where `index` is out of range, `matches[index]` can be undefined and accessing `.setlistEntry` throws.
- **Why it matters:** Unhandled exception; error boundary or blank screen; user cannot recover without reload.
- **Why it happens:** Code assumes `matches` and the rendered list are always in sync; no guard for undefined row.

---

### DCI-015 — Dev-token route returns internal error message to client [P2]

- **Where:** `apps/api/src/routes/apple/dev-token.ts`: in the catch block, `return { error: message }` where `message = err instanceof Error ? err.message : "Token signing failed"`.
- **What:** If signing fails (e.g. invalid key format, crypto error), the API returns that error message in the JSON body. Some runtime or library messages could expose implementation detail.
- **Why it could matter:** Information disclosure in error responses; generally low risk if messages are generic.
- **Why it happens:** Convenience of surfacing the failure reason; no sanitization of error messages.

---

### DCI-016 — setlist.fm fetch: JSON parse not guarded on 200 response [P2]

- **Where:** `apps/api/src/lib/setlistfm.ts`: when `res.ok` is true, `const body = (await res.json()) as unknown` is used without try/catch.
- **What:** If setlist.fm (or a proxy) returns a 200 response with a non-JSON body (e.g. HTML error page, empty body, or truncated JSON), `res.json()` throws. The rejection propagates and is not handled in `handleSetlistProxy`, so the route can respond with 500 or an unhandled error.
- **Why it could matter:** Rare; would cause 500 and unclear error for the user when the upstream response is malformed.
- **Why it happens:** Assumption that a 200 response always has valid JSON body.

---

### DCI-017 — createLibraryPlaylist does not check response.errors [P2]

- **Where:** `apps/web/src/lib/musickit.ts`: `createLibraryPlaylist` inspects `res?.data` and `playlist?.id` but does not check for an `errors` array in the response (unlike `addTracksToLibraryPlaylist` after DCI-004).
- **What:** If the Apple Music API returns a response with both `data` and `errors`, or only `errors`, the code may throw a generic “Failed to create playlist” or misinterpret the payload; API-provided error detail is not surfaced.
- **Why it could matter:** Harder to diagnose create-playlist failures; UX could be improved with API error messages.
- **Why it happens:** Error handling was added for add-tracks; create was left with minimal checks.

---

### DCI-018 — mapSetlistFmToSetlist does not validate API response shape [P2]

- **Where:** `packages/core/src/setlist/mapper.ts`: `mapSetlistFmToSetlist(raw)` uses optional chaining and defaults but does not validate that `raw` is an object, has expected top-level fields, or that `raw.set` is an array of sets.
- **What:** If the setlist.fm API (or proxy) returns an unexpected shape (e.g. array, null, or a different schema), the mapper can produce an inconsistent or empty `Setlist` (e.g. empty artist, empty sets), or in edge cases throw when accessing nested properties.
- **Why it could matter:** Malformed or versioned API responses could lead to confusing UI (empty setlist) or runtime errors downstream.
- **Why it happens:** Types describe the expected shape; runtime validation was not added.

---

## Third inspection – new findings

Third pass over the codebase. New issues only; each has a unique id (DCI-019 and onward). Prioritised: P0 = critical, P1 = high/breaking, P2 = nice-to-have.

### Fixes applied (third inspection – DCI-019 to DCI-027)

| Id | Fix |
|----|-----|
| **DCI-019** | CORS: When `ALLOWED_ORIGIN` is unset, allow origins that start with `http://localhost` or `http://127.0.0.1` so devs using 127.0.0.1 are not blocked. |
| **DCI-020** | MusicKit script: Added `crossOrigin="anonymous"` (required for SRI if a hash were available). Comment notes that SRI is not added because Apple does not publish a stable integrity value. |
| **DCI-021** | `fetchDeveloperToken`: Wrapped `res.json()` in try/catch; on parse error throws "Invalid response from Developer Token API (non-JSON)." |
| **DCI-022** | `searchCatalog`: Checks `data?.errors` and throws with API error detail before using results. |
| **DCI-023** | `addTracksToLibraryPlaylist`: Validates `playlistId?.trim()` and throws "Invalid playlist ID" if empty. |
| **DCI-024** | `apiUrl`: Strips a trailing `/api` from the base URL (after stripping trailing slash) so `NEXT_PUBLIC_API_URL=http://example.com/api` does not produce double `/api`. |
| **DCI-025** | SetlistPreview `getAllTracks` and MatchingView `flattenSetlist` / effect deps use `setlist.sets ?? []` so undefined `sets` does not throw. |
| **DCI-026** | `setMatch(index, ...)`: Returns `prev` unchanged if `index < 0` or `index >= prev.length` to avoid sparse array. |
| **DCI-027** | CreatePlaylistView: Success link uses `created.url` in `href` only when it is a safe URL (`http://` or `https://`); otherwise shows the text-only message. |

### Summary (third inspection)

| Id       | Priority | Section        | One-line description |
|----------|----------|----------------|----------------------|
| DCI-019  | P1       | §2 API / CORS  | CORS allows only `http://localhost`; `127.0.0.1` blocked when ALLOWED_ORIGIN unset |
| DCI-020  | P0       | §7 MusicKit    | MusicKit script loaded without Subresource Integrity (SRI); CDN compromise risk |
| DCI-021  | P2       | §7 MusicKit    | fetchDeveloperToken: res.json() not guarded; non-JSON 200 can throw |
| DCI-022  | P2       | §7 MusicKit    | searchCatalog does not check API response for errors array |
| DCI-023  | P2       | §7 MusicKit    | addTracksToLibraryPlaylist does not validate playlistId (e.g. empty → malformed path) |
| DCI-024  | P2       | §1 Config      | apiUrl: if base URL contains path (e.g. /api), result can double-include /api |
| DCI-025  | P2       | §6 / §8       | SetlistPreview / MatchingView assume setlist.sets defined; undefined throws |
| DCI-026  | P2       | §8 Matching    | setMatch(index) does not guard index bounds; can create sparse array |
| DCI-027  | P2       | §9 Playlist    | Success link href uses created.url unsanitized; theoretical XSS if URL were scriptable |

---

### DCI-019 — CORS allows only `http://localhost`; `127.0.0.1` blocked when ALLOWED_ORIGIN unset [P1 / breaking]

- **Where:** `apps/web/src/app/api/apple/dev-token/route.ts`, `apps/web/src/app/api/setlist/proxy/route.ts`: `allowOrigin = origin && origin.startsWith("http://localhost") ? origin : null`.
- **What:** When `ALLOWED_ORIGIN` is not set, only requests with an `Origin` starting with `http://localhost` are allowed. Developers who open the app at `http://127.0.0.1:3000` get CORS errors and cannot fetch the dev token or setlist proxy from the browser.
- **Why it matters:** Breaking for local dev when using `127.0.0.1` (common on some setups or tools). No way to use the app without setting `ALLOWED_ORIGIN` or changing the URL to localhost.
- **Why it happens:** Only the literal string `http://localhost` was considered; `127.0.0.1` is an equivalent loopback but not matched.

---

### DCI-020 — MusicKit script loaded without Subresource Integrity (SRI) [P0]

- **Where:** `apps/web/src/app/layout.tsx`: `<Script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js" strategy="beforeInteractive" />`.
- **What:** The script is loaded from Apple’s CDN with no `integrity` (and no `crossOrigin`) attribute. If the CDN were compromised or a man-in-the-middle substituted the response, the browser would execute whatever script is returned.
- **Why it matters:** Critical from a supply-chain / integrity perspective: execution of arbitrary script in the app context (session, tokens, user data). Likelihood is low for a major CDN but impact is high.
- **Why it happens:** SRI requires a known hash of the script; third-party scripts that update frequently often omit SRI. Apple does not publish a fixed integrity value for MusicKit.

---

### DCI-021 — fetchDeveloperToken: res.json() not guarded on 200 response [P2]

- **Where:** `apps/web/src/lib/musickit.ts`: `fetchDeveloperToken()` uses `const data = (await res.json()) as ...` without try/catch.
- **What:** If the dev-token API returns 200 with a non-JSON body (e.g. HTML error page, empty body, or proxy misconfiguration), `res.json()` throws. The rejection is not caught in the caller, so the app can show an unhandled error or blank state.
- **Why it could matter:** Rare; would cause confusing failure when the API response is malformed.
- **Why it happens:** Assumption that a 200 response always has valid JSON.

---

### DCI-022 — searchCatalog does not check API response for errors [P2]

- **Where:** `apps/web/src/lib/musickit.ts`: `searchCatalog` uses `data?.results?.songs?.data ?? []` and does not check for an `errors` array in the MusicKit API response.
- **What:** If the catalog search returns a response with `errors` (e.g. rate limit, region restriction), the code still maps whatever is in `data.results.songs.data` and may return empty or partial results without surfacing the error to the user.
- **Why it could matter:** User sees “no results” or wrong results without knowing that the API reported an error.
- **Why it happens:** Error handling was added for create/add-tracks; search was left with optional chaining only.

---

### DCI-023 — addTracksToLibraryPlaylist does not validate playlistId [P2]

- **Where:** `apps/web/src/lib/musickit.ts`: `addTracksToLibraryPlaylist(playlistId, songIds)` builds the path as `/v1/me/library/playlists/${playlistId}/tracks` without checking that `playlistId` is non-empty or safe.
- **What:** If `playlistId` were empty (e.g. from a bug or malformed state), the path becomes `/v1/me/library/playlists//tracks`, which can result in a 404 or unexpected behaviour. No validation or early return.
- **Why it could matter:** Edge case when state is inconsistent; could surface as a generic API error.
- **Why it happens:** Callers are expected to pass a valid id from createLibraryPlaylist; no defensive check was added.

---

### DCI-024 — apiUrl can double-include /api when base URL has a path [P2]

- **Where:** `apps/web/src/lib/api.ts`: `apiUrl(path)` does `base.replace(/\/$/, "") + apiSegment + p` where `apiSegment = "/api"`. If `NEXT_PUBLIC_API_URL` is set to something like `http://example.com/api`, the result is `http://example.com/api` + `/api` + `/apple/dev-token` = `http://example.com/api/api/apple/dev-token`.
- **What:** Wrong URL when the user configures the base URL to already include `/api`. Documentation says to use the origin (e.g. `http://localhost:3000`), but the code does not strip a trailing `/api` from the base.
- **Why it could matter:** Misconfiguration leads to 404s when using a separate API server whose base URL includes a path.
- **Why it happens:** Design assumes base is origin-only; no normalisation for path segment in base.

---

### DCI-025 — SetlistPreview and MatchingView assume setlist.sets is defined [P2]

- **Where:** `apps/web/src/features/setlist-import/SetlistPreview.tsx`: `getAllTracks(setlist)` does `for (const set of setlist.sets)`. `apps/web/src/features/matching/MatchingView.tsx`: `flattenSetlist(setlist)` does `for (const set of setlist.sets)`.
- **What:** The `Setlist` type defines `sets: SetlistEntry[][]`, but if malformed data or a future change ever passes a setlist with `sets: undefined`, both functions throw when iterating.
- **Why it could matter:** Defensive coding; avoids runtime throw if data shape is wrong (e.g. after API/mapper change).
- **Why it happens:** Type contract assumes `sets` is always present; no runtime guard.

---

### DCI-026 — setMatch(index) does not guard index bounds [P2]

- **Where:** `apps/web/src/features/matching/MatchingView.tsx`: `setMatch(index, appleTrack)` does `next[index] = { ...next[index], appleTrack }` without checking that `index` is within `prev.length`.
- **What:** If a stale closure or race passes an out-of-range index (e.g. after setlist structure change and before re-render), the update creates or extends the array at that index, producing a sparse array. Subsequent render can show undefined rows.
- **Why it could matter:** Edge case when user clicks quickly during re-initialisation; could lead to undefined row or inconsistent UI.
- **Why it happens:** Index is assumed to come from the current `matches.map`; no defensive bounds check.

---

### DCI-027 — Success link href uses created.url unsanitized [P2]

- **Where:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`: when `hasUrl` is true, `<a href={created.url}>` is used. The value comes from MusicKit’s create-playlist response.
- **What:** If the API ever returned a `javascript:` or `data:` URL (e.g. due to a bug or compromise), the link would execute script or load data in the context of the page. Current Apple API is not expected to return such values.
- **Why it could matter:** Theoretical XSS if the URL were scriptable; low likelihood in practice.
- **Why it happens:** Trust that the API returns a safe HTTP/HTTPS URL; no allow-list or sanitization of `created.url`.

---

## Fourth inspection – new findings

Fourth pass over the codebase. New issues only; each has a unique id (DCI-028 and onward). Prioritised: P0 = critical, P1 = high/breaking, P2 = nice-to-have.

### Fixes applied (fourth inspection – DCI-028 to DCI-033)

| Id | Fix |
|----|-----|
| **DCI-028** | SetlistImportView: use `(setlist.sets ?? []).flat().length` for the track count in the matching step so undefined `sets` does not throw. |
| **DCI-029** | flattenSetlist: skip non-array set items with `if (!Array.isArray(set)) continue` before iterating entries. |
| **DCI-030** | Mapper: use `Array.isArray(fmSet.song) ? fmSet.song : []` (then `.map` on that) so non-array `song` does not throw. |
| **DCI-031** | config: `API_BASE_URL` is derived from `process.env.NEXT_PUBLIC_API_URL.trim()` and only used when `trim().length > 0`, then trailing slash removed. |
| **DCI-032** | Catch blocks in SetlistImportView, CreatePlaylistView, ConnectAppleMusic: use `err instanceof Error ? err.message : String(err ?? "fallback")` so non-Error rejections (e.g. string) are shown to the user. |
| **DCI-033** | handleSetlistProxy: cap forwarded error message at 500 chars (append "…" when truncated) before returning to the client. |

### Summary (fourth inspection)

| Id       | Priority | Section        | One-line description |
|----------|----------|----------------|----------------------|
| DCI-028  | P1       | §6 Import      | SetlistImportView uses setlist.sets.flat() without guard; undefined sets throws |
| DCI-029  | P2       | §8 Matching    | flattenSetlist iterates each set without Array.isArray(set); non-array can throw |
| DCI-030  | P2       | §5 Core        | Mapper (fmSet.song ?? []).map: if song is non-array, .map throws |
| DCI-031  | P2       | §1 Config      | API_BASE_URL not trimmed; leading/trailing spaces can produce invalid URLs |
| DCI-032  | P2       | §7 / §9        | Catch blocks use err instanceof Error; non-Error rejections lose message |
| DCI-033  | P2       | §3 Setlist proxy | handleSetlistProxy returns result.message unbounded; very long upstream message to client |

---

### DCI-028 — SetlistImportView uses setlist.sets.flat() without guarding [P1 / breaking]

- **Where:** `apps/web/src/features/setlist-import/SetlistImportView.tsx` (matching step): `setlist.sets.flat().length` in the summary line.
- **What:** When rendering the matching step we show “— X tracks” using `setlist.sets.flat().length`. If `setlist.sets` is undefined (e.g. malformed data or a future type change), calling `.flat()` on undefined throws and the matching view does not render.
- **Why it matters:** Breaking when setlist data lacks `sets`; user hits an error boundary or blank section. SetlistPreview and MatchingView already use `setlist.sets ?? []`; this spot was missed.
- **Why it happens:** Assumption that a setlist in state always has a `sets` array; no defensive guard at this call site.

---

### DCI-029 — flattenSetlist does not guard that each set is an array [P2]

- **Where:** `apps/web/src/features/matching/MatchingView.tsx`: `flattenSetlist` does `for (const set of setlist.sets ?? [])` then `for (const entry of set)`.
- **What:** If `setlist.sets` contains a non-array (e.g. null, or an object from malformed API data), the inner loop `for (const entry of set)` can throw (e.g. “set is not iterable”).
- **Why it could matter:** Defensive coding; avoids runtime throw if a set item is ever non-array.
- **Why it happens:** Type says `SetlistEntry[][]`; runtime data is not validated per element.

---

### DCI-030 — Mapper (fmSet.song ?? []).map when song is non-array [P2]

- **Where:** `packages/core/src/setlist/mapper.ts`: `const entries = (fmSet.song ?? []).map(...)`. If `fmSet.song` is present but not an array (e.g. string or object), `.map` throws.
- **What:** The guard `fmSet.song ?? []` only handles null/undefined; it does not handle “truthy but not array”. A malformed API could return `song: "..."` and the mapper would throw.
- **Why it could matter:** Malformed setlist.fm or proxy response could crash the mapper.
- **Why it happens:** Optional chaining and ?? only cover missing; no `Array.isArray(fmSet.song)` check.

---

### DCI-031 — API_BASE_URL not trimmed; spaces can produce invalid URLs [P2]

- **Where:** `apps/web/src/lib/config.ts`: `API_BASE_URL` is set from `process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")` without trimming whitespace.
- **What:** If the env var is set with leading or trailing spaces (e.g. `" http://localhost:3000 "`), the base URL used in `apiUrl()` contains spaces and fetch requests can fail or behave unexpectedly.
- **Why it could matter:** Misconfiguration (e.g. copy-paste with spaces) leads to hard-to-diagnose request failures.
- **Why it happens:** Only trailing slash was normalised; trim was not applied.

---

### DCI-032 — Catch blocks assume Error instance; non-Error rejections lose message [P2]

- **Where:** Multiple places: `CreatePlaylistView` (“Failed to create playlist”), `ConnectAppleMusic` (“Authorization failed”), `SetlistImportView` (“Network error”), etc. Pattern: `err instanceof Error ? err.message : "fallback"`.
- **What:** If a promise rejects with a non-Error value (e.g. a string from MusicKit or a third-party lib), the catch receives it but the code only uses `.message` when it’s an Error. So the user sees a generic fallback and the actual rejection value is lost.
- **Why it could matter:** Harder to debug; user sees “Failed to create playlist” instead of the real reason (e.g. “Rate limit exceeded” as a string).
- **Why it happens:** Convention that rejections are Error instances; some APIs or libs reject with strings or other types.

---

### DCI-033 — handleSetlistProxy returns result.message unbounded [P2]

- **Where:** `apps/api/src/routes/setlist/proxy.ts`: on non-ok result we return `{ error: result.message, status }`. `result.message` comes from setlist.fm response or our 502 message.
- **What:** If setlist.fm (or a proxy) returns a very long error body or message, we forward it to the client without truncation. Large payloads can affect performance, logging, or client parsing.
- **Why it could matter:** DoS or noisy errors when upstream returns huge messages; could cap or sanitise length.
- **Why it happens:** No length limit or sanitisation on the forwarded error message.

---

## Fifth inspection – new findings

Fifth pass over the codebase. New issues only; each has a unique id (DCI-034 and onward). Prioritised: P0 = critical, P1 = high/breaking, P2 = nice-to-have.

### Fixes applied (fifth inspection – DCI-034 to DCI-041)

| Id | Fix |
|----|-----|
| **DCI-034** | SetlistPreview `getAllTracks`: skip non-array sets with `if (!Array.isArray(set)) continue`; use `entry?.name ?? ""` for safe access. |
| **DCI-035** | Mapper: filter song items with `s != null && typeof s === "object"` before mapping so null/non-object entries do not throw. |
| **DCI-036** | Dev-token: trim `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`; whitespace-only values are treated as missing. |
| **DCI-037** | CORS (dev-token, setlist proxy): `ALLOWED_ORIGIN` is trimmed; only the first origin is used when multiple are comma-separated. |
| **DCI-038** | setlist.fm cache: `getCached` deletes expired entry on miss; `setCached` calls `evictExpired()` to remove all expired entries so memory does not grow unbounded. |
| **DCI-039** | `addTracksToLibraryPlaylist`: filter `songIds` to non-empty strings after trim; throw "No valid song IDs to add" if none remain; send trimmed ids. |
| **DCI-040** | `buildPlaylistName`: build parts from setlist then `filter(p => p != null && String(p).trim() !== "")`; fallback to `"Setlist"` if no parts. |
| **DCI-041** | Health route: add CORS headers using same `getAllowOrigin` pattern as dev-token/setlist proxy so cross-origin health checks succeed. |

### Summary (fifth inspection)

| Id       | Priority | Section        | One-line description |
|----------|----------|----------------|----------------------|
| DCI-034  | P1       | §6 Import      | SetlistPreview.getAllTracks iterates each set without Array.isArray(set); non-array throws |
| DCI-035  | P2       | §5 Core        | Mapper maps song items without guarding null/non-object; s.name throws |
| DCI-036  | P2       | §2 API Token   | Apple env vars only check falsy; whitespace-only values cause opaque signing failure |
| DCI-037  | P2       | §2 CORS        | ALLOWED_ORIGIN used as-is; no validation for single origin or trim |
| DCI-038  | P2       | §3 Setlist proxy | setlist.fm in-memory cache never evicts expired entries; long-running memory growth |
| DCI-039  | P2       | §7 MusicKit    | addTracksToLibraryPlaylist does not validate individual song IDs (e.g. empty string) |
| DCI-040  | P2       | §9 Playlist    | buildPlaylistName can produce ugly names when artist/eventDate empty |
| DCI-041  | P2       | §4 Health      | Health route does not send CORS headers; cross-origin health checks from browser fail |

---

### DCI-034 — SetlistPreview.getAllTracks does not guard each set as array [P1 / breaking]

- **Where:** `apps/web/src/features/setlist-import/SetlistPreview.tsx`: `getAllTracks(setlist)` does `for (const set of setlist.sets ?? [])` then `for (const entry of set)`.
- **What:** If `setlist.sets` contains a non-array element (e.g. `null`, or an object from malformed API/mapper output), the inner loop `for (const entry of set)` throws (e.g. "set is not iterable"). MatchingView already guards with `if (!Array.isArray(set)) continue` in `flattenSetlist`; SetlistPreview does not.
- **Why it matters:** Breaking when setlist data is malformed or a future API/mapper returns an unexpected shape; user hits an error boundary or blank preview.
- **Why it happens:** Type says `SetlistEntry[][]`; runtime data is not validated per element in this component.

---

### DCI-035 — Mapper does not guard individual song items in fmSet.song [P2]

- **Where:** `packages/core/src/setlist/mapper.ts`: `const entries = (Array.isArray(fmSet.song) ? fmSet.song : []).map((s) => ({ name: s.name ?? "", ... }))`.
- **What:** The array is guarded but each element `s` is not. If the API returns `song: [null, { name: "x" }]` or `song: [{ name: "x" }, "bad"]`, then for `null` or non-object `s`, `s.name` throws when accessing the property.
- **Why it could matter:** Malformed setlist.fm or proxy response could crash the mapper instead of skipping or defaulting bad entries.
- **Why it happens:** Only the array presence was validated (DCI-030); elements are assumed to be objects.

---

### DCI-036 — Apple credentials: whitespace-only env vars pass presence check [P2]

- **Where:** `apps/api/src/routes/apple/dev-token.ts`: `if (!teamId || !keyId || !privateKey) return { error: "Missing Apple credentials in environment" }`.
- **What:** If an env var is set to only whitespace (e.g. `APPLE_PRIVATE_KEY="   "`), it is truthy so the check passes. `signDeveloperToken` then receives it and `createPrivateKey` fails with a crypto error. The catch returns the generic "Token signing failed. Check server configuration and logs." with no hint that the value was present but invalid.
- **Why it could matter:** Misconfiguration (e.g. copy-paste with spaces) leads to opaque failure; operators may not think to trim or re-paste the key.
- **Why it happens:** Only falsy check was used; no `.trim()` or "non-empty after trim" validation.

---

### DCI-037 — ALLOWED_ORIGIN used as-is; no validation or trim [P2]

- **Where:** `apps/web/src/app/api/apple/dev-token/route.ts`, `apps/web/src/app/api/setlist/proxy/route.ts`: `const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? ""` and `allowOrigin = ALLOWED_ORIGIN ? ALLOWED_ORIGIN : isLocalOrigin ? origin : null`.
- **What:** If `ALLOWED_ORIGIN` is set to a value with leading/trailing spaces (e.g. `" https://myapp.com "`) or to multiple origins (e.g. `"https://a.com, https://b.com"`), that full string is sent in `Access-Control-Allow-Origin`. Browsers expect a single origin; a list or space-padded value can break CORS or behave unpredictably.
- **Why it could matter:** Misconfiguration leads to CORS failures or unexpected behaviour in production.
- **Why it happens:** Env value is trusted as-is; no trim or single-origin validation.

---

### DCI-038 — setlist.fm in-memory cache never evicts expired entries [P2]

- **Where:** `apps/api/src/lib/setlistfm.ts`: `cache` is a module-level `Map<string, { body: unknown; expires: number }>`. `getCached` returns `null` when `Date.now() > entry.expires`, but expired entries are never removed from the Map.
- **What:** Over time, every distinct setlist ID ever requested remains in the Map. In a long-running process with many unique setlist IDs, memory usage grows without bound.
- **Why it could matter:** Under heavy or diverse usage, the process can consume more memory than expected; no automatic cleanup.
- **Why it happens:** TTL was implemented as "don't use after expiry" but not "remove after expiry".

---

### DCI-039 — addTracksToLibraryPlaylist does not validate individual song IDs [P2]

- **Where:** `apps/web/src/lib/musickit.ts`: `addTracksToLibraryPlaylist(playlistId, songIds)` builds `data: songIds.map((id) => ({ id, type: "songs" }))` after filtering with `matchRows.map((r) => r.appleTrack?.id).filter(Boolean)`. So falsy IDs are dropped but empty string could still slip through if a track object had `id: ""`.
- **What:** If any element in `songIds` is an empty string or otherwise invalid, the request body includes `{ id: "", type: "songs" }`. The Apple Music API may reject the request or behave unexpectedly.
- **Why it could matter:** Edge case when state is inconsistent or API returns an empty id; could surface as a generic add-tracks failure.
- **Why it happens:** Callers are expected to pass valid IDs; no per-id validation (e.g. `id?.trim()` and filter empty).

---

### DCI-040 — buildPlaylistName can produce ugly names when fields empty [P2]

- **Where:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`: `buildPlaylistName(setlist)` does `["Setlist", setlist.artist, setlist.eventDate].filter(Boolean)` then `join(" – ")`. If `artist` is empty string (falsy is only undefined/null), or if only `eventDate` is missing, the name can be "Setlist – Artist" or "Setlist – – 2020-01-01" when artist is empty but eventDate is set.
- **What:** Type has `artist: string` so empty string is possible after mapper. The join with " – " can produce "Setlist – – date" or extra separators.
- **Why it could matter:** Cosmetic; playlist name in user's library looks odd or has redundant dashes.
- **Why it happens:** No normalisation of empty strings or filter of parts before join.

---

### DCI-041 — Health route does not send CORS headers [P2]

- **Where:** `apps/web/src/app/api/health/route.ts`: `GET` returns `Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })` with no CORS headers.
- **What:** When the frontend is served from a different origin than the API (e.g. `NEXT_PUBLIC_API_URL` points to another host), a browser-based health check (e.g. `fetch(healthUrl())`) is subject to same-origin policy. The browser may block the response or not expose it to script.
- **Why it could matter:** If the app or a dashboard ever calls the health endpoint from the client for "API status", it would fail cross-origin unless the route sends appropriate CORS headers.
- **Why it happens:** Health is documented for "deployment and load balancers" (server-side); client-side cross-origin use was not considered.

---

## Sixth inspection – new findings

Sixth pass over the codebase. New issues only; each has a unique id (DCI-042 and onward). Prioritised: P0 = critical, P1 = high/breaking, P2 = nice-to-have.

### Fixes applied (sixth inspection – DCI-042 to DCI-051)

| Id | Fix |
|----|-----|
| **DCI-042** | SetlistImportView: use refs for current request id and AbortController; abort previous fetch on new load; only update state when response matches current request; ignore AbortError and do not set loading false for stale responses. |
| **DCI-043** | Health route: export OPTIONS handler that returns 204 with corsHeaders(request). |
| **DCI-044** | Shared CORS: add `apps/web/src/lib/cors.ts` with getAllowOrigin and corsHeaders; dev-token, setlist proxy, and health routes import and use it. |
| **DCI-045** | flattenSetlist: skip entry when `entry == null \|\| typeof entry !== "object"` before pushing. |
| **DCI-046** | addTracksToLibraryPlaylist: after successful add, if validIds.length < songIds.length throw with message so UI (inner catch) can set created + addTracksError and show "X of Y IDs invalid; Z tracks added." |
| **DCI-047** | searchCatalog: cache entries store { tracks, expires }; TTL 5 min; evictExpired when size > 500; evict expired then evict oldest if still over limit. |
| **DCI-048** | setlist.fm setCached: only call evictExpired() when cache.size > CACHE_EVICT_THRESHOLD (200) after set. |
| **DCI-049** | Error and GlobalError: set message from `error instanceof Error ? error.message : String(error ?? "Unknown error")` and render it (with fallback text if empty). |
| **DCI-050** | handleSetlistProxy: use process.env.SETLISTFM_API_KEY?.trim(); treat empty after trim as not configured. |
| **DCI-051** | buildSearchQuery: cap track and artist to MAX_QUERY_LENGTH (200) with .slice(0, MAX_QUERY_LENGTH). |

### Summary (sixth inspection)

| Id       | Priority | Section         | One-line description |
|----------|----------|-----------------|----------------------|
| DCI-042  | P1       | §6 Import       | SetlistImportView: no request cancellation; double submit can show wrong setlist (race) |
| DCI-043  | P2       | §4 Health       | Health route does not handle OPTIONS; CORS preflight fails |
| DCI-044  | P2       | §2 CORS         | CORS logic duplicated in three API route files; maintenance risk |
| DCI-045  | P2       | §8 Matching     | flattenSetlist does not guard entry; null/non-object in set yields malformed rows |
| DCI-046  | P2       | §7 MusicKit     | addTracksToLibraryPlaylist silently drops invalid IDs; user may expect all tracks |
| DCI-047  | P2       | §7 MusicKit     | searchCatalog in-memory cache has no TTL or size limit; unbounded growth |
| DCI-048  | P2       | §3 Setlist proxy| evictExpired() on every setCached() is O(n) per write; can be slow under load |
| DCI-049  | P2       | §10 PWA/errors  | Error/GlobalError assume error is Error; non-Error throws can break error.message access |
| DCI-050  | P2       | §3 Setlist proxy| SETLISTFM_API_KEY not trimmed; whitespace can cause opaque upstream failure |
| DCI-051  | P2       | §5 Core         | buildSearchQuery has no length cap; very long input may hit API limits |

---

### DCI-042 — SetlistImportView: no request cancellation; race when multiple loads in flight [P1 / breaking]

- **Where:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`: `loadSetlist(trimmed)` is async and does not use AbortController or a request id. State is updated on completion regardless of which request finished last.
- **What:** If the user triggers load twice in quick succession (e.g. submit, then "Try again" before the first response, or a slow network causes two overlapping requests), the response that completes last will call `setSetlist` and `setStep("preview")`. The UI can show the setlist for an older or different input than the user intended.
- **Why it matters:** User sees the wrong setlist (wrong artist/venue/tracks); confusing and breaking for correctness. The button is disabled while `loading` is true, but programmatic retry or rapid navigation could still cause overlapping calls.
- **Why it happens:** No request identity or “ignore stale response” check; no AbortController to cancel the previous fetch.

---

### DCI-043 — Health route does not handle OPTIONS (CORS preflight) [P2]

- **Where:** `apps/web/src/app/api/health/route.ts`: only `GET` is exported. There is no `OPTIONS` handler.
- **What:** For “simple” cross-origin GET requests (no custom headers), browsers do not send a preflight, so the current CORS header on the GET response is enough. If a client sends a preflight (e.g. `OPTIONS` with `Access-Control-Request-Method` or custom headers), the health route does not respond to `OPTIONS`, so the server may return 405 or 404 and the browser will block the subsequent GET.
- **Why it could matter:** Any health-check client that uses custom headers or explicit preflight would fail cross-origin until the route handles OPTIONS.
- **Why it happens:** Health was added with CORS on GET only; OPTIONS handling (as on dev-token and setlist proxy) was not added.

---

### DCI-044 — CORS logic duplicated in three API route files [P2]

- **Where:** `apps/web/src/app/api/apple/dev-token/route.ts`, `apps/web/src/app/api/setlist/proxy/route.ts`, `apps/web/src/app/api/health/route.ts`: each file defines its own `getAllowOrigin(origin)` and `corsHeaders(request)` with the same logic.
- **What:** Any change to CORS behaviour (e.g. allow a second dev origin, or change the “single origin” rule) must be applied in three places. Inconsistency or missed updates are likely over time.
- **Why it could matter:** Maintenance and consistency; one route might be updated and the others forgotten, leading to inconsistent or insecure CORS.
- **Why it happens:** Each route was implemented or fixed independently; no shared CORS helper was introduced.

---

### DCI-045 — flattenSetlist does not guard each entry in a set [P2]

- **Where:** `apps/web/src/features/matching/MatchingView.tsx`: `flattenSetlist` does `for (const entry of set)` and `entries.push({ ...entry, artist: entry.artist ?? artist })`. Each `set` is guarded with `Array.isArray(set)` (DCI-029), but elements of `set` are not validated.
- **What:** If malformed data or a future API change produces a set that contains `null`, a number, or a non-object, then `...entry` and `entry.artist` can yield a row with no `name` or invalid shape. `buildSearchQuery(entry.name, entry.artist)` would still run (e.g. `normalizeTrackName(undefined)` returns `""`), but the row could render oddly or cause subtle bugs downstream.
- **Why it could matter:** Defensive robustness; avoids malformed rows and wrong suggestions when setlist data is inconsistent.
- **Why it happens:** Type says `SetlistEntry[][]`; only the outer array and each “set” array were guarded, not each entry.

---

### DCI-046 — addTracksToLibraryPlaylist silently drops invalid song IDs [P2]

- **Where:** `apps/web/src/lib/musickit.ts`: `addTracksToLibraryPlaylist` filters to `validIds` (non-empty after trim) and throws only if no valid IDs remain. It does not report how many IDs were dropped or return a count.
- **What:** If the caller passes 10 IDs and 2 are empty or whitespace-only, the function adds 8 tracks and does not inform the caller. The UI shows success, and the playlist has 8 tracks; the user may believe all 10 were added.
- **Why it could matter:** UX and correctness; users expect “add these N matches” to add N tracks. Silent drop can cause confusion or support issues.
- **Why it happens:** DCI-039 added validation and filtering to avoid invalid API calls; reporting of dropped IDs was not added.

---

### DCI-047 — searchCatalog in-memory cache has no TTL or size limit [P2]

- **Where:** `apps/web/src/lib/musickit.ts`: `searchCache = new Map<string, AppleMusicTrack[]>()` is populated on every successful search and never cleared or evicted.
- **What:** In a long session with many distinct search terms (e.g. many setlist entries or manual searches), the cache grows without bound. Memory usage can increase over time.
- **Why it could matter:** Long-lived tabs or heavy matching sessions could use more memory than expected; no automatic or size-based eviction.
- **Why it happens:** Cache was added for performance; TTL and size limits were not implemented.

---

### DCI-048 — evictExpired() on every setCached() is O(n) per write [P2]

- **Where:** `apps/api/src/lib/setlistfm.ts`: `setCached(id, body)` calls `evictExpired()` before every `cache.set(...)`. `evictExpired()` iterates all cache entries.
- **What:** Each cache write does a full scan of the Map. Under high load with many distinct setlist IDs, write latency grows with cache size. Read path is O(1); write path is O(n).
- **Why it could matter:** Performance under load; eviction could be done periodically, on read when an expired entry is seen, or when size exceeds a threshold instead of on every write.
- **Why it happens:** DCI-038 added eviction to bound memory; the simplest approach was to evict on every write.

---

### DCI-049 — Error and GlobalError boundaries assume error is an Error instance [P2]

- **Where:** `apps/web/src/app/error.tsx`, `apps/web/src/app/global-error.tsx`: props include `error: Error & { digest?: string }`. The UI does not explicitly guard before using `error` (e.g. `console.error(error)` and any future use of `error.message`).
- **What:** If React or a library throws a non-Error value (e.g. `throw "string"` or `throw null`), the boundary may receive it and `error.message` could be undefined. Accessing `error.message` in the tree or in effects could throw again. Current code does not display `error.message` in the UI, but `console.error(error)` is safe; any future use of `error.message` without a guard would be fragile.
- **Why it could matter:** Defensive coding; ensures the boundary does not crash when the thrown value is not an Error.
- **Why it happens:** Next.js documents the boundary with an Error type; runtime can still pass other values in edge cases.

---

### DCI-050 — SETLISTFM_API_KEY not trimmed in setlist proxy [P2]

- **Where:** `apps/api/src/routes/setlist/proxy.ts`: `const apiKey = process.env.SETLISTFM_API_KEY` is used as-is. There is no `.trim()`.
- **What:** If the env var is set with leading or trailing spaces (e.g. copy-paste), the key sent to setlist.fm would include spaces. The API would likely reject the request with an auth or bad-request error that may not clearly indicate “invalid key format”.
- **Why it could matter:** Same class of misconfiguration as DCI-036 (Apple credentials); operators may not think to trim the key.
- **Why it happens:** Only presence was checked; normalisation was not applied.

---

### DCI-051 — buildSearchQuery has no length cap [P2]

- **Where:** `packages/core/src/matching/search-query.ts`: `buildSearchQuery(trackName, artistName)` passes normalised strings to `parts.join(" ")` with no maximum length.
- **What:** If `trackName` or `artistName` is very long (e.g. thousands of characters from malformed setlist data or future API changes), the resulting query string could be huge. The Apple Music catalog search API may reject, rate-limit, or behave poorly with very long queries.
- **Why it could matter:** Edge case; avoids unnecessary failures or slow requests when input is unexpectedly large.
- **Why it happens:** Input was assumed to be normal track/artist length; no defensive cap was added.

---

## Seventh inspection – new findings

Seventh pass over the codebase (deep code inspection, no code changes). New issues only; each has a unique id (DCI-052 and onward). Prioritised: **P0** = critical (security/data), **P1** = high/breaking, **P2** = nice-to-have.

### Summary (seventh inspection)

| Id       | Priority | Section          | One-line description |
|----------|----------|------------------|----------------------|
| DCI-052  | P1       | §2 API / §3 Proxy | API route handlers have no try/catch; thrown errors yield 500 without CORS |
| DCI-053  | P2       | §2 CORS          | OPTIONS returns 204 with Content-Type: application/json (redundant for no-content) |
| DCI-054  | P2       | §2 CORS          | OPTIONS handlers omit Allow-Methods / Allow-Headers; preflight can fail for non-simple requests |
| DCI-055  | P2       | §2 API Token     | Dev token route does not set Cache-Control: no-store; token may be cached |
| DCI-056  | P2       | §6 Import        | SetlistImportView: non-JSON response (e.g. 500 HTML) causes parser error message to user |
| DCI-057  | P2       | §9 Playlist      | handleAddRemainingTracks re-sends all song IDs; partial-first-add retry semantics unclear |
| DCI-058  | P2       | §2 API Token     | handleDevToken `if (!token)` is unreachable (signDeveloperToken returns or throws) |

### Fixes applied (seventh inspection – DCI-052 to DCI-058)

| Id | Fix |
|----|-----|
| **DCI-052** | Dev-token and setlist-proxy GET handlers wrapped in try/catch; on throw return 500 with JSON body and same `corsHeaders(request)` so cross-origin clients always get CORS and a readable error. |
| **DCI-053** | New `corsHeadersForOptions(request)` used for all OPTIONS responses; no Content-Type for 204 No Content. |
| **DCI-054** | `corsHeadersForOptions` returns `Access-Control-Allow-Methods: GET, OPTIONS` and `Access-Control-Allow-Headers: Content-Type` for preflight. |
| **DCI-055** | Dev-token GET response sets `Cache-Control: no-store` and `Pragma: no-cache`. |
| **DCI-056** | SetlistImportView: `res.json()` wrapped in try/catch; on parse error user sees "The server returned an invalid response. Please try again or check the URL." |
| **DCI-057** | CreatePlaylistView: JSDoc added that retry sends all song IDs and Apple Music API add is idempotent per track. |
| **DCI-058** | Dead `if (!token)` check removed from `handleDevToken` in `apps/api/src/routes/apple/dev-token.ts`. |

---

### DCI-052 — API route handlers have no try/catch; thrown errors yield 500 without CORS [P1]

- **Where:** `apps/web/src/app/api/apple/dev-token/route.ts`, `apps/web/src/app/api/setlist/proxy/route.ts`: `GET` handlers directly `await handleDevToken()` / `await handleSetlistProxy(id)` and then build the response. There is no `try/catch` around the handler body.
- **What:** If `handleDevToken()` throws (e.g. `signDeveloperToken` fails with an unexpected error after the inner catch, or a dependency throws), or if `handleSetlistProxy(id)` throws (e.g. `fetch` in `fetchSetlistFromApi` fails due to network/DNS, or any downstream code throws), Next.js will produce a 500 error response. That framework-generated response typically does **not** include the route’s `corsHeaders(request)`. In the browser, a cross-origin client will see an opaque CORS error instead of a readable JSON error body.
- **Why it matters:** Cross-origin frontends (e.g. when `NEXT_PUBLIC_API_URL` points to another origin) cannot distinguish “server error” from “CORS problem”; debugging and user-facing error handling are harder. In practice, any uncaught throw in these handlers breaks the intended CORS behaviour for that response.
- **Why it happens:** Handlers assume the underlying functions return normally or return a result object; they do not guard against thrown exceptions.

---

### DCI-053 — OPTIONS responses send Content-Type: application/json with 204 No Content [P2]

- **Where:** `apps/web/src/lib/cors.ts`: `corsHeaders(request, contentType = "application/json")` always sets `Content-Type: application/json`. All API routes use `corsHeaders(request)` for their OPTIONS response: `return new Response(null, { status: 204, headers: corsHeaders(request) })`.
- **What:** For `204 No Content`, the response has no body. Sending `Content-Type: application/json` is redundant and can be considered incorrect (no content to type). Some strict clients or proxies might treat it as minor non-compliance.
- **Why it could matter:** Purely cosmetic/spec cleanliness; no functional impact in normal browsers.
- **Why it happens:** OPTIONS reuses the same CORS helper as GET; the helper does not special-case 204 or empty body.

---

### DCI-054 — OPTIONS handlers do not return Access-Control-Allow-Methods / Allow-Headers [P2]

- **Where:** `apps/web/src/lib/cors.ts`: `corsHeaders` sets only `Content-Type` and, when allowed, `Access-Control-Allow-Origin`. The API route OPTIONS handlers return only these headers.
- **What:** For “simple” cross-origin GET requests (no custom headers, no credentials), browsers do not send a preflight, so the current behaviour is sufficient. If the client later sends requests that trigger a preflight (e.g. custom header, `Content-Type: application/json` on POST, or credentials), the browser will send `OPTIONS` with `Access-Control-Request-Method` and optionally `Access-Control-Request-Headers`. The spec expects the server to respond with `Access-Control-Allow-Methods` and, if requested, `Access-Control-Allow-Headers`. Without them, the preflight can fail and the actual request will be blocked.
- **Why it could matter:** Any future change to use non-simple requests (e.g. POST with JSON body, or an `Authorization` header) from the same frontend will break cross-origin until OPTIONS returns the appropriate Allow-Methods and Allow-Headers.
- **Why it happens:** Current usage is GET-only; preflight headers were not added.

---

### DCI-055 — Dev token route does not set Cache-Control: no-store [P2]

- **Where:** `apps/web/src/app/api/apple/dev-token/route.ts`: The GET response is built with `new Response(JSON.stringify(result), { status, headers: corsHeaders(request) })`. `corsHeaders` adds `Content-Type` and optionally `Access-Control-Allow-Origin`; no cache-related headers are set.
- **What:** The Developer Token is a short-lived credential. Browsers and intermediate caches (CDNs, reverse proxies) may cache the response according to default heuristics. A cached token could be reused longer than intended or served to a different context.
- **Why it could matter:** Reduces assurance that the token is only used for the intended TTL; in cached deployments, tokens might effectively live longer than the server-intended 1 hour.
- **Why it happens:** Cache control was not considered when implementing the route.

---

### DCI-056 — SetlistImportView: non-JSON response shows parser error to user [P2]

- **Where:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`: In `loadSetlist`, the code does `const data = (await res.json()) as ...`. If the server returns a non-JSON body (e.g. an HTML error page for 500, or a proxy error page), `res.json()` throws. The catch block sets `setError(err instanceof Error ? err.message : String(err ?? "Network error"))`.
- **What:** The user sees a raw parser message such as "Unexpected token '<' in JSON at position 0" instead of a friendly message like "The server returned an error. Please try again or check the URL."
- **Why it could matter:** Poor UX and confusion when the API or proxy returns HTML or plain text; users may think the app is broken rather than the server.
- **Why it happens:** The code assumes a successful response body is always JSON; there is no check of `Content-Type` or try/catch with a user-oriented fallback message before calling `res.json()`.

---

### DCI-057 — handleAddRemainingTracks re-sends all song IDs; partial-first-add retry semantics unclear [P2]

- **Where:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`: When add-tracks fails after playlist creation, the UI shows "Add tracks to this playlist" and `handleAddRemainingTracks` calls `addTracksToLibraryPlaylist(created.id, songIds)` with the same full `songIds` list used in the initial attempt.
- **What:** If the first add-tracks call partially succeeded (e.g. Apple API added some tracks and then failed or returned 207), the retry sends all IDs again. Behaviour then depends on the Apple Music API: if adding an already-present track is idempotent, the result may be correct; otherwise there could be duplicates or an error. The code does not track which IDs were already added.
- **Why it could matter:** In partial-success scenarios, the user might end up with duplicate entries or an unclear error. Most flows likely see full failure or full success, so impact is limited.
- **Why it happens:** The UI is designed for "retry the whole add-tracks call" without distinguishing partial success.

---

### DCI-058 — handleDevToken: `if (!token)` is unreachable [P2]

- **Where:** `apps/api/src/routes/apple/dev-token.ts`: After `const token = await signDeveloperToken(...)`, the code checks `if (!token) { return { error: "Failed to sign developer token" }; }`. In `apps/api/src/lib/jwt.ts`, `signDeveloperToken` is implemented to return `Promise<string>` and either resolves with a JWT string or throws; it never returns `null` or `undefined`.
- **What:** The branch is dead code. Static analysis or coverage tools may flag it; it adds no runtime behaviour.
- **Why it could matter:** Minor maintenance noise; if `signDeveloperToken` were later changed to return `null` on failure instead of throwing, the check would become meaningful. Until then, it is redundant.
- **Why it happens:** Defensive coding was added without matching the actual contract of `signDeveloperToken`.

### Recommended order (seventh inspection)

1. **DCI-052** – Wrap dev-token and setlist-proxy GET handlers in try/catch; on throw return a JSON error response with the same `corsHeaders(request)` so cross-origin clients always get a proper CORS and JSON error.
2. **DCI-055** – Add `Cache-Control: no-store` (and optionally `Pragma: no-cache`) to the dev-token GET response.
3. **DCI-054** – If non-simple requests are planned, add `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` to OPTIONS responses.
4. **DCI-056** – In SetlistImportView, guard `res.json()` (e.g. check Content-Type or catch and show a user-friendly message like "Server returned an invalid response. Please try again.").
5. **DCI-053**, **DCI-057**, **DCI-058** – Optional cleanups (OPTIONS Content-Type, retry semantics, dead code).

---

## Eighth inspection – new findings

Eighth pass over the codebase (deep code inspection, no code changes). New issues only; each has a unique id (DCI-059 and onward). Prioritised: **P0** = critical (security/data), **P1** = high/breaking, **P2** = nice-to-have.

### Summary (eighth inspection)

| Id       | Priority | Section           | One-line description |
|----------|----------|-------------------|-----------------------|
| DCI-059  | P2       | §5 Core           | normalizeTrackName: unbalanced parentheses (e.g. "Song (live") remain in query |
| DCI-060  | P2       | §3 Setlist proxy  | parseSetlistIdFromInput accepts any URL containing "setlist.fm" (e.g. third-party domains) |
| DCI-061  | P2       | §3 Setlist proxy  | Proxy route does not limit length of id/url query; very long input can cause unnecessary work |
| DCI-062  | P2       | §2 CORS           | ALLOWED_ORIGIN with trailing slash may not match browser Origin; CORS can fail |

### Fixes applied (eighth inspection – DCI-059 to DCI-062)

| Id | Fix |
|----|-----|
| **DCI-059** | `normalizeTrackName` strips trailing unbalanced parentheses with `.replace(/\s*\([^)]*$/g, " ")` so e.g. "Song (live" no longer remains in the search query. |
| **DCI-060** | `parseSetlistIdFromInput` only treats input as URL when `url.hostname.toLowerCase().includes("setlist.fm")`; third-party URLs containing "setlist.fm" in the path are rejected. |
| **DCI-061** | Setlist proxy GET returns 400 when `id` or `url` length exceeds 2000 characters (same as frontend limit). |
| **DCI-062** | `getAllowOrigin` strips trailing slash from configured origin (`.replace(/\/$/, "")`) so it matches browser Origin. |

---

### DCI-059 — normalizeTrackName: unbalanced parentheses remain in search query [P2]

- **Where:** `packages/core/src/matching/normalize.ts`: The regex `\s*\([^)]*\)\s*` only matches balanced parentheses. Unbalanced sequences (e.g. "Song (live", "Song (acoustic", or "Song (part 1") are not stripped.
- **What:** The segment inside the first "(" up to the next ")" is removed; if there is no closing ")", the rest of the string is left unchanged. So "Song (live" becomes "Song (live" (no change), and the search query passed to the catalog includes the raw substring. This can produce worse or no matches.
- **Why it could matter:** Setlist data can contain typos or truncated text; unbalanced parens are a real edge case. Search quality may degrade for those entries.
- **Why it happens:** The implementation assumes parenthetical segments are well-formed; the regex was written for the common "(live)", "(acoustic)" pattern.

---

### DCI-060 — parseSetlistIdFromInput accepts any URL containing "setlist.fm" [P2]

- **Where:** `apps/api/src/lib/setlistfm.ts`: The condition `trimmed.includes("setlist.fm")` causes any string containing that substring to be parsed as a URL (with `https://` prepended if no scheme). Examples: "https://evil.com/setlist.fm/63de4613", "https://phishing.example.com/setlist.fm/63de4613".
- **What:** The function extracts an ID from the path and returns it; the backend then calls the real setlist.fm API with that ID. No request is sent to the malicious domain; credentials are not exposed. However, the app effectively treats third-party URLs that contain "setlist.fm" as valid setlist URLs, which could confuse users, logging, or analytics, or support phishing-style links that look like setlist.fm.
- **Why it could matter:** Low impact (we only use the extracted ID with the real API); mainly about URL validation and user expectation that "setlist URL" means setlist.fm domain.
- **Why it happens:** The check was designed to accept setlist.fm URLs without requiring the full scheme; substring match is permissive.

---

### DCI-061 — Setlist proxy route does not limit length of id/url query parameter [P2]

- **Where:** `apps/web/src/app/api/setlist/proxy/route.ts`: The handler reads `id = request.nextUrl.searchParams.get("id") ?? request.nextUrl.searchParams.get("url") ?? ""` and passes it to `handleSetlistProxy(id)`. There is no server-side length check. The frontend limits input to 2000 characters (DCI-010), but the API can be called directly (e.g. by another client or a modified frontend).
- **What:** A client could send a very long `id` or `url` (e.g. hundreds of KB). `parseSetlistIdFromInput` would trim and then either parse as a URL (new URL(trimmed) and path extraction) or test the raw ID against a regex. Very long strings can cause unnecessary CPU, memory, or (in theory) DoS if many such requests are sent.
- **Why it could matter:** Defence in depth; the API should bound input size for robustness. Impact is low if the API is only used by the official frontend, which already limits length.
- **Why it happens:** Validation was focused on format (valid ID/URL); length limits were only applied in the UI.

---

### DCI-062 — ALLOWED_ORIGIN with trailing slash may not match browser Origin [P2]

- **Where:** `apps/web/src/lib/cors.ts`: `getAllowOrigin(origin)` uses the configured value as `configured.split(",")[0].trim()`. It does not strip a trailing slash. The HTTP Origin header sent by browsers is a scheme + host + optional port, with no path (e.g. `https://app.example.com`).
- **What:** If `ALLOWED_ORIGIN` is set to `https://app.example.com/` (with trailing slash), the response header would be `Access-Control-Allow-Origin: https://app.example.com/`. The browser compares this to the request Origin (typically `https://app.example.com`). A strict comparison would fail, so the browser might not expose the response to the page and the user could see CORS errors despite correct configuration.
- **Why it could matter:** Common configuration mistake (copy-paste from base URL); production CORS can fail with no code change.
- **Why it happens:** The CORS helper trusts the env value; it does not normalise the origin to scheme+host+port form.

### Recommended order (eighth inspection)

1. **DCI-062** – In `getAllowOrigin`, strip a trailing slash from the configured origin (e.g. replace `/\/$/` with `""`) so "https://app.example.com/" matches browser Origin "https://app.example.com".
2. **DCI-061** – In the setlist proxy GET handler, reject with 400 if `id`/`url` length exceeds a limit (e.g. 2000 characters) to align with frontend and avoid unbounded input.
3. **DCI-059** – Optionally extend the parenthetical-strip regex or add a fallback to remove a trailing " (…" segment when no ")" is found.
4. **DCI-060** – Optional: restrict URL parsing to hosts that match setlist.fm (e.g. check `url.hostname` after parsing) so only setlist.fm URLs are accepted as URL-style input.
