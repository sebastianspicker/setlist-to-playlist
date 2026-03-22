# Phase 5: Testing & Reliability

## Ralph Loop Protocol

You are inside a Ralph Loop. The same prompt is fed every iteration via stop hook.
Your work persists in files and git history.

Every iteration:

1. Read `.claude/loops/state.yaml` — find next incomplete item in your scope
2. Do exactly ONE item of work
3. Run CI: `pnpm format:check && pnpm lint && pnpm build && pnpm test`
4. Update state.yaml (mark item complete, add notes)
5. Commit: `git add -A && git commit -m "<type>(<scope>): <desc>"`
6. Exit — stop hook re-invokes you

Emit the completion promise ONLY when your entire scope is complete.

## Purpose

Expands test coverage based on Phase 1 gap analysis. Tests are written in
order from fastest feedback to slowest: unit tests first, then integration,
then component/hook tests, then edge cases, and finally E2E with Playwright.

## Entry Criteria

- Phase 4 (security) complete
- `pnpm format:check && pnpm lint && pnpm build && pnpm test` all pass
- Phase 1 test coverage gap analysis available in progress.md
- Working branch: `ralph/05-testing`

## Sub-Phase Order (fast feedback -> slow feedback)

1. `01-unit-test-expansion.md` — Fill gaps in existing unit tests
2. `02-integration-tests.md` — API route integration tests
3. `03-component-hook-tests.md` — React component and custom hook tests
4. `04-edge-case-tests.md` — Edge cases and error scenarios
5. `05-e2e-infrastructure.md` — Playwright setup and smoke tests

Order matters: unit tests first (fastest feedback), then integration
(needs fixtures), then component/hook tests (needs React test utils),
then edge cases (builds on previous), then E2E (needs infrastructure).

## State

Read `.claude/loops/state.yaml` at `phases.05-testing`.
Find the first sub-phase with `status != complete`.
Within that sub-phase, find the first item with `status != complete`.
Read the sub-phase prompt at `.claude/loops/04-testing/{sub_phase_file}.md`.
Execute that ONE item.

## Between Sub-Phases

Run after each sub-phase:

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

Record the test count after each sub-phase in state.yaml:

```bash
# Count total tests
pnpm test 2>&1 | tail -5
```

Update `phases.05-testing.metrics.test_count` in state.yaml after each
sub-phase completes.

Verify no flaky tests by running the suite multiple times:

```bash
pnpm test && pnpm test && pnpm test
```

## Rollback

If a new test is flaky or breaks existing tests:

1. `git stash` the changes
2. Run existing tests to confirm they pass without the new tests
3. Identify the flaky test or conflict
4. Fix the test (not the source code — source changes belong in earlier phases)
5. If the test cannot be stabilized, mark it as `.skip` with a TODO comment
   and document in state.yaml

## Branch

`ralph/05-testing`

Commit format: `test(<scope>): <what changed>`

## Exit Criteria

- All 5 sub-phases complete
- Test count increased from baseline
- All Phase 1 P0 and P1 coverage gaps addressed
- Component and hook tests in place for critical UI paths
- E2E infrastructure in place (even if only smoke tests)
- No flaky tests (verified by running test suite 3 times)
- CI fully green (`pnpm format:check && pnpm lint && pnpm build && pnpm test`)

## Completion

<promise>PHASE 5 TESTING COMPLETE</promise>
