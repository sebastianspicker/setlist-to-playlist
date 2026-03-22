# Phase 3 Orchestrator: Security & Hardening (Next Level)

This phase addresses security beyond OWASP basics, building on
the prior security audit that already covered fundamentals.

## Entry Criteria

- Phase 2 complete; CI fully green
- Prior security audit (`.claude/02-security.md`) findings reviewed
- Working branch: `ralph/03-security`

## Sub-Phase Order

1. `01-supply-chain.md` — Dependency pinning, SRI, CSP nonce
2. `02-token-hardening.md` — Token rotation, lifecycle, refresh
3. `03-rate-limiter-improvement.md` — Better rate limiting strategy
4. `04-error-message-audit.md` — Info leakage in all error paths

## Between Sub-Phases

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
pnpm audit --audit-level=high --prod
```

## Rollback

Security changes can break functionality. After each sub-phase:

1. Verify all API routes still respond correctly
2. Verify MusicKit initialization still works
3. Verify CORS headers are correct

## Exit Criteria

- All 4 sub-phases complete
- `pnpm audit` clean
- No information leakage in error messages
- Token lifecycle documented and hardened

## Completion

<promise>PHASE 3 SECURITY COMPLETE</promise>
