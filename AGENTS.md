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

- **Lint:** `pnpm lint` from root (ESLint; runs in all packages). Fix or exclude only where necessary.
- **Format:** `pnpm format` or format-on-save per `.editorconfig` / `.prettierrc`.
- **Test:** `pnpm test` from root runs workspace tests (core, api, shared, web). Run before pushing.
- **Build:** `pnpm build` from root builds all packages.

## Test Infrastructure

~160 tests across 23 test files (Vitest). Patterns used throughout:

- `vi.mock` for module-level mocks, `vi.stubGlobal` for browser globals (e.g. `fetch`, `window.sessionStorage`).
- Standard `describe` / `it` structure; `beforeEach` / `afterEach` for timer and mock cleanup.
- Test areas: normalization, search-query building, setlist mapping, dedupe, CORS headers, fetch helpers, API URL construction, MusicKit token/catalog/playlist, rate limiter memory bounds, route handlers (dev-token, setlist-proxy, health).

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to verify your work locally (lint, test, format).

Use this file as the single source of truth for agent and contributor behavior.
