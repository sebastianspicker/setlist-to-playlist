# Testing: Component & Hook Tests

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

Read state.yaml at `phases.05-testing.sub_phases.03-component-hook-tests.items`

## Items

### Item: musickit-client-tests

- File to test: `apps/web/src/lib/musickit/client.ts`
- Test file: `apps/web/tests/musickit-client.test.ts`
- Test scenarios:
  - `initMusicKit()` first call -> loads script, configures, returns instance
  - `initMusicKit()` second call -> returns cached instance (no reconfigure)
  - `initMusicKit()` when `MusicKit.configure()` fails -> resets promise, throws error
  - `initMusicKit()` after failed init -> re-attempts configuration (promise was reset)
  - `initMusicKit()` concurrent calls -> only configures once (promise deduplication)
  - Script load timeout (10-second timeout scenario)
- Mock: MusicKit global, script element creation, document.head.appendChild

### Item: matching-view-tests

- File to test: `apps/web/src/features/matching/MatchingView.tsx`
- Test file: `apps/web/tests/components/matching-view.test.tsx`
- Test scenarios:
  - Renders track list from matchRows prop
  - Shows "no matches" state when all rows are unmatched
  - Calls onProceed callback when proceed button is clicked
  - Individual row interactions (skip, search)
- Need @testing-library/react — check if already installed, install if not

### Item: create-playlist-view-tests

- File to test: `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`
- Test file: `apps/web/tests/components/create-playlist-view.test.tsx`
- Test scenarios:
  - Renders playlist name and track count
  - Shows "Connect Apple Music" prompt when not authorized
  - Calls create handler with correct arguments
  - Shows error state on creation failure
  - Shows success state after creation

### Item: setlist-import-view-tests

- File to test: `apps/web/src/features/setlist-import/SetlistImportView.tsx`
- Test file: `apps/web/tests/components/setlist-import-view.test.tsx`
- Test scenarios:
  - Renders input field and load button
  - Submitting form triggers setlist load
  - Shows SetlistPreview after successful load
  - Shows error message on failed load
  - Loading state shown during fetch

### Item: use-matching-suggestions-tests

- File to test: `apps/web/src/features/matching/useMatchingSuggestions.ts`
- Test file: `apps/web/tests/hooks/use-matching-suggestions.test.ts`
- Use @testing-library/react-hooks or renderHook from @testing-library/react
- Test scenarios:
  - autoMatchAll batches search calls correctly
  - setMatch updates a specific row
  - skipTrack marks row as skipped
  - resetAll clears all matches
  - Stale run detection (useRef run ID pattern)

### Item: use-flow-state-tests

- File to test: `apps/web/src/features/setlist-import/useFlowState.ts`
- Test file: `apps/web/tests/hooks/use-flow-state.test.ts`
- Test scenarios:
  - Initial state is "import"
  - Forward transitions: import -> preview -> matching -> export
  - Back navigation: export -> matching, matching -> preview
  - Cannot go back from "import" step
  - Invalid transitions are rejected or no-ops

## Rules

- Follow existing test patterns in apps/web/tests/ (describe/it, vi.mock, beforeEach/afterEach)
- Tests must be deterministic — no network calls, no timing dependencies
- Mock external dependencies (fetch, MusicKit, window globals)
- Run `pnpm test` after writing each test file
- Update state.yaml after each item
- Work on ONLY ONE test file per invocation

## Max Iterations

10

## Completion

When all component and hook tests are written and passing:

<promise>COMPONENT HOOK TESTS COMPLETE</promise>
