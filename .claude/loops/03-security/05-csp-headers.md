# Security: Content Security Policy Headers

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

Read state.yaml at `phases.04-security.sub_phases.05-csp-headers.items`

## Items

### Item: csp-middleware

- Create Next.js middleware at `apps/web/middleware.ts` (or update if it exists)
- Add Content-Security-Policy header with restrictive defaults:
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (Next.js requires these unfortunately)
  - `style-src 'self' 'unsafe-inline'`
  - `img-src 'self' data: blob:`
  - `font-src 'self'`
  - `connect-src 'self'` (will be expanded in next items)
  - `frame-src 'none'`
  - `object-src 'none'`
  - `base-uri 'self'`
- Also add: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
- Run CI after adding

### Item: csp-musickit-cdn

- Update CSP to whitelist Apple MusicKit CDN:
  - Add `https://js-cdn.music.apple.com` to `script-src`
  - Add `https://*.apple.com` to `connect-src` (MusicKit API calls)
- Verify MusicKit still loads and works after CSP is applied
- Test by checking browser console for CSP violations

### Item: csp-api-connect

- Update CSP `connect-src` to whitelist:
  - The API base URL (from config)
  - `https://api.setlist.fm` (proxied through backend, but verify)
  - `https://api.music.apple.com` (MusicKit API)
- Make the CSP configurable via environment variable if needed (different origins for dev vs prod)
- Run full CI

## Files to Read

- `apps/web/next.config.ts`
- `apps/web/middleware.ts` (if exists)
- `apps/web/src/lib/config.ts`
- `apps/web/src/app/layout.tsx`

## Rules

- CSP must not break MusicKit. Test in browser after adding.
- If `unsafe-eval` is needed for Next.js dev mode only, use a conditional.
- Run full CI after changes.
- Update `.claude/loops/progress.md` after each item.
- Work on ONLY ONE item per invocation.

## Max Iterations

6

## Completion

When CSP headers are fully configured and CI passes:

<promise>CSP HEADERS COMPLETE</promise>
