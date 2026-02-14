# Implementation Task List

Follow tasks in order (T001 → T002 → …). When all are done, the app supports: enter setlist URL/ID → preview setlist → match or correct tracks → create Apple Music playlist.

Each task: **What** (action), **Where** (file/area), **Why** (purpose), **Acceptance** (how to verify, when useful).

**Progress:** §1–§10 done. §11 Quality and CI **done** (T065–T070). All tasks T001–T070 complete.

---

## 1. Environment and configuration ✅

| ID | What | Where | Why | Acceptance |
|----|------|--------|-----|------------|
| T001 | Ensure `.env.example` lists `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `SETLISTFM_API_KEY`, `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`. | Repo root `.env.example` | So developers know which env vars are required. | All five (or four if proxy unused) appear with placeholder text. |
| T002 | Document how to obtain Apple Music credentials (Developer account, key with Music Kit). | `docs/tech/apple-music.md` or README | So developers can set up the Developer Token. | One short "Setup" subsection with link to Apple docs. |
| T003 | Document how to obtain a setlist.fm API key and base URL. | `docs/tech/setlistfm.md` | So the proxy or client can call the API. | URL and header (e.g. `x-api-key`) documented. |
| T004 | Add `.env` to `.gitignore` and ensure no real secrets are committed. | Root `.gitignore` | So API keys and private keys never enter the repo. | `.env` and `.env.local` are ignored. |
| T005 | Define the web app's base URL / API base URL for dev (e.g. `NEXT_PUBLIC_API_URL` or same-origin). | `apps/web` env or config | So the frontend knows where to fetch the Developer Token and setlist proxy. | Config or env used consistently in web app. |

---

## 2. API – Developer Token ✅

| ID | What | Where | Why | Acceptance |
|----|------|--------|-----|------------|
| T006 | Implement JWT signing for the Apple Developer Token (ES256, `kid` = Key ID, `iss` = Team ID, `iat`/`exp`). | `apps/api/src/lib/jwt.ts` (or equivalent) | So the client can get a valid token without ever seeing the private key. | Function returns a JWT string decodeable with Apple's public key. |
| T007 | Read `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` from env in the API; fail clearly if missing. | `apps/api` (e.g. in route or lib) | So the token is minted only with correct credentials. | Missing env returns a non-200 and error message, no crash. |
| T008 | Add a GET route that returns `{ token: "<jwt>" }` or `{ error: "<message>" }`. | `apps/api/src/routes/apple/dev-token.ts` (or Next API route) | So the web app can fetch the Developer Token at runtime. | GET request returns JSON with either `token` or `error`. |
| T009 | Set appropriate CORS headers for the dev-token route (allow only the frontend origin). | API middleware or route handler | So only our frontend can call the endpoint from the browser. | Response includes `Access-Control-Allow-Origin` for the app origin. |
| T010 | Optionally add rate limiting for the dev-token endpoint. | API middleware or server config | To reduce abuse and token leakage risk. | Optional; document if implemented. |
| T011 | Add a dependency for JWT signing (e.g. `jose` or `jsonwebtoken`) in `apps/api`. | `apps/api/package.json` | So the signing implementation can run. | Build and route work without runtime errors. |
| T012 | Write a minimal test or script that calls the dev-token route and asserts a JWT is returned (with env set). | `apps/api/tests` or script | So regressions in token minting are caught. | Test passes when env is configured. |

---

## 3. API – setlist.fm proxy ✅

| ID | What | Where | Why | Acceptance |
|----|------|--------|-----|------------|
| T013 | Add a route that accepts setlist ID (or URL) and forwards the request to setlist.fm. | `apps/api/src/routes/setlist/proxy.ts` (or Next API route) | So the API key is never sent to the client. | Request with valid ID returns setlist JSON. |
| T014 | Read `SETLISTFM_API_KEY` from env and send it in the request to setlist.fm (e.g. `x-api-key`). | Same route or shared client | So setlist.fm accepts the request. | Successful response from setlist.fm for a valid ID. |
| T015 | Parse setlist ID from a setlist.fm URL if the client sends a URL; otherwise use the raw ID. | Same route or `packages/core` / `packages/shared` | So users can paste either URL or ID. | Both `.../setlist/xyz/...` and `xyz` work. |
| T016 | Return a clear error (e.g. 404 or 503) when setlist.fm returns an error or setlist not found. | Proxy route | So the UI can show a user-friendly message. | Non-2xx from setlist.fm maps to a sensible status and body. |
| T017 | On 429 from setlist.fm, implement backoff and return a rate-limit message to the client. | Proxy or shared fetch wrapper | So we comply with limits and inform the user. | 429 response leads to retry or clear "rate limited" message. |
| T018 | Optionally cache successful setlist responses by ID with a short TTL (e.g. in-memory). | Proxy or `apps/api/src/lib` | To reduce calls to setlist.fm and protect the key. | Optional; same ID within TTL returns cached response. |
| T019 | Restrict CORS for the setlist proxy to the frontend origin. | API middleware or route | So only our app can call the proxy from the browser. | Same as dev-token CORS. |
| T020 | Add a test or manual check that the proxy returns setlist data for a known public setlist ID. | `apps/api/tests` or docs | So the integration with setlist.fm is verified. | Document one test setlist ID and expected shape. |

---

## 4. API – Health and wiring ✅

| ID | What | Where | Why | Acceptance |
|----|------|--------|-----|------------|
| T021 | Expose the existing health route (e.g. GET `/health`) that returns `{ status: "ok" }`. | `apps/api/src/routes/health.ts` | So deployment and load balancers can check liveness. | GET /health returns 200 and JSON. |
| T022 | Document how the API is run and how the web app reaches it (e.g. Vercel serverless, Next API routes, or standalone server). | `docs/tech/backend.md` | So developers and CI know how to start and call the API. | Doc states base URL and deployment option. |
| T023 | If using a separate API app, add a way to start it locally (e.g. `pnpm --filter api dev` or similar). | Root or `apps/api/package.json` | So the full stack can be run locally. | Both web and API can be run and called from the app. |
| T024 | Ensure the web app uses the correct API base URL (env or config) for dev-token and setlist proxy. | `apps/web` (env, lib, or feature code) | So the frontend talks to the right backend. | Changing API URL in config changes the requests. |

---

## 5. Core – Setlist and matching ✅

| ID | What | Where | Why | Acceptance |
|----|------|--------|-----|------------|
| T025 | Define types for the setlist.fm API response (or a normalized subset) used by the app. | `packages/shared` or `packages/core` | So we have a single contract for setlist data. | Types cover artist, venue, eventDate, sets/songs. |
| T026 | Implement a mapper from setlist.fm response to `Setlist` / `SetlistEntry` in `packages/core`. | `packages/core/src/setlist/` | So the rest of the app works with a stable domain model. | Mapper returns `Setlist` with ordered tracks. |
| T027 | Keep or extend `normalizeTrackName` to strip "feat.", "(live)", and similar for search. | `packages/core/src/matching/normalize.ts` | So Apple Music search gets cleaner queries. | Unit tests for normalization cases. |
| T028 | Add a function that builds an Apple Music search query string from track name + artist (using normalization). | `packages/core/src/matching/` | So the UI can call Apple search with one consistent query. | Function returns a string suitable for catalog search. |
| T029 | Export `Setlist`, `SetlistEntry`, and matching types from `packages/core`. | `packages/core/src/index.ts` | So web and API can import the domain model. | Imports work from `@repo/core`. |
| T030 | Add unit tests for the setlist mapper (given a fixture response, expect correct `Setlist`). | `packages/core/tests` | So parsing regressions are caught. | Test with at least one real-shaped fixture. |
| T031 | Add unit tests for the search-query builder. | `packages/core/tests` | So query shape stays correct. | Tests for various track/artist inputs. |

---

## 6. Web – Setlist import UI ✅

| ID | What | Where | Why | Acceptance |
|----|------|--------|-----|------------|
| T032 | Add a page or section for "Import": input field for setlist URL or ID and a submit button. | `apps/web/src/app` or `apps/web/src/features/setlist-import/` | So the user can enter the setlist source. | Typing and submit are possible. |
| T033 | On submit, call the setlist proxy API (or setlist.fm with key in env if no proxy) with the parsed ID. | Same feature or `apps/web/src/lib` | So we retrieve the setlist data. | Network tab shows request and response. |
| T034 | Map the API response to `Setlist` using the core mapper and store it in component state (or lightweight store). | Setlist-import feature | So the rest of the UI can show and use the setlist. | State holds artist, venue, date, tracks. |
| T035 | Display the setlist: artist name, venue, date, and ordered list of track names. | Same feature, one or more components | So the user can confirm the setlist before matching. | All fields visible; track order preserved. |
| T036 | Show a loading state while the setlist request is in progress. | Same feature | So the user knows the app is working. | Spinner or placeholder visible during fetch. |
| T037 | Show an error state if the request fails (invalid ID, network error, 429). | Same feature | So the user knows what went wrong. | Error message shown; user can try again. |
| T038 | After a successful import, allow the user to proceed to the "Matching" step (e.g. button or automatic transition). | Setlist-import or app flow | So the flow continues to track matching. | One clear way to go to the next step. |

---

## 7. Web – MusicKit integration ✅

| ID | What | Where | Why | Acceptance |
|----|------|--------|-----|------------|
| T039 | Fetch the Developer Token from the API on app load or before MusicKit is used. | `apps/web/src/lib` or a MusicKit helper | So MusicKit can be configured with a valid token. | Token is requested and stored (e.g. in memory). |
| T040 | Configure MusicKit with the fetched token and app ID (`NEXT_PUBLIC_APPLE_MUSIC_APP_ID`). | Same place | So MusicKit is ready for authorization and API calls. | `MusicKit.configure` called with token and app id. |
| T041 | Add a flow to authorize the user with MusicKit (e.g. "Connect Apple Music" or on "Create playlist"). | `apps/web` (feature or layout) | So we can create playlists and search catalog on their behalf. | Click triggers auth; after success, MusicKit is authorized. |
| T042 | Handle MusicKit auth errors (e.g. user cancelled, revoked); show a clear message and retry option. | Same place | So the user can recover from auth issues. | Error state visible; user can try again. |
| T043 | Implement a function that calls Apple Music catalog search with a given term and returns a list of tracks (ids, names, artists). | `apps/web/src/lib` or feature | So we can suggest matches for each setlist track. | Search returns an array of track objects with id and name. |
| T044 | Use the storefront (e.g. from MusicKit or user) when calling the catalog search API. | Same as T043 | So search runs in the correct region. | Search uses the appropriate storefront. |
| T045 | Optionally cache search results per term for the session to avoid duplicate requests. | Client state or lib | To reduce API calls during matching. | Optional; repeated same search reuses result. |

---

## 8. Web – Matching UI ✅

| ID | What | Where | Why | Acceptance |
|----|------|--------|-----|------------|
| T046 | For each setlist track, build the search query using the core search-query function (track + artist). | `apps/web` matching feature | So we use the same normalization as in core. | Query is built from setlist entry and artist. |
| T047 | Call Apple Music catalog search for each track (or in batch if supported) and store the first/best result as suggestion. | Matching feature | So each row has a default suggested Apple track. | Each setlist entry has an optional suggested Apple track. |
| T048 | Render a list of rows: setlist track name, suggested Apple track (name + artist), and a control to "Change" or "Search". | `apps/web/src/features/matching/` | So the user can see and adjust matches. | One row per setlist track; suggestion and control visible. |
| T049 | When the user clicks "Change" or "Search", show a way to run a new search (e.g. input + search) and pick a different track. | Same feature | So the user can fix wrong or missing matches. | New search returns results; user can select one. |
| T050 | Allow the user to leave a track without a match (e.g. "Skip" or leave empty). | Same feature | So tracks not in Apple Music don't block the flow. | Some rows can have no selected Apple track. |
| T051 | Store the selected Apple Music track ID (or null) per setlist entry in state; order = setlist order. | Same feature | So we have the ordered list of IDs for playlist creation. | State holds an array of { setlistEntry, appleTrackId | null }. |
| T052 | Show a loading state while suggestions are being fetched. | Matching feature | So the user knows matching is in progress. | Loading indicator during search. |
| T053 | Provide a way to proceed to "Create playlist" when the user is done (e.g. button). | Matching or app flow | So the flow continues to export. | One clear action to create the playlist. |

---

## 9. Web – Playlist creation ✅

| ID | What | Where | Why | Acceptance |
|----|------|--------|-----|------------|
| T054 | On "Create playlist", ensure the user is authorized with MusicKit; if not, trigger auth first. | `apps/web` playlist-export feature | So we can call the library API. | Unauthorized user is prompted to authorize. |
| T055 | Call MusicKit to create a new playlist (e.g. name = setlist title or "Setlist – Artist – Date"). | `apps/web/src/features/playlist-export/` or lib | So the playlist exists in the user's library. | POST to create playlist returns playlist id. |
| T056 | Call MusicKit to add the selected track IDs to the playlist in order (songs only). | Same place | So the playlist contains the matched tracks in setlist order. | Playlist contains the correct tracks in order. |
| T057 | Show a success message and a link to open the playlist in Apple Music (or Music app). | Same feature | So the user can immediately listen. | Success UI with link; link opens Apple Music. |
| T058 | Handle errors (e.g. create failed, add tracks failed) and show a clear message and retry option. | Same feature | So the user can recover from failures. | Error state visible; user can retry. |
| T059 | Disable or hide "Create playlist" until at least one track is matched (optional product choice). | UI logic | To avoid creating an empty playlist. | Optional; document behavior. |

---

## 10. PWA and polish ✅

| ID | What | Where | Why | Acceptance |
|----|------|--------|-----|------------|
| T060 | Ensure `manifest.webmanifest` has correct name, start_url, display, and icons. | `apps/web/public/manifest.webmanifest` | So the app can be installed as a PWA. | Manifest is valid and linked from the app. |
| T061 | Add at least one icon (e.g. 192x192 and 512x512) and reference them in the manifest. | `apps/web/public/icons/` | So installed PWA has an icon. | Icons exist and manifest points to them. |
| T062 | Optionally add a minimal service worker (e.g. via next-pwa or custom) for offline shell. | `apps/web` | So the app can load offline for already-visited content. | Optional; document if added. |
| T063 | Add basic global error boundary or error display so uncaught errors don't leave a blank screen. | `apps/web/src/app` or layout | So the user sees something useful when something breaks. | Error state visible on throw. |
| T064 | Ensure the main flow (import → match → create) is usable on a small viewport (responsive). | `apps/web` styles / components | So mobile users can complete the flow. | Layout works at 320px width. |

---

## 11. Quality and CI ✅

| ID | What | Where | Why | Acceptance |
|----|------|--------|-----|------------|
| T065 | Add or keep unit tests for core normalization and setlist mapping. | `packages/core/tests` | So domain logic regressions are caught. | `pnpm test` in core passes. |
| T066 | Add or keep tests for the API (e.g. health route, dev-token with mock env, proxy with mock fetch). | `apps/api/tests` | So API regressions are caught. | `pnpm test` in api passes. |
| T067 | Run lint (ESLint) and fix or exclude only where necessary. | Root and each package | So code style and simple bugs are caught. | `pnpm lint` passes. |
| T068 | Add a CI workflow (e.g. GitHub Actions) that runs `pnpm install`, `pnpm lint`, `pnpm test`, and `pnpm build`. | `.github/workflows/` or similar | So every push/PR is checked. | CI runs and reports status. |
| T069 | Document in CONTRIBUTING or AGENTS how to run tests and lint locally. | `CONTRIBUTING.md` or `AGENTS.md` | So contributors know how to verify their work. | Commands are clearly stated. |
| T070 | Optionally add one critical-path e2e test (e.g. import setlist → see list) with Playwright or Cypress. | `apps/web/e2e/` | So the main flow is validated end-to-end. | Optional; if present, CI runs it. |

---

## Summary

- **Total tasks:** T001–T070.
- **Outcome:** Completing all steps in order yields a working app: user enters setlist URL/ID → sees setlist → sees and can correct track matches → creates an Apple Music playlist.
- **References:** [PRD](../product-specs/PRD.md), [ARCHITECTURE.md](../../ARCHITECTURE.md), [MVP plan](active/000-mvp-plan.md).
