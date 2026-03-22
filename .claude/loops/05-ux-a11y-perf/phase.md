# Phase 6: UX, Accessibility & Performance

Improves user experience, WCAG compliance, and performance. Changes should enhance, never degrade, the experience.

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

Read `.claude/loops/state.yaml` at `phases.06-ux-a11y-perf`.
Find the first sub-phase with `status != complete`.
Within that sub-phase, find the first item with `status != complete`.
Read the sub-phase prompt at `.claude/loops/05-ux-a11y-perf/{sub_phase_file}.md`.
Execute that ONE item.

## Sub-Phases

1. `01-wcag-audit.md` — Color contrast, keyboard nav, ARIA, focus management
2. `02-performance-optimization.md` — Bundle, dynamic imports, memoization
3. `03-pwa-audit.md` — Manifest, service worker, installability, offline
4. `04-responsive-verification.md` — Breakpoints, touch targets, typography scaling

## Entry Criteria

- Phase 5 complete
- CI passes on current branch

## Exit Criteria

- Accessibility and performance improvements applied
- CI green
- Build size not regressed

## Branch

```
ralph/06-ux-a11y-perf
```

## CI Verification

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

## Rollback

If any change degrades UX, accessibility scores, or increases build size beyond acceptable thresholds, revert the commit and re-approach. Never merge a regression.

```bash
git revert HEAD --no-edit
```

## Completion Promise

When all sub-phases are complete and CI is green:

<promise>PHASE 6 UX A11Y PERF COMPLETE</promise>
