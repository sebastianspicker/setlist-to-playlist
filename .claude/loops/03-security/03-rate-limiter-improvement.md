# Security: Rate Limiter Improvement

## Ralph Loop Protocol

You are inside a Ralph Loop. The same prompt is fed every iteration via stop hook.
Your work persists in files and git history.

Every iteration:

1. Read `.claude/loops/state.yaml` — find next incomplete item in your scope
2. Do exactly ONE item of work
3. Run CI: `pnpm format:check && pnpm lint && pnpm build && pnpm test`
4. Update state.yaml (mark item complete, add notes)
5. Commit: `git add -A && git commit -m "security(<scope>): <desc>"`
6. Exit — stop hook re-invokes you

Emit the completion promise ONLY when your entire scope is complete.

## State

`phases.04-security.sub_phases.03-rate-limiter.items`

You are improving the rate limiting strategy. Work through items ONE AT A TIME.

## Audit Checklist

### Item: current-rate-limiter-analysis

File: `apps/web/src/lib/rate-limit.ts`

- In-memory, per-instance, fixed-window
- 20 req/60s for setlist proxy, 30 req/60s for dev-token
- No rate limit on health endpoint (appropriate)

### Item: sliding-window-upgrade

- Fixed-window allows burst at window boundary (up to 2x rate)
- Implement sliding window or token bucket algorithm
- Keep the same interface (InMemoryRateLimiter)
- Ensure existing tests still pass, add new tests for
  window boundary behavior

### Item: memory-leak-prevention

File: `apps/web/src/lib/rate-limit.ts`

- The buckets Map grows unboundedly
- Add periodic cleanup of expired buckets
- Add a maximum bucket count (e.g., 10000 unique IPs)
  with LRU eviction

### Item: rate-limit-headers

File: `apps/web/src/app/api/setlist/proxy/route.ts`

- Currently only sets `Retry-After` on 429
- Add standard rate limit headers to ALL responses:
  X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

### Item: client-side-rate-limit-handling

File: `apps/web/src/lib/fetch.ts`

- When the client receives a 429, it shows the error message
- Consider: should the client auto-retry after Retry-After?
- At minimum, parse and display the Retry-After value in the UI

## Files to Read

- `apps/web/src/lib/rate-limit.ts`
- `apps/web/tests/rate-limit.test.ts`
- `apps/web/src/app/api/setlist/proxy/route.ts`
- `apps/web/src/app/api/apple/dev-token/route.ts`
- `apps/web/src/lib/fetch.ts`

## Rules

- Rate limiter must remain in-memory (no external dependencies)
- Must be backward compatible with existing interface
- Add tests for any new behavior
- Run full CI after each change
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE item per invocation

## Max Iterations

8

## Completion

When rate limiter improvements complete and CI passes:

<promise>RATE LIMITER IMPROVEMENT COMPLETE</promise>
