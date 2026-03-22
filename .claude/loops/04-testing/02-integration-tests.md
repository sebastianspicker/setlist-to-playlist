# Testing: Integration Tests for API Routes

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

`phases.05-testing.sub_phases.02-integration-tests.items`

## Audit Checklist

### Item: test-infrastructure

- Test the route handler functions directly (import GET/OPTIONS from
  route.ts and call with mock NextRequest)
- Create a helper to build mock NextRequest objects with:
  searchParams, headers (origin, x-forwarded-for), method
- Place helpers in `apps/web/tests/helpers/`

### Item: setlist-proxy-route-tests

File: `apps/web/src/app/api/setlist/proxy/route.ts`
Test scenarios with realistic fixtures:

- Missing query parameter -> 400
- Valid setlist ID -> 200 with setlist JSON (mock setlistfm fetch)
- Rate limited -> 429 with Retry-After header
- setlist.fm API down -> 503
- Invalid setlist ID format -> 400
- Input too long -> 400
- CORS headers present on all responses

### Item: dev-token-route-tests

File: `apps/web/src/app/api/apple/dev-token/route.ts`
Test scenarios:

- Missing Apple credentials -> 500 with safe error message
- Valid credentials -> 200 with JWT token
- CORS headers present

### Item: health-route-tests

File: `apps/web/src/app/api/health/route.ts`

- Returns 200 with expected shape
- CORS headers if applicable

### Item: cors-integration-tests

Test that CORS headers work correctly across routes:

- Request from allowed origin -> Access-Control-Allow-Origin set
- Request from disallowed origin -> no CORS header
- Preflight OPTIONS -> 204 with correct headers
- Configured ALLOWED_ORIGIN -> uses that value

### Item: realistic-fixtures

Create test fixtures in `apps/web/tests/fixtures/`:

- Real setlist.fm response shape (e.g., Beatles Hollywood Bowl)
- Empty setlist (no tracks)
- Large setlist (30+ tracks)
- Unicode artist/venue names

## Rules

- Integration tests go in `apps/web/tests/` directory
- Use realistic data shapes from the setlist.fm API docs
- Do NOT make real HTTP requests — mock fetch
- Test response status, headers, and body structure
- Run `pnpm test` after each test file
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE test file per invocation

## Max Iterations

10

## Completion

When all integration tests added and passing:

<promise>INTEGRATION TESTS COMPLETE</promise>
