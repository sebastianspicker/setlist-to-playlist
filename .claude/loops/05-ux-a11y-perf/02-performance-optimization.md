# UX: Performance Optimization

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

`phases.06-ux-a11y-perf.sub_phases.02-performance.items`

You are optimizing bundle size, load performance, and runtime efficiency.
Work through items ONE AT A TIME.

## Audit Checklist

### Item: bundle-analysis

**Bundle Analysis**

- Run `pnpm build` and examine the output size
- Check if next-bundle-analyzer is available (if not, consider adding)
- Identify the largest chunks
- Check if @repo/core and @repo/shared are tree-shaken properly

### Item: dynamic-imports

**Dynamic Imports / Code Splitting**

- `MatchingView` and `CreatePlaylistView` are only needed after
  step transitions — could use `next/dynamic` with loading states
- MusicKit initialization is only needed at the matching step —
  ensure it does not block initial page load
- Check if `jose` (JWT signing) is only in server bundles

### Item: image-optimization

**Image Optimization**

- Check if any images in the app use `<img>` instead of `next/image`
- Check manifest.webmanifest for icon paths and sizes

### Item: memoization

**Memoization Opportunities**

- `MatchRowItem` receives many props — should it use React.memo?
- Filter operations in CreatePlaylistView run on every render —
  extract to useMemo
- Check if callback functions passed as props cause unnecessary
  re-renders

### Item: network-optimization

**Network Optimization**

- MusicKit script is `beforeInteractive` — is this necessary?
  Could be `afterInteractive` since it is only needed when user
  reaches matching step
- Are API responses compressed? Next.js handles this by default
  but verify

## Files to Read

- `apps/web/next.config.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/features/setlist-import/SetlistImportView.tsx`
- `apps/web/src/features/matching/MatchRowItem.tsx`
- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`

## Rules

- Measure before optimizing — document before/after bundle sizes
- Do not prematurely optimize — focus on measurable wins
- Dynamic imports should have appropriate loading fallbacks
- Run full CI after changes
- Update `.claude/loops/progress.md` with measurements
- Work on ONLY ONE optimization per invocation

## Max Iterations

8

## Completion

When performance optimizations applied and CI passes:

<promise>PERFORMANCE OPTIMIZATION COMPLETE</promise>
