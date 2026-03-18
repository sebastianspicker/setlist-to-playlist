# Contributing

## PR Style

- Open a branch from `main`, name it e.g. `feat/…`, `fix/…`, `docs/…`.
- Keep PRs focused; link to issues or exec plans if applicable.
- Ensure CI passes (format check, lint, build, test, dependency audit).

## Lint / Test / Format / Build

- **Lint:** Run `pnpm lint` from the repo root. Fix any reported issues before pushing.
- **Test:** Run `pnpm test`. New logic in `packages/core` or shared code should include tests.
- **Format:** Use Prettier (project config in repo). Run `pnpm format` or rely on editor format-on-save with `.editorconfig`.
- **Build:** Run `pnpm build` to build all workspace packages; ensure it succeeds before pushing.

CI enforces all of the above (format check, lint, build, test, dependency audit) on every push and PR.

## Pre-commit hooks (optional)

You can run lint and format checks automatically before each commit using [`simple-git-hooks`](https://github.com/toplenboren/simple-git-hooks) or [`husky`](https://typicode.github.io/husky/). Example with `simple-git-hooks`:

```bash
pnpm add -D simple-git-hooks
```

Add to root `package.json`:

```json
"simple-git-hooks": {
  "pre-commit": "pnpm format:check && pnpm lint"
}
```

Then run `npx simple-git-hooks` once to install. CI will catch any issues that slip through.

## Optional scripts

- **seed-demo-setlists:** With `SETLISTFM_API_KEY` set, run `npx tsx scripts/seed-demo-setlists.ts` to fetch demo setlists into `scripts/fixtures/demo-setlists.json` (useful for local dev or fixtures).
- **export-diagnostics:** Run `npx tsx scripts/export-diagnostics.ts` (optionally `--out report.json`) to export non-sensitive config for support; output is constrained under the current working directory.
- **cleanup-repo:** Run `bash scripts/cleanup-repo.sh` to remove local logs, OS artifacts, and build caches that should not be committed.

## No Secrets

Do not commit `.env`, API keys, or private keys. Use `.env.example` as a template with placeholders only.

## Questions

Open an issue, see [AGENTS.md](AGENTS.md), and use [docs/index.md](docs/index.md) as the docs entrypoint.
