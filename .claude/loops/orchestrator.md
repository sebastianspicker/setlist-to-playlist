# Ralph Loop Master Orchestrator

You are orchestrating a multi-phase improvement of the setlist-to-playlist repository.
This is a TypeScript monorepo (pnpm + Turbo): Next.js 16 PWA (React 19), shared API logic
in apps/api, pure domain logic in packages/core, shared types in packages/shared.

## Current State Baseline

Before starting any phase, verify the baseline:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm build
pnpm test
pnpm audit --audit-level=high --prod
```

Record baseline metrics (test count, build warnings, bundle size) in `.claude/loops/progress.md`.

## Phase Sequence

### Phase 1: Deep Analysis & Discovery (READ-ONLY)

- **Entry:** Baseline CI passes
- **Exit:** Analysis report complete in progress.md, no code changes
- **Sub-phases:** static-analysis, dependency-graph, test-coverage-gaps, performance-profiling
- **Gate:** Findings prioritized (P0-P3) and assigned to target phases

### Phase 2: Code Quality & Refactoring

- **Entry:** Phase 1 complete; CI passes
- **Exit:** All refactoring items complete or documented as deferred
- **Sub-phases:** extract-hooks, component-decomposition, pattern-unification, type-strengthening, modernize-patterns
- **Gate:** `pnpm format:check && pnpm lint && pnpm build && pnpm test` all pass; no component > 150 lines

### Phase 3: Security & Hardening

- **Entry:** Phase 2 complete; CI passes
- **Exit:** All security items addressed or documented with justification
- **Sub-phases:** supply-chain, token-hardening, rate-limiter-improvement, error-message-audit
- **Gate:** CI passes; `pnpm audit --audit-level=high --prod` clean; no new security warnings

### Phase 4: Testing & Reliability

- **Entry:** Phase 3 complete; CI passes
- **Exit:** Test count increased; coverage gaps from Phase 1 addressed
- **Sub-phases:** unit-test-expansion, integration-tests, e2e-infrastructure, edge-case-tests
- **Gate:** All tests pass; test count > baseline; no flaky tests (run 3x to verify)

### Phase 5: UX, Accessibility & Performance

- **Entry:** Phase 4 complete; CI passes
- **Exit:** Accessibility and performance improvements applied
- **Sub-phases:** wcag-audit, performance-optimization, pwa-audit, responsive-verification
- **Gate:** CI passes; no new lint warnings; build size not regressed significantly

### Phase 6: Documentation & DevEx

- **Entry:** Phase 5 complete; CI passes
- **Exit:** Docs updated to reflect all changes from Phases 2-5
- **Sub-phases:** api-docs, contributing-guide, architecture-diagrams, onboarding-experience
- **Gate:** Docs accurately reflect current code; no stale references

### Phase 7: Final Integration & Ship Review

- **Entry:** Phase 6 complete; CI passes
- **Exit:** Repository is ship-ready
- **Sub-phases:** cross-phase-consistency, regression-testing, ship-review, version-changelog
- **Gate:** Full CI green; manual review passed; CHANGELOG updated

## Between-Phase CI Verification

After every phase completes, run this verification block:

```bash
pnpm format:check
pnpm lint
pnpm build
pnpm test
pnpm audit --audit-level=high --prod
```

If any command fails, the phase is NOT complete. Fix the failure before proceeding.

## Rollback Strategy

Each phase operates on a git branch: `ralph/<phase-name>`.
Before each phase, create a branch from current state.
If a phase breaks things irreparably:

1. `git stash` any uncommitted work
2. `git checkout main` (or the pre-phase commit)
3. Document what went wrong in progress.md
4. Re-attempt the phase with adjusted approach

## Progress Tracking

All progress is tracked in `.claude/loops/progress.md` with:

- Phase name and status (not-started / in-progress / complete / blocked)
- Sub-phase checklist with completion timestamps
- CI verification results after each phase
- Findings that were deferred and why
- Test count progression (baseline -> after each phase)

## Completion

When all 7 phases are complete, CI is green, and the ship review passes:

<promise>ALL PHASES COMPLETE</promise>
