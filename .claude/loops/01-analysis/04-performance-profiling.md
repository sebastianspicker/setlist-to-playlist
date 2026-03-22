# Analysis: Performance Profiling Opportunities

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

`phases.01-analysis.sub_phases.04-performance-profiling.items`

You are identifying performance improvement opportunities. Do NOT modify files.

## Scope

### Item: bundle-analysis

- Check next.config.ts for code splitting, dynamic imports
- Identify large client-side modules that could be lazy loaded
- Check if MusicKit script loading (`beforeInteractive`) is optimal
- Look for barrel imports that pull in unnecessary code
  (e.g., `import { X } from '@repo/core'` when X is one small function)

### Item: react-rerender-risks

- `SetlistImportView.tsx` manages step state + import state +
  matchRows — identify unnecessary re-renders
- `MatchingView.tsx` passes search state to all MatchRowItem
  children — only the active row needs search state
- `useMatchingSuggestions.ts` runs sequential API calls in a loop —
  could benefit from batching or concurrency
- `CreatePlaylistView.tsx` has 7 useState calls — potential for useReducer

### Item: network-caching

- Client-side search cache in catalog.ts — check eviction strategy
- setlist.fm proxy cache in setlistfm.ts — 200 entry cap, TTL behavior
- Token caching in token.ts — check for race conditions during refresh
- HTTP cache headers on API responses (Cache-Control)

### Item: css-rendering

- Single globals.css file — check if critical CSS could be extracted
- Multiple inline style objects in components (mainContainerStyle, etc.)
  cause new object allocation on each render
- backdrop-filter: blur(12px) can cause performance issues on low-end devices

## Files to Read

- `apps/web/next.config.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/features/setlist-import/SetlistImportView.tsx`
- `apps/web/src/features/matching/MatchingView.tsx`
- `apps/web/src/features/matching/useMatchingSuggestions.ts`
- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`
- `apps/web/src/lib/musickit/catalog.ts`
- `apps/api/src/lib/setlistfm.ts`
- `apps/web/src/lib/musickit/token.ts`
- `apps/web/src/styles/globals.css`
- `apps/web/src/lib/styles.ts`

## Rules

- READ ONLY. Do not modify any file.
- Quantify impact where possible (e.g., "7 useState calls in
  CreatePlaylistView could be 1 useReducer with 3 actions").
- Distinguish between measured problems and theoretical concerns.
- Update `.claude/loops/progress.md`.
- Work on ONE category per invocation.

## Max Iterations

6

## Completion

When all performance opportunities documented:

<promise>PERFORMANCE PROFILING COMPLETE</promise>
