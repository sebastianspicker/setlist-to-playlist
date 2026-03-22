# Phase 8: Final Integration & Ship Review

## Ralph Loop Protocol

You are inside a Ralph Loop. The same prompt is fed every iteration via stop hook.
Your work persists in files and git history.

Every iteration:

1. Read `.claude/loops/state.yaml` — find next incomplete item in your scope
2. Do exactly ONE item of work
3. Run CI: `pnpm format:check && pnpm lint && pnpm build && pnpm test`
4. Update state.yaml (mark item complete, add notes)
5. Commit: `git add -A && git commit -m "chore(<scope>): <desc>"`
6. Exit — stop hook re-invokes you

Emit the completion promise ONLY when your entire scope is complete.

## State

Read `.claude/loops/state.yaml` at `phases.08-ship-review`.
Find the first sub-phase with `status != complete`.
Within that sub-phase, find the first item with `status != complete`.
Read the sub-phase prompt at `.claude/loops/07-final-review/{sub_phase_file}.md`.
Execute that ONE item.

**NOTE**: Sub-phase prompt files are in `07-final-review/` (old directory numbering).

## Description

This is the final phase. You are the last pair of eyes before this ships.
Verify everything works together, run full regression, and prepare for release.

## Sub-Phase Order

1. `../07-final-review/01-cross-phase-consistency.md` — Check all phases work together
2. `../07-final-review/02-regression-testing.md` — Run full regression (3x for stability)
3. `../07-final-review/03-ship-review.md` — Read every file, "would I ship this?" test
4. `../07-final-review/04-version-changelog.md` — Version bump and CHANGELOG.md

## Entry Criteria

- All Phases 1-7 complete
- CI fully green on all branches
- Working branch: `ralph/08-ship-review`

## Exit Criteria

- No inconsistencies between phases
- All tests pass (run 3x for stability)
- CHANGELOG.md updated
- Version bumped appropriately
- Repository is ship-ready

## Completion

<promise>PHASE 8 SHIP REVIEW COMPLETE</promise>
