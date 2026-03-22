# Analysis: Test Coverage Gap Analysis

## Ralph Loop Protocol

You are inside a Ralph Loop. The same prompt is fed every iteration via stop hook.
Your work persists in files and git history.

Every iteration:

1. Read `.claude/loops/state.yaml` — find next incomplete item in your scope
2. Do exactly ONE item of work (this is a READ-ONLY phase — only update state.yaml)
3. Update state.yaml (mark item complete, add notes)
4. Exit — stop hook re-invokes you

Emit the completion promise ONLY when your entire scope is complete.

## State

`phases.01-analysis.sub_phases.03-test-coverage-gaps.items`

You are mapping test coverage gaps across the monorepo. Do NOT modify files.

## Scope

### Item: inventory-current-tests

Map each test file to what it tests:

- `packages/core/tests/` (7 files) — which functions in core/src are tested?
- `packages/shared/tests/example.test.ts` — what does it actually cover?
- `apps/api/tests/` (3 files) — which routes/libs are tested?
- `apps/web/tests/` (1 file) — only rate-limit.ts is tested

### Item: untested-source-files

For each source file, determine if any test exercises it:

- `apps/web/src/lib/fetch.ts` — fetchJson with error cases
- `apps/web/src/lib/cors.ts` — getAllowOrigin with edge cases
- `apps/web/src/lib/api-response.ts` — jsonResponse
- `apps/web/src/lib/api.ts` — apiUrl construction
- `apps/web/src/lib/config.ts` — env parsing
- `apps/web/src/lib/musickit/` — all 5 files (client, token, catalog, playlist, types)
- `apps/web/src/hooks/useAsyncAction.ts`
- `apps/web/src/components/` — all components
- `apps/web/src/features/` — all feature components and hooks
- `packages/core/src/setlist/parse-id.ts` — tested via API tests but not directly
- `packages/core/src/apple/` — any tests?

### Item: test-quality-assessment

- Are existing tests testing behavior or implementation?
- Do tests cover error paths or just happy paths?
- Are there tests that would pass even if the code was broken?
  (e.g., `shared/tests/example.test.ts` checks exports exist, not behavior)
- Are mocks appropriate or do they hide bugs?

### Item: integration-e2e-gap

- No integration tests exist for the full flow (import -> match -> export)
- No E2E tests exist (directory created but empty)
- No tests for Next.js route handlers as integrated units
- No tests for MusicKit interaction patterns

## Files to Read

- All test files (12 files)
- All source files to compare against test coverage
- Vitest config in each package

## Rules

- READ ONLY. Do not modify any file.
- For each source file, record: tested (yes/no/partial),
  what is covered, what is missing.
- Prioritize gaps: P0 (bug-prone code with no tests),
  P1 (important paths untested), P2 (nice to have).
- Update `.claude/loops/progress.md`.
- Work on ONE category per invocation.

## Max Iterations

6

## Completion

When all coverage gaps are documented:

<promise>TEST COVERAGE GAP ANALYSIS COMPLETE</promise>
