# Final: Regression Testing

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

## State

`phases.08-ship-review.sub_phases.02-regression-testing.items`

You are running a comprehensive regression test pass.
Work through items ONE AT A TIME.

## Checklist

### Item: full-ci-suite

**Full CI Suite**

Run the complete CI suite locally:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm build
pnpm test
pnpm audit --audit-level=high --prod
```

All must pass. Record output.

### Item: test-stability

**Test Stability**

Run `pnpm test` three times in a row.
All three runs must produce identical results (no flaky tests).

### Item: build-output-check

**Build Output Check**

After `pnpm build`:

- Check for any new warnings in build output
- Verify build output size has not regressed significantly
- Check that no development-only code is in the production build

### Item: e2e-regression

**E2E Regression (if available)**

If Playwright tests exist from Phase 4:

- Run all E2E tests
- Verify they pass against the current build

## Rules

- Record all results in progress.md
- If any test fails, investigate and fix before proceeding
- Work on ONLY ONE check per invocation

## Max Iterations

6

## Completion

When all regression tests pass:

<promise>REGRESSION TESTING COMPLETE</promise>
