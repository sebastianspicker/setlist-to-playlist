# Phase 8: Final Integration & Ship Review

Final verification before shipping. You are the last pair of eyes. Check everything works together.

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

Read `.claude/loops/state.yaml` at `phases.08-ship-review`.
Find the first sub-phase with `status != complete`.
Within that sub-phase, find the first item with `status != complete`.
Read the sub-phase prompt at `.claude/loops/07-final-review/{sub_phase_file}.md`.
Execute that ONE item.

## Sub-Phases

1. `01-cross-phase-consistency.md` — Check all phases work together
2. `02-regression-testing.md` — Full regression (run tests 3x for stability)
3. `03-ship-review.md` — Read every file, "would I ship this?" test
4. `04-version-changelog.md` — Version bump and CHANGELOG.md

## Entry Criteria

- All Phases 1-7 complete
- CI green on all branches

## Exit Criteria

- No inconsistencies found
- All tests pass 3x
- CHANGELOG updated
- Ship-ready

## Branch

```
ralph/08-ship-review
```

## CI Verification

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

## Rollback

If any inconsistency or regression is found, fix it in place. If a fix introduces further issues, revert and re-approach.

```bash
git revert HEAD --no-edit
```

## Completion Promise

When all sub-phases are complete and CI is green:

<promise>PHASE 8 SHIP REVIEW COMPLETE</promise>
