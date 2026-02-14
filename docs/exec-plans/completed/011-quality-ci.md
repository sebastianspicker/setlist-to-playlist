# Completed: Quality and CI (T065–T070)

**Done:** 2025-02-14

## Summary

- **T065** – Unit tests in `packages/core/tests`: normalize (4), setlist-mapper (3), search-query (6). `pnpm test` in core passes.
- **T066** – Tests in `apps/api/tests`: health (1), dev-token (2), setlist-proxy (8, including mock fetch). `pnpm test` in api passes.
- **T067** – Lint (ESLint) runs in all packages via `pnpm lint`; passes. Fix or exclude only where necessary (one eslint-disable in MatchingView for intentional deps).
- **T068** – GitHub Actions workflow `.github/workflows/ci.yml`: on push/PR to main, runs pnpm install (frozen lockfile), pnpm lint, pnpm test, pnpm build.
- **T069** – CONTRIBUTING.md has "Lint / Test / Format" with `pnpm lint`, `pnpm test`, `pnpm format`. AGENTS.md updated with explicit commands and pointer to CONTRIBUTING.
- **T070** – E2e test not added (optional). Can be added later (e.g. Playwright in `apps/web/e2e/`) and wired into CI if desired.

## Files touched

- `.github/workflows/ci.yml` (new)
- `AGENTS.md` (tooling section)
- `docs/exec-plans/implementation-tasks.md` (progress, §11 done)
