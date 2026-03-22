# Bug Fixing: Error Handling Gaps

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

Read `.claude/loops/state.yaml` at:
`phases.02-bugs.sub_phases.04-error-handling-gaps.items`
Find the first item with `status != complete`. Do that item.

## Items

### Item: network-failure-ux

Files: `apps/web/src/lib/fetch.ts`, `apps/web/src/features/*/` (all feature views)

Problem: When `fetch()` fails due to network error (offline, DNS failure,
timeout), what does the user actually see? Is there a clear error message
or does the UI just hang?

Action: Trace the error path from fetch failure through each layer:

1. `fetch()` throws `TypeError` for network errors
2. `fetchJson()` in `fetch.ts` — does it catch this? What does it return?
3. Feature hooks (e.g., `useSetlistImportState`) — do they handle the
   error result?
4. UI components — do they display the error to the user?

Fix any gaps: ensure every fetch failure reaches the UI with a
user-friendly message like "Network error. Please check your connection."

### Item: storage-quota-exceeded

Files: Any files using `sessionStorage` or `localStorage`

Problem: `setItem()` throws `QuotaExceededError` when storage is full.
If not caught, this crashes the app silently.

Action:

1. Search for all `sessionStorage.setItem` and `localStorage.setItem` calls
2. For each call, verify it is wrapped in try-catch
3. If not wrapped, add try-catch that logs a warning and continues
   without caching (graceful degradation)
4. The app must never crash due to storage being full

## Files to Read

- `apps/web/src/lib/fetch.ts`
- `apps/web/src/features/setlist-import/useSetlistImportState.ts`
- `apps/web/src/features/setlist-import/SetlistImportView.tsx`
- `apps/web/src/features/matching/MatchingView.tsx`
- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`
- `apps/web/src/components/ErrorBoundaryView.tsx`
- Search results for `sessionStorage` and `localStorage` across the codebase

## Rules

- Error messages shown to users must be helpful but not revealing of internals.
- Network errors should say "Network error" or similar, not expose TypeError details.
- Storage failures should be silent to the user — just log and continue.
- Run `pnpm format:check && pnpm lint && pnpm build && pnpm test` after each fix.
- If tests break, revert and take a more conservative approach.
- Update `.claude/loops/state.yaml` after each item.
- Work on ONLY ONE item per invocation.

## Max Iterations

6

## Completion

When all items are done and CI passes:

<promise>ERROR HANDLING GAPS COMPLETE</promise>
