# R2: Final Regression & Verification

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

Key: `phases.r2-04-verification.sub_phases.01-regression.items`

---

### Item: full-ci-suite

- **Task:** Run full Tier 3 CI:
  ```
  pnpm install --frozen-lockfile
  pnpm format:check
  pnpm lint
  pnpm build
  pnpm test
  pnpm audit --audit-level=high --prod
  ```
- **Notes:** Record test count in state.yaml notes. If anything fails, fix it before marking complete.

---

### Item: test-stability

- **Task:** Run `pnpm test` three times in a row.
- **Criteria:** All three runs must pass with zero failures.
- **Notes:** Record results in state.yaml notes (e.g., "3/3 pass, 0 flaky").

---

### Item: update-changelog

- **Task:** Add a section to CHANGELOG.md for the round 2 changes:
  - Testing infrastructure (RTL + jsdom)
  - Component & hook tests added
  - Accessibility fixes
  - Code quality improvements
- **Notes:** Bump version if appropriate (patch: 0.2.0 -> 0.2.1).

---

## Rules

- Work on ONLY ONE item per invocation
- Record all results and metrics in state.yaml notes
- Do not mark an item complete if any failures are observed
- Fix failures before proceeding

## Max Iterations

4

## Completion

<promise>R2 REGRESSION COMPLETE</promise>
