# Refactoring: Extract Complex State into Custom Hooks

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

`phases.03-refactoring.sub_phases.01-extract-hooks.items`

## Audit Checklist

### Item: create-playlist-state-extraction

File: `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`

Currently has 7 useState calls:

- loading, error, created, needsAuth, addTracksError, dedupeTracks, resumeState

Extract into `useCreatePlaylistState(setlist, matchRows)` that returns:

- State: { loading, error, created, needsAuth, addTracksError,
  dedupeTracks, resumeState, songIds, selectedSongIds, dedupeSavings }
- Actions: { handleCreate, handleAddRemainingTracks, handleAuthorized,
  setDedupeTracks }

Target file: `apps/web/src/features/playlist-export/useCreatePlaylistState.ts`

Keep the resume logic (readResume, writeResume, resumeKey) as-is —
they are pure functions already well-separated.

### Item: matching-search-state-extraction

File: `apps/web/src/features/matching/MatchingView.tsx`

Currently has 5 search-related useState calls:

- searchingIndex, searchQuery, searchResults, searching, searchError

Extract into `useTrackSearch()` that returns:

- State: { searchingIndex, searchQuery, searchResults, searching, searchError }
- Actions: { openSearch, runSearch, chooseTrack, skipTrack, setSearchQuery }

The hook needs setMatch from useMatchingSuggestions — pass it as parameter
or use a callback pattern.

Target file: `apps/web/src/features/matching/useTrackSearch.ts`

### Item: setlist-import-step-machine

File: `apps/web/src/features/setlist-import/SetlistImportView.tsx`

The step state combined with conditional rendering creates an implicit
state machine. Consider:

- The `step` + `setlist` + `matchRows` combination determines what renders
- Transitions: import->preview (on successful load), preview->matching
  (on button click), matching->export (on proceed), export->matching (back)
- This is a candidate for useReducer with typed actions

Target: Either a useReducer in SetlistImportView or a separate
`useFlowState()` hook.

## Files to Read Before Changing

- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`
- `apps/web/src/features/matching/MatchingView.tsx`
- `apps/web/src/features/matching/useMatchingSuggestions.ts`
- `apps/web/src/features/setlist-import/SetlistImportView.tsx`
- `apps/web/src/features/setlist-import/useSetlistImportState.ts`
- `apps/web/src/hooks/useAsyncAction.ts` (existing hook pattern to follow)

## Rules

- Read the full file before extracting.
- Preserve exact behavior — no functional changes.
- Run `pnpm build && pnpm test` after each extraction.
- If tests break, revert and take a more conservative approach.
- The extracted hook must have explicit TypeScript return type.
- Update `.claude/loops/progress.md` after each item.
- Work on ONLY ONE extraction per invocation.

## Max Iterations

6

## Completion

When all 3 extractions are done and CI passes:

<promise>HOOK EXTRACTION COMPLETE</promise>
