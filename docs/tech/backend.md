# Backend

## Current setup (Option B)

The API is served by the **Next.js app** (`apps/web`) via API Routes. One deployment serves both frontend and API; no separate API server.

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Liveness check. Returns `{ status: "ok", timestamp: "..." }`. Use for load balancers and deployment health checks. |
| `GET /api/apple/dev-token` | Apple Developer Token (JWT) for MusicKit. Returns `{ token: "..." }` or structured errors (including `code`). Includes lightweight in-memory rate limiting (`429`, `Retry-After`). |
| `GET /api/setlist/proxy?id=...` or `?url=...` | setlist.fm proxy. Returns setlist JSON or structured errors `{ error, code? }`. API key stays server-side. |

Business logic lives in the `api` package (`apps/api`); the Next.js routes import from `api` and return HTTP responses (with CORS where needed).

## How to run locally

- **Full stack:** From the repo root run `pnpm dev`. This starts the Next.js app (web), which serves the app and the API routes. Open `http://localhost:3000`.
- **No separate API process:** The API is not a standalone server. Building the `api` package is done automatically when building the web app (`api` is a dependency and listed in `transpilePackages`). To build only the API package: `pnpm --filter api build`.

## Base URL

- **Same-origin:** When the web app is served from the same host (e.g. `http://localhost:3000`), the frontend calls `/api/...` (relative). No `NEXT_PUBLIC_API_URL` needed.
- **Separate API (optional):** If you later run the API as a standalone server, set `NEXT_PUBLIC_API_URL` to that origin (e.g. `http://localhost:3001`). The frontend uses it for dev-token and setlist proxy requests (see `apps/web/src/lib/config.ts` and `api.ts`).

## Deployment

Deploy the Next.js app (e.g. Vercel, Netlify). The same deployment serves pages and API routes. Set env vars (`APPLE_*`, `SETLISTFM_API_KEY`, `ALLOWED_ORIGIN`, etc.) in the deployment environment.

---

**Option A (alternative):** A standalone `apps/api` server could expose the same routes and be deployed separately (e.g. serverless functions or a Node server). The `api` package is built for that; only the HTTP layer would live in a separate app. Document which option is in use when switching.
