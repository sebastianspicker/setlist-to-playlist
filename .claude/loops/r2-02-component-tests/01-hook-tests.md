# R2: Hook Tests

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

YAML path: `phases.r2-02-component-tests.sub_phases.01-hook-tests.items`

## Items

### Item: use-flow-state-tests

- File to test: `apps/web/src/features/setlist-import/useFlowState.ts`
- Test file: `apps/web/tests/hooks/use-flow-state.test.ts`
- Add `// @vitest-environment jsdom` directive at top of test file
- Use `renderHook` from `@testing-library/react`
- Test scenarios:
  - Initial state is "import", matchRows is null
  - goToPreview sets step to "preview"
  - goToMatching sets step to "matching"
  - goToExport(rows) sets step to "export" and stores matchRows
  - goBackToPreview sets step to "preview"
  - goBackToMatching sets step to "matching"

### Item: use-matching-suggestions-tests

- File to test: `apps/web/src/features/matching/useMatchingSuggestions.ts`
- Test file: `apps/web/tests/hooks/use-matching-suggestions.test.ts`
- Add `// @vitest-environment jsdom` directive at top of test file
- Mock: `@/lib/musickit` (searchCatalog), `@repo/core` (flattenSetlistToEntries, buildSearchQuery, getSetlistSignature)
- Test scenarios:
  - Initial state has loadingSuggestions true
  - autoMatchAll calls searchCatalog for each entry in batches of 5
  - setMatch(index, track) updates specific row
  - skipUnmatched marks all unmatched rows as skipped
  - resetMatches clears all matches back to initial state
  - Stale-run detection: new autoMatchAll call invalidates previous

## Files to Read

- `.claude/loops/state.yaml` — current loop state
- `apps/web/src/features/setlist-import/useFlowState.ts` — hook implementation
- `apps/web/src/features/matching/useMatchingSuggestions.ts` — hook implementation
- `apps/web/src/features/matching/MatchRowItem.tsx` — MatchRow type definition
- `apps/web/src/lib/musickit/catalog.ts` — searchCatalog function
- `packages/core/src/setlist/mapper.ts` — flattenSetlistToEntries
- `packages/core/src/matching/search-query.ts` — buildSearchQuery
- `apps/web/vitest.config.ts` — vitest configuration
- `apps/web/tsconfig.json` — path aliases for mocking

## Rules

- Work on ONLY ONE item per invocation
- Items must be completed in order (use-flow-state-tests -> use-matching-suggestions-tests)
- Use `// @vitest-environment jsdom` directive instead of global environment config
- Mock external dependencies; do not make real API calls
- Use `renderHook` from `@testing-library/react` for hook testing
- Use `act` from `@testing-library/react` when calling hook methods that trigger state updates
- Always run CI before committing

## Max Iterations

8

## Completion

<promise>R2 HOOK TESTS COMPLETE</promise>
