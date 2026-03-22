# R2: Code Pattern Fixes

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

Key: `phases.r2-03-quality-fixes.sub_phases.02-code-patterns.items`

---

### Item: async-action-cleanup

- **File:** `apps/web/src/hooks/useAsyncAction.ts`
- **Problem:** Line has `.then((value) => value)` which is redundant -- it returns the same value that the promise already resolves to.
- **Fix:** Remove the `.then((value) => value)` call. The promise result is already the correct type.
- **Notes:** Read the file first to understand the full context before editing.

---

### Item: search-ref-pattern

- **File:** `apps/web/src/features/matching/useTrackSearch.ts`
- **Problem:** `searchQueryRef.current = searchQuery;` is set directly in the component body (outside useEffect). While this works in practice, it's against React's recommended patterns -- refs should be updated in effects or event handlers, not during render.
- **Fix:** Wrap in a `useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);`
- **Notes:** Be careful: this changes timing slightly. The ref update will happen after render instead of during. Verify that `runSearch` still reads the correct value.

---

### Item: musickit-timeout-guard

- **File:** `apps/web/src/lib/musickit/client.ts`
- **Problem:** In `waitForMusicKit()`, the `setInterval` callback and `setTimeout` callback can both fire in edge cases. If MusicKit appears at exactly the 10-second mark, both the resolve and reject could theoretically fire (though in practice JS event loop prevents this).
- **Fix:** Add a `let settled = false;` flag. In both the interval callback and timeout callback, check `if (settled) return;` before resolving/rejecting, then set `settled = true`.
- **Notes:** This is a defensive fix -- unlikely to cause real bugs but makes the code more robust.

---

### Item: missing-barrel-exports

- **Files:** `apps/web/src/components/index.ts` (if it exists), feature index files
- **Problem:** `FlowStepIndicator` is not exported from the components barrel. Some feature-level props types are not exported.
- **Fix:** If `components/index.ts` exists, add `export { FlowStepIndicator } from './FlowStepIndicator';`. If not, this is a non-issue since components are imported directly.
- **Notes:** Check if there IS a barrel export file first. If not, skip this item.

---

## Rules

- Work on ONLY ONE item per invocation
- Read the target file before making any edits
- Run full CI after every change
- Update state.yaml after each item is completed

## Max Iterations

6

## Completion

<promise>R2 CODE PATTERNS COMPLETE</promise>
