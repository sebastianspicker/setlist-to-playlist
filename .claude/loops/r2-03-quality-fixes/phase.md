# R2 Phase 3: Accessibility & Code Quality Fixes

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

Key: `phases.r2-03-quality-fixes`

## Sub-phases

| Sub-phase        | Prompt                | State key                                                |
| ---------------- | --------------------- | -------------------------------------------------------- |
| 01-accessibility | `01-accessibility.md` | `phases.r2-03-quality-fixes.sub_phases.01-accessibility` |
| 02-code-patterns | `02-code-patterns.md` | `phases.r2-03-quality-fixes.sub_phases.02-code-patterns` |

## Entry Criteria

- Phase 2 (component tests) complete

## Exit Criteria

- All accessibility and code quality fixes applied
- CI green

## Branch

`ralph/r2-quality-fixes`

## Rules

- Work on ONLY ONE item per invocation
- Complete sub-phases in order: 01-accessibility, then 02-code-patterns
- Do not proceed to the next sub-phase until the current one emits its promise
- Run full CI after every change

## Completion

<promise>R2 PHASE 3 QUALITY FIXES COMPLETE</promise>
