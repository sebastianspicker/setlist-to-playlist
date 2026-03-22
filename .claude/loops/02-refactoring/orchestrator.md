# Phase 2 Orchestrator: Code Quality & Refactoring

This phase makes structural improvements guided by Phase 1 findings.
Every change must keep CI green.

## Entry Criteria

- Phase 1 complete with prioritized findings
- `pnpm format:check && pnpm lint && pnpm build && pnpm test` all pass
- Working branch: `ralph/02-refactoring`

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

## Between Sub-Phases

Run after each sub-phase:

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

Commit after each sub-phase with message: `refactor(<scope>): <what changed>`

## Rollback

If a sub-phase breaks tests:

1. `git stash` the changes
2. Run tests to confirm they pass without the changes
3. Identify the specific change that broke things
4. Apply a more conservative approach

## Exit Criteria

- All 5 sub-phases complete or documented as deferred
- CI fully green
- No increase in line count without justification
- Component sizes reduced (target: no component > 150 lines)

## Completion

<promise>PHASE 2 REFACTORING COMPLETE</promise>
