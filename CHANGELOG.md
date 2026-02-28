# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Documentation & Cleanup

- Product docs consolidated: PRD is now the single source for problem, scope, stories, onboarding and success metrics.
- Redundant docs removed from `docs/product-specs` and `docs/design-docs`.
- Added `scripts/cleanup-repo.sh` and root script `pnpm cleanup:repo` for local artifact cleanup.

### Platform & Tooling

- Upgraded `apps/web` to Next.js `16.x` and moved app-level edge logic from deprecated `middleware.ts` to `src/proxy.ts`.
- Migrated web lint script from `next lint` to ESLint CLI.
- Added `@repo/ui` as a web dependency and unified button primitive usage.

### API & Error Semantics

- Added structured API error payload support with optional `code` in shared types.
- Added dev-token endpoint rate limiting (`429`, `Retry-After`, `RATE_LIMIT` code).
- Unified API route helpers for `OPTIONS` and internal error responses.
- Setlist proxy now returns structured errors with mapped codes (`BAD_REQUEST`, `NOT_FOUND`, `RATE_LIMIT`, `SERVICE_UNAVAILABLE`).

### Refactor & Features

- Refactored MusicKit integration into modules (`token`, `client`, `catalog`, `playlist`) behind a stable barrel.
- Split matching flow into dedicated hook/components:
  - `useMatchingSuggestions`
  - `MatchingBulkActions`
  - `MatchRowItem`
  - `TrackSearchPanel`
- Added matching bulk actions: refresh suggestions, skip unmatched, reset all.
- Added import history with local persistence and quick re-import actions.
- Added export QoL features:
  - Optional ordered track dedupe before playlist creation.
  - Session-based resume for failed “add tracks” operations.

### Core Utilities & Tests

- Added `@repo/core` utilities:
  - `buildPlaylistName`
  - `dedupeTrackIdsOrdered`
  - `getSetlistSignature`
- Expanded tests in `packages/core` and `apps/web` (rate limiter).

## [0.1.0] – Initial

- Initial monorepo structure: apps (web, api), packages (core, shared, ui), docs, infra, scripts.
