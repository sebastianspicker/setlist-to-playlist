# Testing: Unit Test Expansion

## Ralph Loop Protocol

You are inside a Ralph Loop. The same prompt is fed every iteration via stop hook.
Your work persists in files and git history.

Every iteration:

1. Read `.claude/loops/state.yaml` — find next incomplete item in your scope
2. Do exactly ONE item of work
3. Run CI: `pnpm format:check && pnpm lint && pnpm build && pnpm test`
4. Update state.yaml (mark item complete, add notes)
5. Commit: `git add -A && git commit -m "test(<scope>): <desc>"`
6. Exit — stop hook re-invokes you

Emit the completion promise ONLY when your entire scope is complete.

## State

`phases.05-testing.sub_phases.01-unit-tests.items`

## Audit Checklist (Priority Order)

### Item: core-parse-id-tests

`packages/core/src/setlist/parse-id.ts` — tested indirectly via
API tests but needs its own test file. Test: URLs, raw IDs, invalid
formats, edge cases (too short, too long, non-hex chars)

### Item: core-apple-tests

`packages/core/src/apple/` — read and test whatever is there

### Item: core-search-query-coverage

`packages/core/src/matching/search-query.ts` — has test file,
verify coverage is complete (200 char cap, special chars)

### Item: web-cors-tests

`cors.ts` — test getAllowOrigin with: configured origin, localhost,
null origin, wildcard rejection, trailing slash

### Item: web-fetch-tests

`fetch.ts` — test fetchJson with: success, HTTP error, non-JSON,
oversized response (>10 MiB), error extraction

### Item: web-api-tests

`api.ts` — test apiUrl with: no base, with base, trailing /api,
path with/without leading slash

`config.ts` — test env parsing edge cases

`api-response.ts` — test jsonResponse headers

### Item: musickit-token-tests

`token.ts` — test fetchDeveloperToken with: cached token, expired
token, fetch failure, concurrent calls

### Item: musickit-catalog-tests

`catalog.ts` — test searchCatalog with: cache hit, cache miss,
API error, eviction

`client.ts` — test initMusicKit with: first call, cached instance,
MusicKit not loaded, configure failure

### Item: musickit-playlist-tests

`playlist.ts` — test createLibraryPlaylist and addTracksToLibraryPlaylist
with: success, not authorized, API error, empty songIds

## Files to Read

- Phase 1 test coverage gap analysis in progress.md
- Existing test files for patterns and conventions
- Vitest config for test file discovery patterns

## Rules

- Follow existing test patterns (describe/it, vi.mock, beforeEach/afterEach)
- Tests must be deterministic — no network calls, no timing dependencies
- Mock external dependencies (fetch, MusicKit, window.localStorage)
- Each test file tests one module
- Test both happy path and error paths
- Run `pnpm test` after writing each test file
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE test file per invocation

## Max Iterations

12

## Completion

When all priority unit tests added and passing:

<promise>UNIT TEST EXPANSION COMPLETE</promise>
