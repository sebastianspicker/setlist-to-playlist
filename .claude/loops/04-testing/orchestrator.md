# Phase 4 Orchestrator: Testing & Reliability

This phase expands test coverage based on Phase 1 gap analysis.

## Entry Criteria

- Phase 3 complete; CI fully green
- Phase 1 test coverage gap analysis available in progress.md
- Working branch: `ralph/04-testing`

## Sub-Phase Order (fast -> slow feedback)

1. `01-unit-test-expansion.md` — Fill gaps in existing unit tests
2. `02-integration-tests.md` — API route integration tests
3. `03-e2e-infrastructure.md` — Playwright setup
4. `04-edge-case-tests.md` — Edge cases and error scenarios

Order matters: unit tests first (fastest feedback), then integration
(needs fixtures), then E2E (needs infrastructure), then edge cases
(builds on all previous).

## Between Sub-Phases

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

Record test count after each sub-phase.

## Exit Criteria

- Test count significantly increased from baseline (55)
- All Phase 1 P0 and P1 coverage gaps addressed
- E2E infrastructure in place (even if only smoke tests)
- No flaky tests (run test suite 3 times to verify)

## Completion

<promise>PHASE 4 TESTING COMPLETE</promise>
