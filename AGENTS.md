# Agent Guidelines (Setlist to Playlist)

How a coding agent (or human) should work in this repo.

## Conventions

- **Branching:** Feature branches from `main`; short names e.g. `feat/import-ui`, `fix/token-refresh`.
- **Commits:** Clear, present-tense messages; no secrets or credentials in commit messages or code.
- **Tests:** Unit tests for `packages/core` and shared utils; integration tests for API routes; optional e2e for critical flows. Run `pnpm test` before pushing.
- **Definition of Done:** Code builds, lint passes, tests pass, no new secrets introduced, docs updated if behavior or API changes.

## What Not To Do

- **No secrets:** Never commit `.env`, API keys, or private keys. Use `.env.example` with placeholders only.
- **No bypassing security:** Developer Token must be minted server-side; setlist.fm API key should not be exposed in the client if a proxy exists.

## Feature Slicing

- Features are split by domain: setlist-import, matching, playlist-export. Each lives under `apps/web/src/features/<name>` and can use `packages/core` for pure logic.
- API routes are thin: auth/cors in middleware, business logic in `packages/core` or `apps/api/src/lib`.

## Tooling

- **Lint:** `pnpm lint` (ESLint or Biome, see root config).
- **Format:** `pnpm format` or format-on-save per `.editorconfig` / `.prettierrc`.
- **Test:** `pnpm test` from root runs workspace tests.

Use this file as the single source of truth for agent and contributor behavior.
