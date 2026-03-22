# Security: Token Rotation & Lifecycle Hardening

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

`phases.04-security.sub_phases.02-token-hardening.items`

You are improving token handling security. Work through items ONE AT A TIME.

## Audit Checklist

### Item: developer-token-lifecycle

Files: `apps/api/src/lib/jwt.ts`, `apps/web/src/lib/musickit/token.ts`

Current: Token minted with 1h expiry; client caches for 55min with
5min buffer.

- Verify the 5-minute buffer is sufficient (network latency, clock skew)
- Check if token refresh during an active MusicKit session causes issues
- Consider: should the dev-token endpoint return `expiresIn` so the
  client does not hardcode TTL?

### Item: token-refresh-race-condition

File: `apps/web/src/lib/musickit/token.ts`

- If two components call `fetchDeveloperToken()` simultaneously when
  the token is expired, both will make API calls
- The current code has no mutex/dedup — implement one
  (similar to initMusicKit's promise singleton pattern in client.ts)

### Item: user-token-security

File: `apps/web/src/lib/musickit/client.ts`

- MusicKit manages the user token internally
- Verify: is the user token stored in a secure location by MusicKit?
- Document the threat model: what if the user token is stolen?
- Check if `unauthorize()` is called on session end

### Item: api-key-protection

File: `apps/api/src/lib/setlistfm.ts`

- API key is read from env on every request (good — not cached globally)
- Verify the key is never logged, never in error messages, never in
  response bodies
- Check all error paths in proxy.ts and setlistfm.ts for key leakage

### Item: token-endpoint-rate-limiting

File: `apps/web/src/app/api/apple/dev-token/route.ts`

- Verify the dev-token endpoint is rate-limited (30 req/min per IP)
- An attacker could spam this endpoint to generate many valid JWTs
- Verify rate limiting is effective and not bypassable

## Files to Read

- `apps/api/src/lib/jwt.ts`
- `apps/api/src/routes/apple/dev-token.ts`
- `apps/web/src/app/api/apple/dev-token/route.ts`
- `apps/web/src/lib/musickit/token.ts`
- `apps/web/src/lib/musickit/client.ts`
- `apps/web/src/app/api/setlist/proxy/route.ts`
- `apps/api/src/lib/setlistfm.ts`
- `apps/api/src/routes/setlist/proxy.ts`

## Rules

- Token changes require careful testing — verify MusicKit still
  initializes after changes.
- Do not change the JWT algorithm or key handling without careful review.
- Rate limiting must not break legitimate use (the client refreshes
  once per ~55 minutes).
- Update `.claude/loops/progress.md` after each item.
- Work on ONLY ONE item per invocation.

## Max Iterations

8

## Completion

When token hardening complete and CI passes:

<promise>TOKEN HARDENING COMPLETE</promise>
