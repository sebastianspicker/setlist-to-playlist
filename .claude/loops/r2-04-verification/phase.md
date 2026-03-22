# R2 Phase 4: Final Verification

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

Key: `phases.r2-04-verification`

## Sub-phases

| Sub-phase     | Prompt             | State key                                            |
| ------------- | ------------------ | ---------------------------------------------------- |
| 01-regression | `01-regression.md` | `phases.r2-04-verification.sub_phases.01-regression` |

## Entry Criteria

- Phase 3 (quality fixes) complete

## Exit Criteria

- Full CI green
- Tests stable
- Changelog updated

## Branch

`ralph/r2-verification`

## Rules

- Work on ONLY ONE item per invocation
- Do not skip any verification steps
- Record all results in state.yaml notes

## Completion

<promise>R2 PHASE 4 VERIFICATION COMPLETE</promise>
