# Final: Version Bump & Changelog

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

`phases.08-ship-review.sub_phases.04-version-changelog.items`

You are updating the version and changelog for this release.
Work through items ONE AT A TIME.

## Checklist

### Item: determine-version-bump

**Determine Version Bump**

Based on the changes across all phases:

- Breaking changes? -> major (unlikely)
- New features or significant improvements? -> minor
- Bug fixes and internal improvements only? -> patch
  Read the current version from package.json and determine the new version.

### Item: update-changelog

**Update CHANGELOG.md**

Add a new section at the top with:

- Version number and date
- Grouped changes:
  - **Changed** — refactored code, improved patterns
  - **Fixed** — bugs fixed, security issues addressed
  - **Added** — new tests, new infrastructure
  - **Improved** — performance, accessibility, documentation
- Keep entries concise (one line each)
- Reference specific areas (not file paths)

### Item: update-package-json-version

**Update package.json Version**

- Update root package.json version field
- Consider if workspace packages need version bumps

### Item: final-verification

**Final Verification**

After version bump:

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm build
pnpm test
```

## Files to Read

- `CHANGELOG.md` (current format and style)
- `package.json` (current version)
- `.claude/loops/progress.md` (summary of all changes)

## Rules

- Follow Keep a Changelog format if already used
- Be concise — one line per change
- Do not list every file touched
- Run full CI after version bump
- Update `.claude/loops/progress.md`
- Work on ONLY ONE item per invocation

## Max Iterations

4

## Completion

When version bumped, changelog updated, and CI passes:

<promise>VERSION AND CHANGELOG COMPLETE</promise>
