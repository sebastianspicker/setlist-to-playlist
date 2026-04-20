# Deployment

## Overview

The app is a single Next.js deployment — one process serves both the PWA and all API routes (`/api/apple/dev-token`, `/api/setlist/proxy`, `/api/health`). No separate API server is required.

## Recommended Platform: Vercel

Vercel has first-class Next.js support and zero-config deployment.

### Steps

1. **Fork / connect:** Connect the repository to [Vercel](https://vercel.com). Select `apps/web` as the root directory (or configure `vercel.json` if using the repo root).
2. **Set environment variables** in the Vercel dashboard (Settings → Environment Variables):

   | Variable | Value |
   |---|---|
   | `APPLE_TEAM_ID` | Your Apple Developer Team ID |
   | `APPLE_KEY_ID` | Your MusicKit key ID |
   | `APPLE_PRIVATE_KEY` | Full contents of the `.p8` file, newlines as `\n` |
   | `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` | Your MusicKit app identifier |
   | `SETLISTFM_API_KEY` | Your setlist.fm API key |
   | `ALLOWED_ORIGIN` | Your production URL, e.g. `https://your-app.vercel.app` |

   Leave `NEXT_PUBLIC_API_URL` unset (same-origin). Set `TRUST_PROXY=1` **only** if behind a reverse proxy that sets `X-Forwarded-For`.

3. **Deploy:** Vercel auto-deploys on push to the connected branch. Check the deployment logs and run `GET /api/health` to verify liveness.

4. **Update README:** Add the live URL to `README.md` once available.

## Alternative: Netlify

Netlify supports Next.js via the `@netlify/plugin-nextjs` adapter.

1. Add a `netlify.toml` at the repo root:
   ```toml
   [build]
     base = "apps/web"
     command = "pnpm build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```
2. Set the same environment variables in Netlify's dashboard (Site Settings → Environment Variables).
3. Deploy via the Netlify CLI or connected Git repository.

## Alternative: Self-Hosted (Node.js)

```bash
pnpm install --frozen-lockfile
pnpm build
# From apps/web:
node .next/standalone/apps/web/server.js
```

Requires Node ≥ 20 and all environment variables set in the process environment. Serve behind a reverse proxy (nginx, Caddy) with TLS. Set `TRUST_PROXY=1` and `ALLOWED_ORIGIN` accordingly.

## Release Process

This repository uses a `dev` → `main` promotion model:

1. All feature work lands on `dev` (CI runs automatically on every push/PR to `dev`).
2. When ready to release: open a PR from `dev` → `main`. CI must pass.
3. Merge to `main`. The deploy workflow (once configured) triggers deployment.
4. Tag the release: `git tag v<semver>` following the `CHANGELOG.md` version.

> **Note:** A GitHub Actions deploy workflow (e.g. `deploy.yml`) should be added to automate step 3. Until then, deploy manually from `main` via the Vercel/Netlify dashboard.

## Health Check

After deployment, verify:

```bash
curl https://your-app.example.com/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

## Environment Variables Reference

See [`.env.example`](../../.env.example) for the full list with inline documentation.
