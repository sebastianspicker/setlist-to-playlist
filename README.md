# Setlist to Playlist

[![CI](https://github.com/sebastianspicker/setlist-to-playlist/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastianspicker/setlist-to-playlist/actions/workflows/ci.yml)

Turn any concert setlist into an Apple Music playlist in seconds.

Paste a [setlist.fm](https://www.setlist.fm) link, preview the tracks, fix any mismatches, and save the playlist straight to your Apple Music library.

### How it works

1. **Paste** a setlist.fm URL (or setlist ID)
2. **Preview** the artist, venue, date, and full track list
3. **Match** each song to the right Apple Music track (auto-suggested, manually adjustable)
4. **Create** the playlist in your Apple Music library with one tap

### Features

- Import any setlist from setlist.fm by URL or ID
- Automatic Apple Music track matching with manual override
- Search Apple Music to fix unmatched or incorrect tracks
- Duplicate track removal before export
- Resumable playlist creation if adding tracks is interrupted
- Recent imports history for quick re-access
- Progressive Web App — installable on mobile and desktop
- Fully accessible (keyboard navigation, screen reader support, WCAG touch targets)
- Dark glass-morphism UI optimized for mobile and desktop

> **About this project**
> This repository was built with AI-assisted development (Cursor, Codex, Kilo Code). From structure and docs to implementation and tests — all created with AI support. The approach follows the methodology documented in [Harness Engineering](https://openai.com/index/harness-engineering/).

## Prerequisites

- **Node.js** ≥ 20 (see `engines` in root `package.json`)
- **pnpm** ≥ 9 (the repo uses a pnpm workspace)

## Environment

Copy `.env.example` to `.env` in the repo root and set:

- **Apple Music:** `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (for the Developer Token), and `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` (MusicKit in the browser). See [docs/tech/apple-music.md](docs/tech/apple-music.md).
- **setlist.fm:** `SETLISTFM_API_KEY` (used only by the server-side proxy; never sent to the client). See [docs/tech/setlistfm.md](docs/tech/setlistfm.md).
- **Optional:** `NEXT_PUBLIC_API_URL` – base URL for API calls. Leave unset for same-origin (default when the app and API run together). Set only when the API is served from a different origin.
- **Production CORS:** `ALLOWED_ORIGIN` – required when the app is deployed; see [docs/tech/security.md](docs/tech/security.md) and `.env.example`.
- **Proxy deployments:** `TRUST_PROXY=1` only when a trusted reverse proxy sets `X-Forwarded-For` / `X-Real-IP` on your behalf. Leave it unset for direct deployments.

## Quick Start

```bash
cp .env.example .env   # then fill in your API keys (see Environment above)
pnpm install
pnpm build
pnpm dev
```

Then open the web app at `http://localhost:3000`. The same process runs both the Next.js frontend and the API routes (Developer Token, setlist proxy, health); no separate API server is required for local development.

## Demo

- Live local demo route: `http://localhost:3000/demo`
- The `/demo` page is a **static, no-API-key-required** screen that renders a fixed setlist preview. It is used for reproducible screenshots, CI smoke tests, and GitHub social previews. No real setlist.fm or Apple Music calls are made.
- To update the demo data, edit the fixture in `apps/web/src/app/demo/`. Update the screenshots in `docs/screenshots/github/` after any significant UI change.

### Screenshots

#### App Home

![App Home](docs/screenshots/github/app-home.png)

#### Demo Flow (Desktop)

![Demo Desktop](docs/screenshots/github/demo-desktop.png)

#### Demo Flow (Mobile)

![Demo Mobile](docs/screenshots/github/demo-mobile.png)

## Monorepo Overview

| Path              | Description                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | Next.js PWA: Import → Preview → Matching → Export. Hosts API routes at `/api/*` (dev-token, setlist proxy, health).                          |
| `apps/api`        | Shared serverless logic (JWT signing, setlist proxy handler). Used by the web app's API routes; not run as a standalone server in this repo. |
| `packages/core`   | Domain logic: setlist parsing, track matching, normalization (no UI).                                                                        |
| `packages/shared` | Shared types, utils, constants.                                                                                                              |
| `packages/ui`     | Optional design system (placeholder).                                                                                                        |
| `docs/`           | Consolidated product spec (PRD), focused design docs, tech docs, and ADRs.                                                                   |
| `deprecated/`     | Archived audit and inspection reports kept for historical reference.                                                                         |

See [ARCHITECTURE.md](ARCHITECTURE.md) for data flow and [docs/index.md](docs/index.md) for the docs map.

## Project Structure

```
.
├── README.md
├── AGENTS.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
├── SECURITY.md
├── PRIVACY.md
├── TERMS.md
├── .env.example
├── .gitignore
├── .editorconfig
├── .prettierrc
├── eslint.config.mjs
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── apps/
│   ├── web/                     # Next.js PWA + API routes
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── api/          # Next.js API routes
│   │   │   │   │   ├── apple/dev-token/
│   │   │   │   │   ├── setlist/proxy/
│   │   │   │   │   └── health/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   └── global-error.tsx
│   │   │   ├── features/
│   │   │   │   ├── setlist-import/
│   │   │   │   ├── matching/
│   │   │   │   └── playlist-export/
│   │   │   ├── lib/
│   │   │   ├── styles/
│   │   │   └── types/
│   │   ├── public/
│   │   │   ├── manifest.webmanifest
│   │   │   └── icons/
│   │   ├── tests/
│   │   └── package.json
│   └── api/                      # Shared API logic (used by web's routes)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── apple/dev-token.ts
│       │   │   ├── setlist/proxy.ts
│       │   │   └── health.ts
│       │   ├── middleware/
│       │   └── lib/
│       ├── tests/
│       └── package.json
├── packages/
│   ├── core/                     # Domain logic
│   │   ├── src/
│   │   │   ├── setlist/
│   │   │   ├── matching/
│   │   │   ├── apple/
│   │   │   └── index.ts
│   │   └── tests/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   └── tests/
│   └── ui/                       # Design system (optional)
│       └── src/
├── docs/
│   ├── index.md
│   ├── product-specs/          # PRD as single source
│   ├── design-docs/            # UX flows + pointers to design system master
│   ├── design-system/
│   ├── tech/
│   └── adr/
├── deprecated/
│   └── *.md                    # Archived audits and inspection reports
└── scripts/
    ├── seed-demo-setlists.ts
    └── export-diagnostics.ts
```

## Scripts

| Command             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `pnpm install`      | Install dependencies for all workspace packages.         |
| `pnpm build`        | Build all packages (Turbo: core, shared, api, then web). |
| `pnpm dev`          | Start the Next.js dev server (web app and API routes).   |
| `pnpm lint`         | Run ESLint in all packages.                              |
| `pnpm typecheck`    | Run TypeScript checks across typed workspace packages.   |
| `pnpm test`         | Run tests in all packages.                               |
| `pnpm format`       | Format code with Prettier.                               |
| `pnpm format:check` | Check formatting without writing.                        |

Optional (run from repo root with `npx tsx`):

- **seed-demo-setlists:** `SETLISTFM_API_KEY=your_key npx tsx scripts/seed-demo-setlists.ts` – fetches demo setlists and writes `scripts/fixtures/demo-setlists.json` for local dev or tests.
- **export-diagnostics:** `npx tsx scripts/export-diagnostics.ts` or `npx tsx scripts/export-diagnostics.ts --out report.json` – exports non-sensitive env/config info for support or debugging (no secrets).
- **cleanup-repo:** `bash scripts/cleanup-repo.sh` – removes local non-source artifacts (logs, `.DS_Store`, build caches) without touching tracked source files.

## Deployment

See [docs/tech/deployment.md](docs/tech/deployment.md) for full instructions (Vercel, Netlify, self-hosted). The short version:

1. Set the required environment variables (see [Environment](#environment) above and `.env.example`).
2. Deploy the `apps/web` Next.js app to your platform of choice.
3. Verify with `GET /api/health` → `{"status":"ok"}`.

## Verification

Run the repo checks from the root:

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm lint
pnpm format:check
```

## Behavior Notes

- **Setlist IDs:** raw IDs and URL-derived IDs are validated as `4-12` hexadecimal characters.
- **Tape entries:** setlist.fm songs marked with `tape: true` are excluded from playlist mapping.
- **Interrupted exports:** if playlist creation succeeds but adding tracks stops partway through, the app stores only the remaining Apple Music song IDs in `sessionStorage` and resumes only those tracks. Resume data is ignored if the current matched tracks or duplicate-removal setting no longer match the stored export.

## License

See [LICENSE](LICENSE). For privacy and terms, see [PRIVACY.md](PRIVACY.md) and [TERMS.md](TERMS.md).
