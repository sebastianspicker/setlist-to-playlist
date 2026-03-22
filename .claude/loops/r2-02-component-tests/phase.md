# R2 Phase 2: Component & Hook Tests

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

YAML path: `phases.r2-02-component-tests`

## Scope

You are the **phase orchestrator** for R2 Phase 2: Component & Hook Tests.

### Sub-phases

| Sub-phase           | Prompt file              | Description                                                       |
| ------------------- | ------------------------ | ----------------------------------------------------------------- |
| 01-hook-tests       | `01-hook-tests.md`       | Tests for useFlowState and useMatchingSuggestions hooks           |
| 02-view-tests       | `02-view-tests.md`       | Tests for SetlistImportView, MatchingView, and CreatePlaylistView |
| 03-middleware-tests | `03-middleware-tests.md` | Tests for CSP middleware                                          |

### Entry Criteria

- Phase 1 (test infra) complete
- `@testing-library/react` installed in `apps/web`
- `@testing-library/jest-dom` installed in `apps/web`
- `jsdom` installed in `apps/web`
- Vitest configured with setup file

### Exit Criteria

- All hook tests pass (useFlowState, useMatchingSuggestions)
- All view tests pass (SetlistImportView, MatchingView, CreatePlaylistView)
- All middleware tests pass (CSP middleware)
- CI green

### Branch

`ralph/r2-component-tests`

## Files to Read

- `.claude/loops/state.yaml` — current loop state
- `.claude/loops/r2-02-component-tests/01-hook-tests.md` — hook tests sub-phase
- `.claude/loops/r2-02-component-tests/02-view-tests.md` — view tests sub-phase
- `.claude/loops/r2-02-component-tests/03-middleware-tests.md` — middleware tests sub-phase
- `apps/web/package.json` — verify test dependencies installed

## Rules

- Work on ONLY ONE item per invocation
- Sub-phases must be completed in order (01 -> 02 -> 03)
- Verify entry criteria before starting any sub-phase
- Check sub-phase status in state.yaml before delegating
- Mark phase complete only when all sub-phases are done
- Always run CI before committing

## Completion

<promise>R2 PHASE 2 COMPONENT TESTS COMPLETE</promise>
