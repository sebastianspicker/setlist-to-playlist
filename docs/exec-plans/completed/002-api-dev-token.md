# Completed: API – Developer Token (T006–T012)

**Done:** 2025-02-14

## Summary

- **T006** – JWT signing in `apps/api/src/lib/jwt.ts` with `jose`: ES256, `kid` = Key ID, `iss` = Team ID, `iat`/`exp` (1 h validity).
- **T007** – `handleDevToken` reads `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` from env; returns `{ error: "Missing Apple credentials in environment" }` when any is missing (no crash).
- **T008** – GET route: `apps/web/src/app/api/apple/dev-token/route.ts` returns JSON `{ token: "<jwt>" }` or `{ error: "<message>" }` (503 on error).
- **T009** – CORS on dev-token route: `Access-Control-Allow-Origin` from `ALLOWED_ORIGIN` or, in dev, request origin when localhost/https.
- **T010** – Rate limiting not implemented; documented in `docs/tech/apple-music.md` (Security Notes).
- **T011** – Dependency `jose` added in `apps/api/package.json`.
- **T012** – `apps/api/tests/dev-token.test.ts`: missing env → error; with fixture key → JWT returned (shape asserted). Fixture key in `tests/fixtures/apple-test-key.pem`.

## Notes

- API logic lives in `apps/api`; HTTP is exposed via Next.js API route in `apps/web` (same-origin in one deployment). Web depends on `api` workspace package; `api` is built before web.
- Optional: set `ALLOWED_ORIGIN` (e.g. `http://localhost:3000`) for strict CORS when frontend and API share the same app.
