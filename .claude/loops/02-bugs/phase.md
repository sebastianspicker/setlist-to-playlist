# Phase 2: Bug Fixing & Issue Resolution

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

This phase fixes real bugs discovered in Phase 1 analysis and previous
audit rounds. It addresses bugs that could affect users — NOT code
quality issues (those belong in Phase 3: Refactoring).

The focus is correctness: broken behavior, silent failures, data loss
risks, and error-handling gaps that leave users with no feedback.

## Entry Criteria

- Phase 1 analysis complete with bug findings documented
- `pnpm format:check && pnpm lint && pnpm build && pnpm test` all pass
- Working branch: `ralph/02-bugs`

## Sub-Phase Order (severity-driven)

1. `01-p0-p1-fixes.md` — Critical bugs: MusicKit init promise leak,
   playlist error-after-success verification
2. `02-type-safety-fixes.md` — Unsafe type assertions that can cause
   silent runtime failures
3. `03-logic-errors.md` — Concurrency bugs, cache eviction races
4. `04-error-handling-gaps.md` — Missing error feedback, unhandled
   storage quota errors

## Between Sub-Phases

Run after each sub-phase:

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

Commit after each sub-phase with message: `fix(<scope>): <what changed>`

## Rollback

If a fix breaks tests:

1. `git stash` the changes
2. Run tests to confirm they pass without the changes
3. Identify the specific change that broke things
4. Apply a more conservative approach

## State

Read `.claude/loops/state.yaml` at:
`phases.02-bugs`
Find the first sub-phase with `status != complete`. Run that sub-phase's
prompt file.

## Exit Criteria

- All P0/P1 bugs fixed
- All P2 bugs fixed or deferred with justification
- CI fully green (`pnpm format:check && pnpm lint && pnpm build && pnpm test`)
- No regressions introduced (test count >= baseline)

## Completion

<promise>PHASE 2 BUGS COMPLETE</promise>
