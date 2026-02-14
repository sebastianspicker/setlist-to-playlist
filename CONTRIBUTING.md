# Contributing

## PR Style

- Open a branch from `main`, name it e.g. `feat/…`, `fix/…`, `docs/…`.
- Keep PRs focused; link to issues or exec plans if applicable.
- Ensure CI passes (lint, test, build).

## Lint / Test / Format

- **Lint:** Run `pnpm lint` from the repo root. Fix any reported issues before pushing.
- **Test:** Run `pnpm test`. New logic in `packages/core` or shared code should include tests.
- **Format:** Use the project formatter (Prettier or Biome). Run `pnpm format` or rely on editor format-on-save with `.editorconfig` / config in repo.

## No Secrets

Do not commit `.env`, API keys, or private keys. Use `.env.example` as a template with placeholders only.

## Questions

Open an issue or see [AGENTS.md](AGENTS.md) for how agents and contributors are expected to work in this repo.
