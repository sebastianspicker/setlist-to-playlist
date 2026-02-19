# Frontend

Next.js App Router, TypeScript, React.

## App Router patterns

- **File conventions:** `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`; API routes under `app/api/*/route.ts`. No `page.tsx` in the same segment as `route.ts`.
- **Rendering:** Root page is a Server Component (static shell); interactive flow lives in a Client Component (`SetlistImportView`, `'use client'`) under `src/features/`. Data is fetched from the client via Route Handlers (setlist proxy, dev token) after user input, not in the RSC tree.
- **Route Handlers:** Use `NextRequest` / `NextResponse`; JSON via `jsonResponse()` (NextResponse.json + CORS). No dynamic segment params; query params via `request.nextUrl.searchParams`. OPTIONS for CORS preflight return 204 with CORS headers.
- **Loading and errors:** Segment-level `loading.tsx` (Suspense); `error.tsx` and `global-error.tsx` as Client Components with reset; `not-found.tsx` for 404 with `Link` back home.
- **Imports:** Prefer direct imports from source files (e.g. `@/components/ErrorAlert`) instead of barrel files (`@/components`) to keep bundle and build fast (Vercel React best practices: bundle-barrel-imports). Feature barrels under `features/*/index.ts` remain for external consumers but app code imports from the concrete file.

For Cache Components (Next 16+) and PPR, see [cache-components.md](cache-components.md).

## Config and API

The web app reads `NEXT_PUBLIC_API_URL` (and `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`) from the environment; see `apps/web/src/lib/config.ts`. API_BASE_URL is used consistently for the Developer Token and setlist proxy requests. All client-side API calls should use `apiUrl()`, `devTokenUrl()`, `setlistProxyUrl()`, or `healthUrl()` from `apps/web/src/lib/api.ts` so that changing `NEXT_PUBLIC_API_URL` changes the requests. In dev, set `NEXT_PUBLIC_API_URL` to the API origin (e.g. `http://localhost:3000` if the API is served from the same Next.js app, or the standalone API URL if separate). PWA: `manifest.webmanifest` (linked in layout), icons in `public/icons/`. No service worker is implemented yet; optional for offline shell (e.g. next-pwa or custom). Features live under `apps/web/src/features` (setlist-import, matching, playlist-export). MusicKit JS is loaded in the client; Developer Token is fetched from our API. State: local component state or lightweight store for setlist and match results; no persistence beyond session.
