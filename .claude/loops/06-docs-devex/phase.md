# Phase 7: Documentation & Developer Experience

Updates documentation to reflect all changes from Phases 2-6. Ensures docs are accurate, complete, and helpful.

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

Read `.claude/loops/state.yaml` at `phases.07-docs-devex`.
Find the first sub-phase with `status != complete`.
Within that sub-phase, find the first item with `status != complete`.
Read the sub-phase prompt at `.claude/loops/06-docs-devex/{sub_phase_file}.md`.
Execute that ONE item.

## Sub-Phases

1. `01-api-docs.md` — Route documentation, error responses, authentication
2. `02-contributing-guide.md` — CONTRIBUTING.md accuracy, AGENTS.md updates
3. `03-architecture-diagrams.md` — ARCHITECTURE.md, dependency diagrams, data flow
4. `04-onboarding-experience.md` — Clone-to-running verification, README quickstart

## Entry Criteria

- Phase 6 complete
- CI passes on current branch

## Exit Criteria

- Docs accurately reflect current code
- No stale references

## Branch

```
ralph/07-docs-devex
```

## CI Verification

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

## Rollback

If a doc change introduces inaccuracies or breaks formatting, revert and correct.

```bash
git revert HEAD --no-edit
```

## Completion Promise

When all sub-phases are complete and CI is green:

<promise>PHASE 7 DOCS DEVEX COMPLETE</promise>
