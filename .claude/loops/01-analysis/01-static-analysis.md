# Analysis: Static Analysis & Type System

## Ralph Loop Protocol

You are inside a Ralph Loop. The same prompt is fed every iteration via stop hook.
Your work persists in files and git history.

Every iteration:

1. Read `.claude/loops/state.yaml` — find next incomplete item in your scope
2. Do exactly ONE item of work (this is a READ-ONLY phase — only update state.yaml)
3. Update state.yaml (mark item complete, add notes)
4. Exit — stop hook re-invokes you

Emit the completion promise ONLY when your entire scope is complete.

## State

`phases.01-analysis.sub_phases.01-static-analysis.items`

You are performing a static analysis audit of this TypeScript monorepo.
Do NOT modify any files. Document all findings in `.claude/loops/progress.md`.

## Scope

### Item: typescript-strictness

- Check tsconfig.json in each package for strict mode settings
- Identify files that would fail under stricter settings
  (strict: true, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- Find `as unknown`, `as any`, type assertions that could be replaced
  with type guards or narrowing

### Item: dead-code

- Identify exported functions/types that are never imported elsewhere
- Find unreachable code branches
- Check for unused variables that ESLint might miss
  (especially in complex generic types)
- Look at `packages/ui/` — is Button.tsx actually used anywhere?
  Is this package doing anything?

### Item: type-safety-gaps

- Find `(await music.music.api(path)) as { ... }` patterns in
  `apps/web/src/lib/musickit/` — these bypass type safety
- Check `JSON.parse(raw) as unknown` patterns for better alternatives
- Look for missing discriminated unions where string literal types
  could prevent bugs (e.g., MatchRow.status)
- Find places where `null` vs `undefined` usage is inconsistent

### Item: eslint-gaps

- Review eslint.config.mjs for missing rules relevant to React/Next.js
- Check if react-hooks/exhaustive-deps is enforced
- Check if import ordering is enforced
- Identify patterns that should be caught by lint but aren't

## Files to Read

- All tsconfig.json files (root, each app, each package)
- `eslint.config.mjs`
- `apps/web/src/lib/musickit/catalog.ts`
- `apps/web/src/lib/musickit/playlist.ts`
- `apps/web/src/lib/musickit/client.ts`
- `apps/web/src/lib/fetch.ts`
- `apps/web/src/features/setlist-import/useSetlistImportState.ts`
- `packages/core/src/setlist/mapper.ts`
- `packages/ui/src/` — check if anything imports from this package

## Rules

- READ ONLY. Do not modify any file.
- Record findings with file path, line number, and specific issue.
- Categorize: P0 (will cause bugs), P1 (type safety risk),
  P2 (code quality), P3 (nice to have).
- Assign each finding a target phase (Phase 2 for refactoring,
  Phase 4 for testing, etc.).
- Update `.claude/loops/progress.md` after each item.
- Work on ONE audit category per invocation.

## Max Iterations

8

## Completion

When all 4 categories have been audited and findings documented:

<promise>STATIC ANALYSIS COMPLETE</promise>
