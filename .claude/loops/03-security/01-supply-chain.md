# Security: Supply Chain & SRI

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

`phases.04-security.sub_phases.01-supply-chain.items`

You are hardening the supply chain and external resource integrity.
Work through items ONE AT A TIME.

## Audit Checklist

### Item: github-actions-pin-audit

File: `.github/workflows/ci.yml`

- Verify all actions use SHA pinning (already partially done)
- Check for any @main or @v4 references without SHA
- Add comments with the tag each SHA corresponds to

### Item: dependency-lock-integrity

- Verify pnpm-lock.yaml is committed and --frozen-lockfile is used in CI
- Check if any dependencies use git:// URLs or unpinned ranges
- Review devDependencies for unnecessary packages

### Item: musickit-script-sri

File: `apps/web/src/app/layout.tsx`

- MusicKit script loads from CDN without SRI
- The DCI-020 comment says Apple does not publish stable integrity hashes
- Research: can we implement a build-time SRI check? Or a CSP fallback?
- If SRI is truly impossible, implement a CSP nonce strategy instead

### Item: csp-headers

- Check if any Content-Security-Policy headers are set
- Design a CSP that allows: self, Apple CDN (js-cdn.music.apple.com),
  Apple Music API (api.music.apple.com)
- Implement via Next.js middleware or headers in next.config.ts
- Consider nonce-based script-src for the MusicKit script

### Item: bundled-asset-sri

- Next.js generates hashed filenames for chunks — verify this
- Check if `crossOrigin="anonymous"` is set on script tags
- Verify no external resources load without integrity checks

## Files to Read

- `.github/workflows/ci.yml`
- `.github/dependabot.yml`
- `pnpm-lock.yaml` (check for git:// URLs)
- `apps/web/src/app/layout.tsx`
- `apps/web/next.config.ts`
- `package.json` (all workspace packages)

## Rules

- Security changes must not break functionality.
- CSP must be tested by building and running the app.
- Document any security-vs-compatibility tradeoffs.
- Run full CI after each change.
- Update `.claude/loops/progress.md` after each item.
- Work on ONLY ONE item per invocation.

## Max Iterations

8

## Completion

When supply chain hardening complete and CI passes:

<promise>SUPPLY CHAIN HARDENING COMPLETE</promise>
