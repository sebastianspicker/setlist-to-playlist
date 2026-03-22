# Refactoring: Unify Repeated Patterns

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

`phases.03-refactoring.sub_phases.03-pattern-unification.items`

## Audit Checklist

### Item: state-reset-patterns

Multiple places reset search/error state with identical sequences:

- MatchingView.openSearch: setSearchQuery(''), setSearchResults([]),
  setSearchError(false)
- MatchingView.chooseTrack: same reset
- MatchingView.skipTrack: same conditional reset
  After hook extraction, ensure the hook encapsulates the reset into
  a single `resetSearch()` method.

### Item: error-handling-pattern

Every async action follows: setError(null) -> setLoading(true) ->
try/catch -> setLoading(false). This is the pattern in:

- CreatePlaylistView.handleCreate
- CreatePlaylistView.handleAddRemainingTracks
- useSetlistImportState.loadSetlist
  Check if `apps/web/src/hooks/useAsyncAction.ts` already provides this.
  If so, refactor to use it consistently. If not, extend it.

### Item: musickit-api-response-parsing

Both catalog.ts and playlist.ts have identical error-checking code
for MusicKit API responses. This appears multiple times across 2 files.
Extract into a shared `throwIfMusicKitError(res, context)` helper
in the `musickit/` directory.

### Item: cache-eviction-pattern

`apps/api/src/lib/setlistfm.ts` and `apps/web/src/lib/musickit/catalog.ts`
both implement nearly identical Map-based cache-with-TTL-and-eviction.
Extract a generic `TTLCache<T>` class or factory function into
`packages/shared/src/utils/` or `apps/web/src/lib/cache.ts`.

### Item: storage-read-write-pattern

`CreatePlaylistView.tsx` has readResume/writeResume and
`useSetlistImportState.ts` has readHistory/writeHistory.
Both follow: check typeof window -> try/catch -> parse/stringify ->
validate shape. Consider a `safeStorage<T>(key, validator)` utility.

## Files to Read

- `apps/web/src/features/matching/MatchingView.tsx`
- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`
- `apps/web/src/features/setlist-import/useSetlistImportState.ts`
- `apps/web/src/hooks/useAsyncAction.ts`
- `apps/web/src/lib/musickit/catalog.ts`
- `apps/web/src/lib/musickit/playlist.ts`
- `apps/api/src/lib/setlistfm.ts`

## Rules

- Extract shared logic into the lowest appropriate package/directory.
- Cache utility: if used by both apps/api and apps/web, put in packages/shared.
  If only in web, keep in apps/web/src/lib.
- MusicKit helpers stay in apps/web/src/lib/musickit/.
- Storage helpers stay in apps/web/src/lib/.
- Run `pnpm build && pnpm test` after each unification.
- Update `.claude/loops/progress.md` after each item.
- Work on ONLY ONE pattern per invocation.

## Max Iterations

8

## Completion

When all patterns unified and CI passes:

<promise>PATTERN UNIFICATION COMPLETE</promise>
