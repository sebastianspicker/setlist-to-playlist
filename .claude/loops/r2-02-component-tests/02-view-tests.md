# R2: View Component Tests

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

YAML path: `phases.r2-02-component-tests.sub_phases.02-view-tests.items`

## Items

### Item: setlist-import-view-tests

- File to test: `apps/web/src/features/setlist-import/SetlistImportView.tsx`
- Test file: `apps/web/tests/components/setlist-import-view.test.tsx`
- Add `// @vitest-environment jsdom` directive at top of test file
- Mock: `useSetlistImportState`, `useFlowState`, dynamic imports (MatchingView, CreatePlaylistView)
- Test scenarios:
  - Renders input and submit button
  - Form submission calls loadSetlist
  - Error displayed via ErrorAlert
  - Loading state shown
- NOTE: Mock the hooks rather than testing integration -- keep tests focused on the view component

### Item: matching-view-tests

- File to test: `apps/web/src/features/matching/MatchingView.tsx`
- Test file: `apps/web/tests/components/matching-view.test.tsx`
- Add `// @vitest-environment jsdom` directive at top of test file
- Mock: `useMatchingSuggestions`, `useTrackSearch`
- Test scenarios:
  - Renders track list
  - Shows suggestion loading state
  - Shows proceed button (disabled when no matches, enabled when has matches)
  - Bulk actions call correct handlers

### Item: create-playlist-view-tests

- File to test: `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`
- Test file: `apps/web/tests/components/create-playlist-view.test.tsx`
- Add `// @vitest-environment jsdom` directive at top of test file
- Mock: `useCreatePlaylistState`
- Test scenarios:
  - Renders track count
  - Shows auth prompt when needsAuth
  - Shows create button when authorized
  - Shows success panel when created
  - Shows error via ErrorAlert

## Files to Read

- `.claude/loops/state.yaml` — current loop state
- `apps/web/src/features/setlist-import/SetlistImportView.tsx` — component implementation
- `apps/web/src/features/setlist-import/useSetlistImportState.ts` — hook to mock
- `apps/web/src/features/setlist-import/useFlowState.ts` — hook to mock
- `apps/web/src/features/matching/MatchingView.tsx` — component implementation
- `apps/web/src/features/matching/useMatchingSuggestions.ts` — hook to mock
- `apps/web/src/features/matching/useTrackSearch.ts` — hook to mock
- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx` — component implementation
- `apps/web/src/features/playlist-export/useCreatePlaylistState.ts` — hook to mock
- `apps/web/src/components/ErrorBoundaryView.tsx` — ErrorAlert component
- `apps/web/vitest.config.ts` — vitest configuration
- `apps/web/tsconfig.json` — path aliases for mocking

## Rules

- Work on ONLY ONE item per invocation
- Items must be completed in order (setlist-import-view-tests -> matching-view-tests -> create-playlist-view-tests)
- Use `// @vitest-environment jsdom` directive instead of global environment config
- Mock hooks and external dependencies; do not test integration
- Use `render` and `screen` from `@testing-library/react`
- Use `userEvent` from `@testing-library/user-event` for interactions where needed
- Use jest-dom matchers (e.g., `toBeInTheDocument`, `toBeDisabled`)
- Always run CI before committing

## Max Iterations

10

## Completion

<promise>R2 VIEW TESTS COMPLETE</promise>
