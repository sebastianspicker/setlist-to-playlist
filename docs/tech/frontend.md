# Frontend

Next.js App Router (v16), TypeScript, React.

## App Router patterns

- **File conventions:** `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`; API routes under `app/api/*/route.ts`; global edge interception via `src/proxy.ts` (Next 16).
- **Rendering:** Root page is a Server Component (static shell); interactive flow lives in a Client Component (`SetlistImportView`, `'use client'`) under `src/features/`. Data is fetched from the client via Route Handlers (setlist proxy, dev token) after user input, not in the RSC tree.
- **Route Handlers:** Use `NextRequest` / `NextResponse`; JSON via `jsonResponse()` (NextResponse.json + CORS). No dynamic segment params; query params via `request.nextUrl.searchParams`. OPTIONS for CORS preflight return 204 with CORS headers.
- **Loading and errors:** Segment-level `loading.tsx` (Suspense); `error.tsx` and `global-error.tsx` as Client Components with reset; `not-found.tsx` for 404 with `Link` back home.
- **Imports:** Prefer direct imports from source files (e.g. `@/components/ErrorAlert`) instead of barrel files (`@/components`) to keep bundle and build fast. Feature barrels under `features/*/index.ts` remain for external consumers.

For Cache Components (Next 16+) and PPR, see [cache-components.md](cache-components.md).

## Config and API

Config lives in `apps/web/src/lib/config.ts`. It reads `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` from the environment. All client-side API calls go through the helpers in `apps/web/src/lib/api.ts` (`apiUrl()`, `devTokenUrl()`, `setlistProxyUrl()`, `healthUrl()`), so changing `NEXT_PUBLIC_API_URL` is the single knob to redirect all requests. In dev, if the API and web app share the same Next.js process, leave `NEXT_PUBLIC_API_URL` unset (same-origin) or set it to `http://localhost:3000`.

## Features and MusicKit

Features live under `apps/web/src/features/`: `setlist-import`, `matching`, and `playlist-export`. MusicKit client logic is split into `lib/musickit/` modules — one each for token caching, SDK init, catalog search, and playlist writes.

## PWA

`manifest.webmanifest` is linked in the root layout; icons are in `public/icons/`. No service worker is implemented; offline support for the export step isn't feasible anyway (requires network and Apple Music auth).
