# Bug Fixing: Type Safety Fixes

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
`phases.02-bugs.sub_phases.02-type-safety-fixes.items`
Find the first item with `status != complete`. Do that item.

## Items

### Item: musickit-api-casts

Files: `apps/web/src/lib/musickit/catalog.ts`, `apps/web/src/lib/musickit/playlist.ts`

Problem: Code uses `as { data: ... }` type assertions on MusicKit API
responses, bypassing TypeScript's type checker. If the API response shape
changes, these will silently produce wrong data at runtime.

Fix: Create proper type guards or response validators. Either:
a) Define response types and validate with runtime checks, or
b) Use the existing MusicKit types from `types.ts` if they match

Rules: Do NOT add Zod or other validation libraries unless already in the
project. Use manual type narrowing (`typeof`, `in` operator, `Array.isArray`).

### Item: json-parse-narrowing

Files: `apps/web/src/features/setlist-import/useSetlistImportState.ts`
and any others using `JSON.parse() as unknown`

Problem: `JSON.parse(raw) as unknown` provides no runtime validation.
If stored data is corrupted or from an old schema version, the code will
fail at an unpredictable point downstream.

Fix: Add validation after parsing — check for expected shape before
using the data. A few `typeof` checks and `in` operator narrowing is
sufficient. No need for a full validation library.

## Files to Read

- `apps/web/src/lib/musickit/catalog.ts`
- `apps/web/src/lib/musickit/playlist.ts`
- `apps/web/src/lib/musickit/types.ts`
- `apps/web/src/features/setlist-import/useSetlistImportState.ts`
- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`

## Rules

- Never weaken types to fix a type error. Strengthen or add guards.
- Do NOT add Zod or other validation libraries unless already in the project.
- Use manual type narrowing: `typeof`, `in` operator, `Array.isArray`.
- Preserve exact runtime behavior for valid inputs.
- Run `pnpm format:check && pnpm lint && pnpm build && pnpm test` after each fix.
- If tests break, revert and take a more conservative approach.
- Update `.claude/loops/state.yaml` after each item.
- Work on ONLY ONE item per invocation.

## Max Iterations

6

## Completion

When all items are done and CI passes:

<promise>TYPE SAFETY FIXES COMPLETE</promise>
