# Phase 1: Analysis & Discovery

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

This phase is READ-ONLY. Do not modify any source files. The goal is to
produce a detailed findings report that drives Phases 2-8. Every sub-phase
writes findings to `.claude/loops/progress.md` under `## Phase 1 Findings`.

## Entry Criteria

- Baseline CI passes (`pnpm format:check && pnpm lint && pnpm build && pnpm test`)
- `.claude/loops/state.yaml` initialized with phase structure
- No prerequisite phases

## Sub-Phase Order

1. `01-static-analysis.md` — TypeScript strict mode findings, dead code, unused exports
2. `02-dependency-graph.md` — Package dependency validation, circular import check
3. `03-test-coverage-gaps.md` — Map tested vs untested code paths
4. `04-performance-profiling.md` — Bundle size, re-render risks, lazy load candidates
5. `05-bug-discovery.md` — Trace user flows and error paths for bugs

## State

Read `.claude/loops/state.yaml` at `phases.01-analysis`.
Find the first sub-phase with `status != complete`.
Within that sub-phase, find the first item with `status != complete`.
Read the sub-phase prompt at `.claude/loops/01-analysis/{sub_phase_file}.md`.
Execute that ONE item.

## Between Sub-Phases

After each sub-phase, verify no source files were accidentally modified:

```bash
git status
```

Should show no changes to tracked source files — only `state.yaml`,
`progress.md`, and loop files may be modified.

Run CI to confirm the codebase remains untouched:

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

## Rollback

This phase is read-only, so rollback should not be necessary. If state.yaml
or progress.md become corrupted:

1. Check `git log` for the last known-good commit
2. `git checkout <commit> -- .claude/loops/state.yaml .claude/loops/progress.md`
3. Resume from the restored state

If any source files were accidentally modified:

1. `git checkout -- <file>` to restore the original
2. Note the accidental modification in state.yaml as a warning
3. Continue with the current sub-phase

## Branch

None. This phase is read-only and operates on whatever branch is current.
`git status` should show no changes to tracked source files.

## Exit Criteria

- All 5 sub-phases complete
- Findings categorized by priority (P0-critical, P1-high, P2-medium, P3-low)
- Each finding assigned to a target phase (2-8)
- No source files modified (verified via `git status`)

## Completion

<promise>PHASE 1 ANALYSIS COMPLETE</promise>
