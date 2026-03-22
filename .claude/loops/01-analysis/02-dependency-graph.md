# Analysis: Architecture & Dependency Graph

## Ralph Loop Protocol

You are inside a Ralph Loop. The same prompt is fed every iteration via stop hook.
Your work persists in files and git history.

Every iteration:

1. Read `.claude/loops/state.yaml` — find next incomplete item in your scope
2. Do exactly ONE item of work (this is a READ-ONLY phase — only update state.yaml)
3. Update state.yaml (mark item complete, add notes)
4. Exit — stop hook re-invokes you

Emit the completion promise ONLY when your entire scope is complete.

## State

`phases.01-analysis.sub_phases.02-dependency-graph.items`

You are validating the dependency graph and architecture of this monorepo.
Do NOT modify any files.

## Scope

### Item: package-dependency-direction

Expected dependency direction (verify this holds):

- `packages/core` imports nothing from apps/ or other packages
- `packages/shared` imports nothing from apps/ or core
- `packages/ui` imports nothing from apps/ (may import shared)
- `apps/api` imports from `packages/core` and `packages/shared`
- `apps/web` imports from all packages and `apps/api`

For each package, trace all import statements and verify no circular
or backwards dependencies exist.

### Item: internal-external-boundary

- Are there places where `apps/web` directly calls setlist.fm or
  Apple Music APIs that should go through `packages/core` or `apps/api`?
- Does `apps/web` duplicate logic already in `apps/api`?
- Check for redundant files or unused re-exports

### Item: feature-boundary-validation

- Each feature in `apps/web/src/features/` should be self-contained
- Check for cross-feature imports (matching importing from playlist-export, etc.)
- Check if components/ are truly shared or belong in a specific feature

### Item: barrel-export-analysis

- Check index.ts barrel files: do they re-export everything or are they selective?
- Are there deep imports that bypass barrel files?
- Does the barrel export pattern create any issues for tree-shaking?

## Files to Read

- Every package.json in the workspace
- Every index.ts barrel file
- Every tsconfig.json for path aliases
- Import statements across all source files

## Rules

- READ ONLY. Do not modify any file.
- Draw an ASCII dependency graph in findings.
- Flag violations with severity.
- Update `.claude/loops/progress.md` after each item.
- Work on ONE category per invocation.

## Max Iterations

6

## Completion

When dependency graph is fully validated and documented:

<promise>DEPENDENCY GRAPH ANALYSIS COMPLETE</promise>
