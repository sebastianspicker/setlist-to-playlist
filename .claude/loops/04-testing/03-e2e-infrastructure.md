# Testing: E2E Test Infrastructure (Playwright)

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

`phases.05-testing.sub_phases.05-e2e-playwright.items`

## Audit Checklist

### Item: playwright-install-config

- Add @playwright/test as devDependency in apps/web
- Create `apps/web/playwright.config.ts` with:
  - baseURL: http://localhost:3000
  - webServer config to start Next.js dev server
  - Chromium-only for CI speed (expand later)
  - Screenshot on failure
  - Reasonable timeout (30s)

### Item: e2e-test-script

- Add `test:e2e` script to apps/web/package.json
- Add `test:e2e` to root package.json
- Consider: should E2E run in CI? If so, add to ci.yml as
  a separate job (not blocking the fast unit test matrix)

### Item: smoke-test-app-loads

Create `apps/web/e2e/smoke.spec.ts`:

- Navigate to /
- Assert page title "Setlist to Playlist"
- Assert heading visible
- Assert input field visible
- Assert "Load setlist" button visible and enabled

### Item: smoke-test-demo

Create `apps/web/e2e/demo.spec.ts`:

- Navigate to /demo
- Assert page loads without errors

### Item: import-flow-test

Create `apps/web/e2e/import-flow.spec.ts`:

- Mock the /api/setlist/proxy response using Playwright route interception
- Enter a setlist ID
- Click "Load setlist"
- Assert setlist preview appears with artist name and track list
- Click "Continue to Matching"
- Assert matching view appears

### Item: error-handling-e2e

Create `apps/web/e2e/error-handling.spec.ts`:

- Mock /api/setlist/proxy to return 404
- Enter an ID, submit
- Assert error message appears
- Assert retry button is visible

## Rules

- E2E tests must not require real API keys or external services
- Use Playwright route interception to mock API responses
- Keep E2E tests focused — they test user flows, not unit behavior
- Each test should be independent (no shared state between tests)
- Run `npx playwright test` after each test file
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE test file per invocation

## Max Iterations

10

## Completion

When Playwright infrastructure set up and smoke tests passing:

<promise>E2E INFRASTRUCTURE COMPLETE</promise>
