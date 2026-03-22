# Final: Cross-Phase Consistency Check

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

`phases.08-ship-review.sub_phases.01-cross-phase-consistency.items`

You are checking that changes from all phases are consistent with each other.
Work through items ONE AT A TIME.

## Audit Checklist

### Item: refactoring-testing-consistency

**Refactoring + Testing Consistency**

- Do tests from Phase 4 test the refactored code from Phase 2?
  (not the pre-refactoring version)
- Are extracted hooks tested?
- Are unified patterns tested?

### Item: security-docs-consistency

**Security + Documentation Consistency**

- Do docs from Phase 6 reflect security changes from Phase 3?
- Are CSP headers documented?
- Is token lifecycle documented?

### Item: perf-a11y-consistency

**Performance + Accessibility Consistency**

- Did performance optimizations (Phase 5.2) break accessibility?
  (e.g., lazy loading removing ARIA attributes)
- Do dynamic imports have proper loading fallbacks with ARIA?

### Item: code-style-consistency

**Code Style Consistency**

- After 6 phases of changes, is the coding style still consistent?
- Are there Phase 2 refactorings that use different patterns than
  Phase 4 test additions?
- Run format check and lint as final verification

### Item: import-export-consistency

**Import/Export Consistency**

- After refactoring, do all barrel exports still work?
- Are there any dangling imports?
- Does `pnpm build` produce clean output (no warnings)?

## Rules

- Read every file that was modified across all phases
- Check git log for the full history of changes
- Fix any inconsistencies found
- Run full CI after any fix
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE consistency area per invocation

## Max Iterations

8

## Completion

When cross-phase consistency verified:

<promise>CROSS-PHASE CONSISTENCY COMPLETE</promise>
