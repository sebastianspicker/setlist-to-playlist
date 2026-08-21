# Contributing

Discuss changes that alter the workflow, public interfaces, data retention, or
third-party integrations before implementation.

## Development setup

```bash
cp .env.example .env
corepack pnpm@9.15.3 install --frozen-lockfile
corepack pnpm@9.15.3 build
corepack pnpm@9.15.3 test
```

Unit and mocked browser tests do not need live service credentials. Live
setlist import and Apple Music operations do.

## Change requirements

- Keep each change focused.
- Preserve unrelated worktree changes.
- Add tests for behavior changes and regression fixes.
- Do not change public behavior only to satisfy an implementation-specific
  assertion.
- Keep credentials and user data out of source, fixtures, screenshots, logs,
  and diagnostics.
- Avoid new dependencies when the current toolchain is sufficient.
- Update documentation when commands, configuration, routes, or behavior
  change.

## Validation

Run the complete local gate before requesting review:

```bash
corepack pnpm@9.15.3 format:check
corepack pnpm@9.15.3 hygiene:check
corepack pnpm@9.15.3 lint
corepack pnpm@9.15.3 typecheck
corepack pnpm@9.15.3 test
corepack pnpm@9.15.3 build
corepack pnpm@9.15.3 audit:security
```

Use `corepack pnpm@9.15.3 --filter <package-name> test` for a narrower workspace
test while developing.

For UI changes, inspect keyboard operation, focus movement, loading, empty,
error, and terminal states at both narrow and desktop widths.

## Pull requests

Include:

- the problem and the resulting behavior;
- compatibility or configuration impact;
- exact validation commands and results;
- screenshots when they help reviewers inspect a visible change;
- a clear distinction between mocked tests and live integration checks.

Do not include credentials, private URLs, account identifiers, or personal data.
Use the repository pull request template.

## Security reports

Do not open a public issue for a vulnerability, exposed credential, or private
user data. Follow [SECURITY.md](SECURITY.md).
