# R2: Middleware Tests

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

Read `.claude/loops/state.yaml` at:
`phases.r2-02-component-tests.sub_phases.03-middleware-tests.items`
Find the first item with `status != complete`. Do that item.

## Items

### Item: csp-middleware-tests

File to test: `apps/web/middleware.ts`
Test file: `apps/web/tests/middleware.test.ts`

No jsdom needed — middleware is server-side Node code.

Mock `NextResponse.next()` to return a response with settable headers.
Create a mock `NextRequest` using the helper pattern from `apps/web/tests/helpers/mock-request.ts`.

Test scenarios:

- Response has `Content-Security-Policy` header set
- CSP `script-src` includes `https://js-cdn.music.apple.com`
- CSP `connect-src` includes `https://api.music.apple.com`
- Response has `X-Content-Type-Options: nosniff`
- Response has `X-Frame-Options: DENY`
- Response has `Referrer-Policy: strict-origin-when-cross-origin`
- CSP has `frame-src 'none'` and `object-src 'none'`
- CSP has `default-src 'self'`

## Files to Read

- `apps/web/middleware.ts`
- `apps/web/tests/helpers/mock-request.ts` (for NextRequest mocking patterns)
- Existing route tests for mock patterns

## Rules

- No jsdom needed for this test
- Follow existing test patterns (describe/it, vi.mock)
- Run `pnpm test` after writing the test file
- Update state.yaml after completion
- Work on ONLY ONE item per invocation

## Max Iterations

4

## Completion

When middleware tests pass:

<promise>R2 MIDDLEWARE TESTS COMPLETE</promise>
