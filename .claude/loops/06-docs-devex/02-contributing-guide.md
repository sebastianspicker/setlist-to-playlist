# Docs: Contributing Guide Improvements

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

`phases.07-docs-devex.sub_phases.02-contributing.items`

You are improving the contributing guide for clarity and completeness.
Work through items ONE AT A TIME.

## Audit Checklist

### Item: contributing-md-accuracy

**CONTRIBUTING.md Accuracy**

- Verify all commands work as documented
- Verify the pre-commit hook instructions work
- Add section on test conventions (test file location, naming, patterns)
- Add section on branch naming conventions
- Add section on commit message conventions

### Item: agents-md-update

**AGENTS.md Update**

- Verify it reflects current conventions
- Update if any tooling changed in Phases 2-5
- Add information about the test infrastructure (Vitest, Playwright)

### Item: first-contribution-path

**First Contribution Path**

- Is there a clear "good first issue" type of work?
- Is the project structure explained enough for a new contributor?
- Are there "gotchas" that should be documented?
  (e.g., MusicKit requires Apple Developer account)

## Files to Read

- `CONTRIBUTING.md`
- `AGENTS.md`
- `README.md` (contributing section)

## Rules

- Write for a developer who has never seen the repo
- Test every command you document
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE document per invocation

## Max Iterations

4

## Completion

<promise>CONTRIBUTING GUIDE COMPLETE</promise>
