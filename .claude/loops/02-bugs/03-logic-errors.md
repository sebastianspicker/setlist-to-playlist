# Bug Fixing: Logic Errors

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
`phases.02-bugs.sub_phases.03-logic-errors.items`
Find the first item with `status != complete`. Do that item.

## Items

### Item: concurrent-token-refresh

File: `apps/web/src/lib/musickit/token.ts`

Problem: Verify that the promise-singleton pattern for
`fetchDeveloperToken()` correctly handles ALL scenarios:
a) Concurrent calls when token is expired — both should get same new token
b) What happens if the fetch fails — is the promise cleared so next
call retries?
c) What happens if the token response is malformed — does it cache a
bad token?

Action: Read the code, trace each scenario mentally, fix any gaps found.
If the implementation is correct, document the reasoning in state.yaml
notes and mark complete.

### Item: cache-eviction-edge

Files: `apps/api/src/lib/setlistfm.ts`, `apps/web/src/lib/musickit/catalog.ts`

Problem: Cache eviction runs during request processing. If an entry is
being read while eviction removes it, the result could be lost.

Action: Read both cache implementations, verify eviction is safe (happens
before or after reads, not during). Single-threaded JS means no true
concurrency, but async interleaving could still cause issues if eviction
yields. Document behavior in state.yaml notes.

## Files to Read

- `apps/web/src/lib/musickit/token.ts`
- `apps/api/src/lib/setlistfm.ts`
- `apps/web/src/lib/musickit/catalog.ts`
- `apps/web/tests/musickit-token.test.ts` (if exists)
- `apps/web/tests/musickit-catalog.test.ts` (if exists)

## Rules

- Read the full file and trace the logic before making changes.
- For verification-only items, document your analysis in state.yaml notes.
- If no bug is found, mark as complete with reasoning — do not invent fixes.
- If a bug is found, fix the minimal amount of code needed.
- Run `pnpm format:check && pnpm lint && pnpm build && pnpm test` after each fix.
- If tests break, revert and take a more conservative approach.
- Update `.claude/loops/state.yaml` after each item.
- Work on ONLY ONE item per invocation.

## Max Iterations

6

## Completion

When all items are done and CI passes:

<promise>LOGIC ERRORS COMPLETE</promise>
