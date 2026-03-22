# Phase 5 Orchestrator: UX, Accessibility & Performance

This phase improves the user experience, accessibility compliance,
and runtime performance.

## Entry Criteria

- Phase 4 complete; CI fully green
- Test suite expanded (acts as safety net for UI changes)
- Working branch: `ralph/05-ux-a11y-perf`

## Sub-Phase Order

1. `01-wcag-audit.md` — WCAG 2.1 AA compliance (must come first —
   accessibility is foundational)
2. `02-performance-optimization.md` — Bundle, splitting, images
3. `03-pwa-audit.md` — PWA compliance and offline
4. `04-responsive-verification.md` — Responsive design check

## Between Sub-Phases

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

## Exit Criteria

- WCAG 2.1 AA issues documented and addressed
- Bundle size not increased (or justified)
- PWA score improved
- App usable from 320px to 2560px

## Completion

<promise>PHASE 5 UX A11Y PERF COMPLETE</promise>
