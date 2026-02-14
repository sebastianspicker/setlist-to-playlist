# Completed: API – Health and wiring (T021–T024)

**Done:** 2025-02-14

## Summary

- **T021** – GET `/api/health` exposed in `apps/web/src/app/api/health/route.ts`. Calls `handleHealth()` from api package; returns 200 and `{ status: "ok", timestamp: "..." }`.
- **T022** – `docs/tech/backend.md` updated: current setup is Option B (Next.js API routes), table of routes, how to run locally (`pnpm dev`), base URL behaviour, deployment note.
- **T023** – Documented that no separate API server is needed; full stack runs with `pnpm dev` (web serves API routes). Building the api package: `pnpm --filter api build` when needed.
- **T024** – `apps/web/src/lib/api.ts` added: `apiUrl(path)`, `devTokenUrl()`, `setlistProxyUrl()`, `healthUrl()` using `API_BASE_URL` from config. Frontend doc updated so all client-side API calls use these helpers; changing `NEXT_PUBLIC_API_URL` changes the requests.

## Files touched

- `apps/web/src/app/api/health/route.ts` (new)
- `docs/tech/backend.md` (rewritten)
- `docs/tech/frontend.md` (api.ts usage)
- `apps/web/src/lib/api.ts` (new)
- `docs/exec-plans/implementation-tasks.md` (progress)
