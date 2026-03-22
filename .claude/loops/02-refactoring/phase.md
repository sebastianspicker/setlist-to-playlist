# Phase 3: Code Quality & Refactoring

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

This phase makes structural improvements guided by Phase 1 findings. Every
change must keep CI green. The focus is on reducing complexity, improving
readability, and modernizing patterns — NOT fixing bugs (Phase 2) or
adding features.

## Entry Criteria

- Phase 2 (bugs) complete
- `pnpm format:check && pnpm lint && pnpm build && pnpm test` all pass
- Working branch: `ralph/03-refactoring`

## Sub-Phase Order (dependency-driven)

1. `01-extract-hooks.md` — Extract complex state into custom hooks
   (prerequisite for component decomposition)
2. `02-component-decomposition.md` — Reduce component sizes using
   extracted hooks
3. `03-pattern-unification.md` — Unify repeated patterns across codebase
4. `04-type-strengthening.md` — Improve type safety (can run after
   patterns are unified)
5. `05-modernize-patterns.md` — React 19 / Next.js 16 features
   (run last as it may change APIs)

## State

Read `.claude/loops/state.yaml` at `phases.03-refactoring`.
Find the first sub-phase with `status != complete`.
Within that sub-phase, find the first item with `status != complete`.
Read the sub-phase prompt at `.claude/loops/02-refactoring/{sub_phase_file}.md`.
Execute that ONE item.

## Between Sub-Phases

Run after each sub-phase:

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

Commit after each sub-phase with message: `refactor(<scope>): <what changed>`

Verify component sizes remain within target:

```bash
# No component file should exceed 150 lines
wc -l apps/web/src/components/**/*.tsx apps/web/src/features/**/*.tsx
```

## Rollback

If a sub-phase breaks tests:

1. `git stash` the changes
2. Run tests to confirm they pass without the changes
3. Identify the specific change that broke things
4. Apply a more conservative approach
5. If the refactor is too risky, mark it as deferred in state.yaml
   with justification

## Branch

`ralph/03-refactoring`

Commit format: `refactor(<scope>): <what changed>`

## Exit Criteria

- All 5 sub-phases complete or documented as deferred with justification
- CI fully green (`pnpm format:check && pnpm lint && pnpm build && pnpm test`)
- No component exceeds 150 lines
- No increase in total line count without justification

## Completion

<promise>PHASE 3 REFACTORING COMPLETE</promise>
