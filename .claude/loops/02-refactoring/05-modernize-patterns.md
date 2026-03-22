# Refactoring: Modernize Patterns (React 19, Next.js 16)

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

`phases.03-refactoring.sub_phases.05-modernize-patterns.items`

## Audit Checklist

### Item: react-19-use-hook

- Check if any component does `useEffect + fetch + setState` that
  could use React 19's `use()` with a promise
- `useSetlistImportState.ts` uses the standard async pattern —
  assess if `use()` with Suspense would simplify
- Note: MusicKit operations are user-initiated, so Suspense may
  not apply. Document the reasoning either way.

### Item: react-19-action-state

- `SetlistImportView.tsx` has a form with loading state — this is
  a candidate for `useActionState` if the form action can be a
  server action or the new form action pattern
- Assess: is the setlist proxy call compatible with server actions?
  It calls our own API, so a server action could call handleSetlistProxy
  directly, skipping the HTTP round-trip.

### Item: nextjs-16-cache

- Check `next.config.ts` for cache component support
- Check `docs/tech/cache-components.md` for guidance
- Assess: which server components could use `'use cache'`?
  The layout, page.tsx metadata, static content?

### Item: react-19-ref-as-prop

- Check if any components use forwardRef — React 19 makes ref a
  regular prop. If forwardRef is used, simplify.

### Item: nextjs-16-ppr

- The app has a static shell (layout, heading, instructions) and
  dynamic content (setlist import form). PPR could serve the static
  shell instantly while streaming the client components.
- Assess feasibility and document findings.

## Files to Read

- `apps/web/next.config.ts`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/layout.tsx`
- `docs/tech/cache-components.md`
- `apps/web/src/features/setlist-import/SetlistImportView.tsx`
- `apps/web/src/features/setlist-import/useSetlistImportState.ts`
- All component files for forwardRef usage

## Rules

- Only adopt patterns that provide clear, measurable benefit.
- Do NOT adopt experimental or unstable APIs.
- If a modernization requires significant refactoring with unclear
  benefit, document it as a future improvement.
- Run `pnpm build && pnpm test` after each change.
- Update `.claude/loops/progress.md` after each item.
- Work on ONLY ONE modernization per invocation.

## Max Iterations

6

## Completion

When all applicable modernizations applied and CI passes:

<promise>MODERNIZATION COMPLETE</promise>
