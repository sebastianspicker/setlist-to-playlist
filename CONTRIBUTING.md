# Contributing

## PR Style

- Open a branch from `main`, name it e.g. `feat/…`, `fix/…`, `docs/…`.
- Keep PRs focused; link to issues or exec plans if applicable.
- Ensure CI passes (lint, test, build).

## Lint / Test / Format / Build

- **Lint:** Run `pnpm lint` from the repo root. Fix any reported issues before pushing.
- **Test:** Run `pnpm test`. New logic in `packages/core` or shared code should include tests.
- **Format:** Use Prettier (project config in repo). Run `pnpm format` or rely on editor format-on-save with `.editorconfig`.
- **Build:** Run `pnpm build` to build all workspace packages; ensure it succeeds before pushing.

## Optional scripts

- **seed-demo-setlists:** With `SETLISTFM_API_KEY` set, run `npx tsx scripts/seed-demo-setlists.ts` to fetch demo setlists into `scripts/fixtures/demo-setlists.json` (useful for local dev or fixtures).
- **export-diagnostics:** Run `npx tsx scripts/export-diagnostics.ts` (optionally `--out report.json`) to export non-sensitive config for support; output is constrained under the current working directory.
- **cleanup-repo:** Run `bash scripts/cleanup-repo.sh` to remove local logs, OS artifacts, and build caches that should not be committed.

## No Secrets

Do not commit `.env`, API keys, or private keys. Use `.env.example` as a template with placeholders only.

## Questions

Open an issue, see [AGENTS.md](AGENTS.md), and use [docs/index.md](docs/index.md) as the docs entrypoint.
