# Tech Debt Tracker

Track known tech debt here. Link to issues or ADRs when applicable.

- **Rate limiting for dev-token:** Add rate limiting to `GET /api/apple/dev-token` to prevent abuse (see docs/exec-plans/completed/002-api-dev-token.md, docs/audit).
- **E2E tests for happy path:** Add Playwright (or similar) E2E test for the main flow: import setlist → preview → matching → create playlist.
- **URL state / deep links:** Persist step (import | preview | matching | export) in query or hash so refresh/bookmark preserves state.
- **Optional loading UI:** Route-level `loading.tsx` and/or skeleton in matching step while suggestions load.
