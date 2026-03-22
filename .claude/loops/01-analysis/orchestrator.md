# Phase 1 Orchestrator: Deep Analysis & Discovery

This phase is READ-ONLY. Do not modify any source files. The goal is to produce
a detailed findings report that drives Phases 2-7.

## Entry Criteria

- Baseline CI passes (format, lint, build, test, audit)
- `.claude/loops/progress.md` initialized with baseline metrics

## Sub-Phase Order

1. `01-static-analysis.md` — TypeScript strict mode findings, dead code, unused exports
2. `02-dependency-graph.md` — Package dependency validation, circular import check
3. `03-test-coverage-gaps.md` — Map tested vs untested code paths
4. `04-performance-profiling.md` — Bundle size, re-render risks, lazy load candidates

Each sub-phase writes findings to `.claude/loops/progress.md` under `## Phase 1 Findings`.

## Exit Criteria

- All 4 sub-phases complete
- Findings categorized by priority (P0-critical, P1-high, P2-medium, P3-low)
- Each finding assigned to a target phase (2-6)
- No source files modified

## Between Sub-Phases

After each sub-phase, verify no files were accidentally modified:
`git status` should show no changes to tracked files (only progress.md and loop files).

## Completion

<promise>PHASE 1 ANALYSIS COMPLETE</promise>
