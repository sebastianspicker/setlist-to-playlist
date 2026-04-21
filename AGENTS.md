# AGENTS.md – AI Agent Instructions

This file provides guidance for AI coding agents (GitHub Copilot, Cursor, Codex, Kilo, etc.) working in this repository.

## Repository Snapshot

- **Monorepo:** pnpm workspaces + Turborepo
- **Apps:** `apps/web` (Next.js 16 PWA + API routes), `apps/api` (shared serverless logic)
- **Packages:** `packages/core` (domain logic), `packages/shared` (types/utils), `packages/ui` (design system placeholder)
- **Language:** TypeScript (strict), React 19, Node ≥ 20

## Key Conventions

- **No secrets in code.** All credentials go in `.env` (gitignored). Use `.env.example` as a template with placeholder values only.
- **No committed key material.** Test keys must be generated at runtime (see `apps/api/tests/dev-token.test.ts` for the pattern using `generateKeyPairSync`).
- **ESM everywhere.** All packages use `"type": "module"`. Use `.js` extensions in TypeScript import paths.
- **Tests with Vitest.** Test files live in `tests/` within each package/app. Use `vi.mock` and `vi.stubGlobal` for mocks. Run `pnpm test` from root.
- **Formatting:** Prettier (`.prettierrc`). Run `pnpm format` or check with `pnpm format:check`.
- **Lint:** ESLint (`eslint.config.mjs`). Run `pnpm lint`. Zero warnings on `apps/web`.
- **Build order:** Turborepo handles dependency order (`core` → `shared` → `api` → `web`).

## Verification Before Commit

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

## Architecture Summary

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full data flow and token handling. The short version:

1. User pastes a setlist.fm URL → our API proxy fetches it server-side (API key never leaves server).
2. Apple Music track matching via MusicKit in the browser using a short-lived Developer Token from our backend.
3. Playlist creation via MusicKit (user's Apple token, stays in the browser).

## What to Avoid

- Don't add `console.log` with env var values (especially credentials).
- Don't commit build artifacts (`.next/`, `dist/`, `coverage/`) — they're gitignored.
- Don't add new dependencies without checking whether the existing ecosystem covers the need.
- Don't use barrel files for internal imports within features; use direct paths.
- Don't touch `deprecated/` — those are archived audit files; they're gitignored and not tracked.

## Docs Map

| Doc                         | Contents                                                                         |
| --------------------------- | -------------------------------------------------------------------------------- |
| `ARCHITECTURE.md`           | System design, flows, token handling, caching, hooks                             |
| `docs/tech/`                | Frontend, backend, Apple Music, setlist.fm, security, reliability, API reference |
| `docs/product-specs/PRD.md` | Scope, stories, success criteria                                                 |
| `docs/adr/`                 | Architecture Decision Records                                                    |
| `CONTRIBUTING.md`           | PR workflow, test conventions, pre-push checklist                                |
