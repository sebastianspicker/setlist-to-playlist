# Deployment

## Overview

The app is a single Next.js deployment — one process serves both the PWA and all API routes (`/api/apple/dev-token`, `/api/setlist/proxy`, `/api/health`). No separate API server is required.

## Self-Hosted Node.js

```bash
pnpm install --frozen-lockfile
pnpm build
# From apps/web:
node .next/standalone/apps/web/server.js
```

Requires Node >= 20 and all environment variables set in the process environment. Serve behind a reverse proxy (Traefik, nginx, or Caddy) with TLS. Set `TRUST_PROXY=1` only when that reverse proxy overwrites forwarded IP headers.

| Variable                         | Value                                             |
| -------------------------------- | ------------------------------------------------- |
| `APPLE_TEAM_ID`                  | Your Apple Developer Team ID                      |
| `APPLE_KEY_ID`                   | Your MusicKit key ID                              |
| `APPLE_PRIVATE_KEY`              | Full contents of the `.p8` file, newlines as `\n` |
| `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` | Your MusicKit app identifier                      |
| `SETLISTFM_API_KEY`              | Your setlist.fm API key                           |
| `ALLOWED_ORIGIN`                 | Your production origin                            |
| `TRUST_PROXY`                    | `1` only behind a trusted reverse proxy           |

Leave `NEXT_PUBLIC_API_URL` unset when the web app and API routes are served from the same origin.

## Release Process

This repository uses a `dev` → `main` promotion model:

1. All feature work lands on `dev` (CI runs automatically on every push/PR to `dev`).
2. When ready to release: open a PR from `dev` → `main`. CI must pass.
3. Merge to `main`. The deploy workflow (once configured) triggers deployment.
4. Tag the release: `git tag v<semver>` following the `CHANGELOG.md` version.

> **Note:** A GitHub Actions deploy workflow (for example `deploy.yml`) can be added later if this repo should trigger a self-hosted rollout automatically after `main` passes CI.

## Health Check

After deployment, verify:

```bash
curl https://your-app.example.com/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

## Environment Variables Reference

See [`.env.example`](../../.env.example) for the full list with inline documentation.
