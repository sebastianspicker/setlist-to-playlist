# Docs: API Documentation Completeness

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

`phases.07-docs-devex.sub_phases.01-api-docs.items`

You are ensuring all API routes are fully documented.
Work through items ONE AT A TIME.

## Audit Checklist

### Item: route-documentation

**Route Documentation**

For each route, verify docs exist with:

- Method and path
- Request parameters (query, body, headers)
- Response shape (success and error)
- Status codes
- Rate limits
- CORS behavior
- Example curl command

Routes to document:

- GET /api/setlist/proxy?id=...
- GET /api/apple/dev-token
- GET /api/health
- OPTIONS for each route (preflight)

### Item: error-response-documentation

**Error Response Documentation**

- Document the ApiErrorPayload shape
- Document all API_ERROR codes and when they occur
- Provide examples of error responses

### Item: authentication-documentation

**Authentication Documentation**

- How the Developer Token is obtained and used
- How the User Token works (MusicKit flow)
- Token lifecycle and refresh behavior

### Item: docs-tech-completeness

**docs/tech/ Completeness**

Check each file in docs/tech/ for accuracy:

- apple-music.md — still accurate?
- backend.md — reflects current route handler pattern?
- data-flow.md — reflects current data flow?
- frontend.md — reflects current component structure?
- security.md — reflects Phase 3 changes?
- setlistfm.md — still accurate?
- cache-components.md — still accurate?
- reliability.md — reflects Phase 4 improvements?

## Files to Read

- All files in `docs/tech/`
- All route handlers in `apps/web/src/app/api/`
- `packages/shared/src/types/api.ts`
- `ARCHITECTURE.md`

## Rules

- Documentation must match actual code behavior
- Include copy-pasteable examples
- Follow the existing doc style (no AI slop)
- Run `pnpm format` on .md files after changes
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE doc per invocation

## Max Iterations

8

## Completion

When API docs complete:

<promise>API DOCS COMPLETE</promise>
