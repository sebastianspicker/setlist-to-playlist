# Phase 4: Security & Hardening

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

## Purpose

Security audit and fixes. This phase addresses vulnerabilities, hardens
token lifecycle management, improves rate limiting, audits error messages
for information leakage, and adds Content Security Policy headers. Builds
on the prior security audit while going deeper on supply-chain and
runtime hardening.

## Entry Criteria

- Phase 3 (refactoring) complete
- `pnpm format:check && pnpm lint && pnpm build && pnpm test` all pass
- Prior security audit findings reviewed (if available)
- Working branch: `ralph/04-security`

## Sub-Phase Order

1. `01-supply-chain.md` — GitHub Actions pin audit, dependency lock, SRI
2. `02-token-hardening.md` — Token lifecycle, race conditions, key protection
3. `03-rate-limiter-improvement.md` — Sliding window, memory leak prevention
4. `04-error-message-audit.md` — No sensitive data in errors, logging audit
5. `05-csp-headers.md` — Content Security Policy via Next.js middleware

## State

Read `.claude/loops/state.yaml` at `phases.04-security`.
Find the first sub-phase with `status != complete`.
Within that sub-phase, find the first item with `status != complete`.
Read the sub-phase prompt at `.claude/loops/03-security/{sub_phase_file}.md`.
Execute that ONE item.

## Between Sub-Phases

Run after each sub-phase:

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

Additionally verify security posture:

```bash
pnpm audit --audit-level=high --prod
```

After each sub-phase, verify:

1. All API routes still respond correctly
2. MusicKit initialization still works
3. CORS headers are correct

## Rollback

Security changes can break functionality. If a sub-phase breaks tests:

1. `git stash` the changes
2. Run tests to confirm they pass without the changes
3. Verify all API routes still respond correctly
4. Verify MusicKit initialization still works
5. Verify CORS headers are correct
6. Identify the specific change that broke things
7. Apply a more conservative approach

If a security fix introduces a regression that is not caught by tests,
document the issue in state.yaml and add a test for the regression
before re-attempting the fix.

## Branch

`ralph/04-security`

Commit format: `security(<scope>): <what changed>`

## Exit Criteria

- All 5 sub-phases complete or documented with justification
- `pnpm audit` clean (no high/critical vulnerabilities)
- No information leakage in error messages
- Token lifecycle documented and hardened
- CSP headers configured and validated
- CI fully green (`pnpm format:check && pnpm lint && pnpm build && pnpm test`)
- No new warnings introduced

## Completion

<promise>PHASE 4 SECURITY COMPLETE</promise>
