# R2: Accessibility Fixes

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

Key: `phases.r2-03-quality-fixes.sub_phases.01-accessibility.items`

---

### Item: search-result-aria-labels

- **File:** `apps/web/src/features/matching/TrackSearchPanel.tsx`
- **Problem:** Search result buttons for track selection are missing `aria-label`. Screen readers cannot identify which track each button represents.
- **Fix:** Add `aria-label={`Select ${track.name}${track.artistName ? ` by ${track.artistName}` : ''}`}` to each search result button.
- **Notes:** Read the file first to find the exact button element.

---

### Item: loading-fallback-consistency

- **File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`
- **Problem:** Dynamic import loading fallbacks use plain `<p>Loading matching...</p>` and `<p>Loading export...</p>` instead of the `StatusText` component used elsewhere.
- **Fix:** Replace with `<StatusText>Loading matching...</StatusText>` and `<StatusText>Loading export...</StatusText>` for visual consistency.
- **Notes:** Import `StatusText` at the top of the file.

---

### Item: console-error-env-gate

- **File:** `apps/web/src/app/error.tsx`
- **Problem:** `console.error(error)` runs in production. Error boundary error logging should be development-only or use a proper logging utility.
- **Fix:** Wrap in `if (process.env.NODE_ENV !== 'production') { console.error(error); }` or simpler: check `process.env.NODE_ENV === 'development'`.
- **Notes:** Do NOT remove the `console.error` entirely -- it is useful for debugging.

---

## Rules

- Work on ONLY ONE item per invocation
- Read the target file before making any edits
- Run full CI after every change
- Update state.yaml after each item is completed

## Max Iterations

6

## Completion

<promise>R2 ACCESSIBILITY FIXES COMPLETE</promise>
