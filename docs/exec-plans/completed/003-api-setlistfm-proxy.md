# Completed: API – setlist.fm proxy (T013–T020)

**Done:** 2025-02-14

## Summary

- **T013** – Route that accepts setlist ID or URL and forwards to setlist.fm: `handleSetlistProxy` in `apps/api/src/routes/setlist/proxy.ts`, exposed as GET `apps/web/src/app/api/setlist/proxy?id=...` or `?url=...`.
- **T014** – `SETLISTFM_API_KEY` read from env; request to setlist.fm uses header `x-api-key`.
- **T015** – `parseSetlistIdFromInput` in `apps/api/src/lib/setlistfm.ts`: extracts ID from setlist.fm URLs (e.g. `...-63de4613.html`) or uses raw ID.
- **T016** – Non-2xx from setlist.fm mapped to 404, 503, or original status; error body with clear message.
- **T017** – On 429: exponential backoff (up to 2 retries), then return message "setlist.fm rate limit exceeded. Please try again in a moment."
- **T018** – In-memory cache in `setlistfm.ts`: TTL 1 hour, keyed by setlist ID.
- **T019** – CORS on setlist proxy route (same pattern as dev-token: `ALLOWED_ORIGIN` or request origin for localhost/https).
- **T020** – Test setlist ID `63de4613` documented in `docs/tech/setlistfm.md`. Unit tests in `apps/api/tests/setlist-proxy.test.ts` (parse ID, missing key, invalid id, success mock, 404, 429).

## Files touched

- `apps/api/src/lib/setlistfm.ts` (new)
- `apps/api/src/routes/setlist/proxy.ts` (rewritten)
- `apps/api/src/index.ts` (export proxy)
- `apps/web/src/app/api/setlist/proxy/route.ts` (new)
- `apps/api/tests/setlist-proxy.test.ts` (new)
- `docs/tech/setlistfm.md` (test setlist ID section)
- `docs/exec-plans/implementation-tasks.md` (progress)
