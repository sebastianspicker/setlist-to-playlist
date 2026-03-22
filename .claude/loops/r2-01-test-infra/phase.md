# R2 Phase 1: Testing Infrastructure

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

YAML path: `phases.r2-01-test-infra`

## Scope

You are the **phase orchestrator** for R2 Phase 1: Testing Infrastructure.

### Sub-phases

| Sub-phase       | Prompt file          | Description                                               |
| --------------- | -------------------- | --------------------------------------------------------- |
| 01-install-deps | `01-install-deps.md` | Install testing libraries, configure vitest, verify setup |

### Entry Criteria

- CI green (all existing tests pass, build succeeds)

### Exit Criteria

- `@testing-library/react` + `jsdom` installed in `apps/web` devDependencies
- `@testing-library/jest-dom` installed in `apps/web` devDependencies
- Vitest configured with setup file for jest-dom matchers
- Minimal render test passes using `@testing-library/react`

### Branch

`ralph/r2-test-infra`

## Files to Read

- `.claude/loops/state.yaml` — current loop state
- `.claude/loops/r2-01-test-infra/01-install-deps.md` — sub-phase prompt
- `apps/web/package.json` — current web app dependencies
- `apps/web/vitest.config.ts` — current vitest configuration

## Rules

- Work on ONLY ONE item per invocation
- Check sub-phase status in state.yaml before delegating
- Verify entry criteria before starting any sub-phase
- Mark phase complete only when all sub-phases are done
- Always run CI before committing

## Completion

<promise>R2 PHASE 1 TEST INFRA COMPLETE</promise>
