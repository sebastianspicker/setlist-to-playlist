# Bug Fixing: P0/P1 Critical Fixes

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
`phases.02-bugs.sub_phases.01-p0-p1-fixes.items`
Find the first item with `status != complete`. Do that item.

## Items

### Item: musickit-init-promise-reset

File: `apps/web/src/lib/musickit/client.ts`

Problem: `initPromise` is not reset to `null` when MusicKit configuration
fails. If the script loads but `MusicKit.configure()` throws, subsequent
calls to `initMusicKit()` will return the rejected promise forever instead
of retrying.

Fix: In the catch block of the init IIFE, set `initPromise = null` before
re-throwing.

Verify: Write a test or manually verify that after a configure failure,
calling `initMusicKit()` again attempts reconfiguration.

### Item: playlist-error-after-success

Files: `apps/web/src/lib/musickit/playlist.ts`

Problem: Previously, `playlist.ts` threw after successful track addition
(already fixed per `progress.md`).

Action: VERIFY ONLY — read the file, confirm the fix is in place, check
test coverage for this scenario.

If already fixed: mark as complete with verification notes.

## Files to Read

- `apps/web/src/lib/musickit/client.ts`
- `apps/web/src/lib/musickit/playlist.ts`
- `apps/web/tests/musickit-playlist.test.ts` (if exists)
- `.claude/loops/progress.md`

## Rules

- Read the full file before making changes.
- Preserve exact behavior for non-buggy code paths.
- Run `pnpm format:check && pnpm lint && pnpm build && pnpm test` after each fix.
- If tests break, revert and take a more conservative approach.
- Update `.claude/loops/state.yaml` after each item.
- Work on ONLY ONE item per invocation.

## Max Iterations

6

## Completion

When all items are done and CI passes:

<promise>P0 P1 FIXES COMPLETE</promise>
