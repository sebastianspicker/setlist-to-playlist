# Refactoring: TypeScript Type Strengthening

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

`phases.03-refactoring.sub_phases.04-type-strengthening.items`

## Audit Checklist

### Item: musickit-api-response-types

Files: `apps/web/src/lib/musickit/catalog.ts`, `playlist.ts`

Replace inline `as { ... }` casts with proper type definitions:

- Define `MusicKitSearchResponse` type in `musickit/types.ts`
- Define `MusicKitPlaylistResponse` type in `musickit/types.ts`
- Define `MusicKitErrorResponse` type in `musickit/types.ts`
- Use type guards (runtime checks already exist) to narrow
  `unknown` to these types instead of `as` casts

### Item: json-parse-safety

File: `apps/web/src/features/setlist-import/useSetlistImportState.ts`

- `JSON.parse(raw) as unknown` is fine but the subsequent validation
  could use a type guard function
  File: `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`
- `JSON.parse(raw) as ResumeState` skips validation — the next line
  does partial validation but could use a type guard

### Item: mapper-double-cast

File: `packages/core/src/setlist/mapper.ts`

- `fmSet as unknown as Record<string, unknown>` is a double cast
- The runtime check is correct but the types should flow naturally.
  Consider a type guard for SetlistFmSet validation.

### Item: fetchjson-generic-safety

File: `apps/web/src/lib/fetch.ts`

- `return { ok: true, value: data as T }` — the `as T` is unavoidable
  for generic JSON parsing, but document the contract: callers must
  validate the shape after receiving the Result.

### Item: matchrow-status-discriminated-union

File: `apps/web/src/features/matching/types.ts`

- `status: 'matched' | 'unmatched' | 'skipped'` could benefit from
  being a discriminated union where `matched` guarantees
  `appleTrack !== null`:
  ```ts
  type MatchRow =
    | { setlistEntry: SetlistEntry; appleTrack: AppleMusicTrack; status: 'matched' }
    | { setlistEntry: SetlistEntry; appleTrack: null; status: 'unmatched' | 'skipped' };
  ```
  Assess if it simplifies or complicates downstream code.

### Item: api-error-code-exhaustiveness

File: `packages/shared/src/types/api.ts`

- `API_ERROR` uses `as const` — verify all switch/if chains on
  ApiErrorCode are exhaustive (use `never` type in default case)

## Files to Read

- `apps/web/src/lib/musickit/catalog.ts`
- `apps/web/src/lib/musickit/playlist.ts`
- `apps/web/src/lib/musickit/types.ts`
- `apps/web/src/lib/fetch.ts`
- `apps/web/src/features/matching/types.ts`
- `apps/web/src/features/setlist-import/useSetlistImportState.ts`
- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`
- `packages/core/src/setlist/mapper.ts`
- `packages/shared/src/types/api.ts`

## Rules

- Never weaken types to fix a type error. Strengthen or add guards.
- If a discriminated union would require > 10 file changes, document
  it as a deferred improvement with the file list.
- Run `pnpm build && pnpm test` after each change.
- Check that `pnpm lint` still passes (no new warnings).
- Update `.claude/loops/progress.md` after each item.
- Work on ONLY ONE type improvement per invocation.

## Max Iterations

8

## Completion

When all type improvements applied and CI passes:

<promise>TYPE STRENGTHENING COMPLETE</promise>
