# Security: Error Message Information Leakage Audit

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

`phases.04-security.sub_phases.04-error-message-audit.items`

You are auditing all error messages for information leakage.
Work through items ONE AT A TIME.

## Audit Checklist

### Item: server-side-error-messages

Trace every error path in API routes and check what reaches the client:

- `apps/api/src/routes/setlist/proxy.ts` — error messages from setlist.fm
  are forwarded (truncated at 500 chars). Could these leak internal info?
- `apps/api/src/routes/apple/dev-token.ts` — error response shapes
- `apps/web/src/app/api/_helpers.ts` — internalError sends a generic message
- `apps/api/src/lib/setlistfm.ts` — raw error text from setlist.fm API

### Item: client-side-error-exposure

- `apps/web/src/lib/fetch.ts` extractError — returns error strings from
  API responses directly to the UI
- `getErrorMessage` in `packages/shared` — returns err.message directly
- Check: could a malicious API response inject misleading error text?

### Item: stack-trace-prevention

- Verify no stack traces reach the client in production
- Check Next.js error boundaries: `error.tsx`, `global-error.tsx`
- Verify the production build strips detailed error info

### Item: logging-audit

- Search for all console.log, console.warn, console.error calls
- Verify none log sensitive data (tokens, API keys, user tokens, PII)
- Check MusicKit client.ts warning messages for sensitive content

### Item: error-code-consistency

- Verify all error responses use the ApiErrorCode enum
- Check that error messages follow the same format across all routes
- Verify no error message includes internal paths, stack frames,
  or implementation details

## Files to Read

- All files in `apps/web/src/app/api/`
- All files in `apps/api/src/routes/`
- `apps/web/src/lib/fetch.ts`
- `packages/shared/src/utils/error.ts`
- `apps/web/src/app/error.tsx`
- `apps/web/src/app/global-error.tsx`
- `apps/web/src/components/ErrorAlert.tsx`

## Rules

- Error messages visible to users should be helpful but not revealing
- Never expose: file paths, stack traces, internal IP addresses,
  dependency versions, configuration details
- Generic messages are better than detailed ones for 500 errors
- Run full CI after changes
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE audit area per invocation

## Max Iterations

8

## Completion

When error message audit complete and CI passes:

<promise>ERROR MESSAGE AUDIT COMPLETE</promise>
