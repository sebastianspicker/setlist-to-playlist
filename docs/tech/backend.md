# Backend

**Option A (current structure):** Standalone `apps/api` with routes for `/apple/dev-token`, `/setlist/proxy`, `/health`. Can be deployed as serverless (Vercel, Netlify, etc.) or a small Node server. Developer Token is minted here; setlist.fm API key is used only in the proxy.

**Option B (alternative):** Use Next.js API Routes under `apps/web/src/app/api/` (e.g. `api/apple/dev-token/route.ts`, `api/setlist/proxy/route.ts`, `api/health/route.ts`) so one deployment serves both frontend and API. Same logic and env vars; only the hosting shape changes. Document which option is in use so switching later is straightforward.
