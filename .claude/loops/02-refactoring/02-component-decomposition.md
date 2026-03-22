# Refactoring: Component Decomposition

## Ralph Loop Protocol

You are inside a Ralph Loop. The same prompt is fed every iteration via stop hook.
Your work persists in files and git history.

Every iteration:

1. Read `.claude/loops/state.yaml` — find next incomplete item in your scope
2. Do exactly ONE item of work
3. Run CI: `pnpm format:check && pnpm lint && pnpm build && pnpm test`
4. Update state.yaml (mark item complete, add notes)
5. Commit: `git add -A && git commit -m "refactor(<scope>): <desc>"`
6. Exit — stop hook re-invokes you

Emit the completion promise ONLY when your entire scope is complete.

## State

`phases.03-refactoring.sub_phases.02-component-decomposition.items`

## Audit Checklist

### Item: create-playlist-rendering-split

After hook extraction (Sub-Phase 2.1), the render logic in
CreatePlaylistView.tsx should be split:

- `PlaylistCreatedSuccess` — the success state with link and
  error-resume logic
- `PlaylistCreateForm` — the form with dedupe checkbox and
  create button
- `CreatePlaylistView` becomes a thin orchestrator choosing
  which sub-component to render

### Item: setlist-import-step-rendering

`SetlistImportView.tsx` has 3 conditional render blocks:

- Extract the matching step block into its own wrapper
- Extract the export step block into its own wrapper
- The import/preview form stays but should be cleaner
  after hook extraction

### Item: match-row-simplification

`apps/web/src/features/matching/MatchRowItem.tsx` — read this file
and determine if it can be simplified after search state is in a hook.
If it receives too many props, consider a context or compound
component pattern.

## Files to Read Before Changing

- Output of Sub-Phase 2.1 (extracted hooks)
- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`
- `apps/web/src/features/setlist-import/SetlistImportView.tsx`
- `apps/web/src/features/matching/MatchRowItem.tsx`
- `apps/web/src/features/matching/TrackSearchPanel.tsx`

## Rules

- Each extracted component goes in the same feature directory.
- Props must be typed with explicit interfaces.
- No behavior changes — purely structural.
- Run `pnpm build && pnpm test` after each extraction.
- Target: no component file > 150 lines.
- Update `.claude/loops/progress.md` after each item.
- Work on ONLY ONE component per invocation.

## Max Iterations

6

## Completion

When all components are decomposed and CI passes:

<promise>COMPONENT DECOMPOSITION COMPLETE</promise>
