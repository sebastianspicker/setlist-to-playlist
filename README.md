# Showtape

[![CI](https://github.com/sebastianspicker/showtape/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastianspicker/showtape/actions/workflows/ci.yml)

Showtape is a network-dependent web application that imports one concert setlist
from setlist.fm, matches its songs to the Apple Music catalog, and creates an
ordered Apple Music playlist after user review.

## Purpose and scope

The application implements one workflow:

1. Import a setlist.fm URL or a 4 to 12 character hexadecimal setlist ID.
2. Review the show metadata and ordered non-tape songs.
3. Review suggested Apple Music matches, search manually, replace a match, or
   skip a song.
4. Authorize Apple Music and create a playlist from the selected tracks.

The repository is a pnpm workspace at version `0.3.0-alpha.1`. Its workspace
packages are marked private and are not configured for package publication.
Interfaces and configuration may change during alpha development.

## Static demo

[Open the Showtape workflow demo](https://sebastianspicker.github.io/showtape/).

The demo is a local-only click-through built from sanitized test fixture data
and the application's visual system. It does not call setlist.fm, connect to
Apple Music, or create a playlist. Every interactive action is visibly marked
as simulated. The user-site GitHub Pages workflow builds a reviewed, immutable
Showtape revision and publishes only this static demo at `/showtape/`; it does
not deploy the live application.

## Current capabilities

- Imports one setlist at a time through a server-side setlist.fm proxy.
- Preserves setlist.fm source attribution throughout the workflow.
- Searches the Apple Music catalog in batches and preserves manual corrections.
- Optionally removes duplicate Apple Music track IDs before export.
- Adds playlist tracks in batches of 100.
- Stores up to eight recent inputs and parsed setlist IDs in browser
  `localStorage`.
- Stores resumable export state in `sessionStorage` for up to 30 minutes when
  the remaining track IDs are known.
- Serves `/`, `/privacy`, `/terms`, `/api/health`,
  `/api/apple/dev-token`, and `/api/setlist/proxy`.

## Limitations

- Apple Music is the only export target.
- Batch import and merging are not implemented.
- Catalog matching is heuristic and may require manual correction.
- The application requires network access. It has no service worker, offline
  mode, or background synchronization.
- Automated browser tests mock setlist.fm and MusicKit. They do not verify live
  Apple authorization or playlist creation.
- Ambiguous Apple Music write failures are not retried automatically because
  the external operation may already have succeeded.
- GitHub Pages deployment covers only the static demo. The live application
  still has no deployment, release, or rollback automation.

## Requirements

- Node.js 20 or later
- Corepack
- pnpm 9.15.3
- A setlist.fm API key
- An Apple Developer account with MusicKit configured
- An Apple Music subscription for live playlist creation

## Installation

```bash
git clone https://github.com/sebastianspicker/showtape.git
cd showtape
cp .env.example .env
corepack pnpm@9.15.3 install --frozen-lockfile
corepack pnpm@9.15.3 build
corepack pnpm@9.15.3 dev
```

Open `http://localhost:3000`.

The Next.js process serves the browser application and its API routes.
`packages/api` exports reusable request handlers and does not start a separate
server.

## Configuration

Populate the local `.env` copied from `.env.example`. Do not commit the populated
file.

| Variable                         | Required       | Description                                                                                           |
| -------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| `SETLISTFM_API_KEY`              | Live import    | Server-side setlist.fm API key.                                                                       |
| `APPLE_TEAM_ID`                  | Live Apple use | Apple Developer Team ID used to sign the developer token.                                             |
| `APPLE_KEY_ID`                   | Live Apple use | MusicKit key ID.                                                                                      |
| `APPLE_PRIVATE_KEY`              | Live Apple use | MusicKit private key in PEM form. Keep it server-side.                                                |
| `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` | Live Apple use | MusicKit application identifier used by the browser.                                                  |
| `NEXT_PUBLIC_API_URL`            | No             | Alternate API base URL. Leave unset for the included same-origin routes.                              |
| `ALLOWED_ORIGIN`                 | Production     | Comma-separated CORS allowlist. When unset, only HTTP localhost and `127.0.0.1` origins are accepted. |
| `TRUST_PROXY`                    | No             | Set to `1` only when a trusted reverse proxy replaces forwarded client IP headers.                    |

The Apple private key may use literal `\n` sequences, as shown in
`.env.example`. Restart the development server after changing environment
variables.

See [Apple Music configuration](docs/tech/apple-music.md),
[setlist.fm configuration](docs/tech/setlistfm.md), and
[deployment](docs/tech/deployment.md).

## Usage

1. Enter a setlist.fm URL or ID and load the setlist.
2. Confirm the show and song order.
3. Review each Apple Music suggestion. Search, replace, or skip when needed.
4. Continue with at least one selected track.
5. Authorize Apple Music and create the playlist.

Recent-import controls perform a new import. They do not load a saved copy of
the upstream setlist.

## Repository structure

| Path              | Responsibility                                                                   |
| ----------------- | -------------------------------------------------------------------------------- |
| `apps/web`        | Next.js pages, API Route Handlers, browser workflow, and web tests.              |
| `packages/api`    | Reusable server-side handlers for token signing and setlist access.              |
| `packages/core`   | Setlist parsing, mapping, matching, naming, and track deduplication.             |
| `packages/shared` | Shared API types, constants, and utilities.                                      |
| `packages/ui`     | Shared React button component.                                                   |
| `docs`            | Architecture, integration, operation, product, and screenshot documentation.     |
| `scripts`         | Repository hygiene, diagnostics, fixture seeding, cleanup, and bundle reporting. |

See [architecture](docs/architecture.md) for runtime boundaries and
[docs/index.md](docs/index.md) for the documentation map.

## Development workflow

Run commands from the repository root.

| Command                               | Purpose                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `corepack pnpm@9.15.3 dev`            | Start the Next.js development server.                              |
| `corepack pnpm@9.15.3 format:check`   | Check formatting.                                                  |
| `corepack pnpm@9.15.3 hygiene:check`  | Check the public tree for local state and sensitive file patterns. |
| `corepack pnpm@9.15.3 lint`           | Run workspace ESLint checks.                                       |
| `corepack pnpm@9.15.3 typecheck`      | Build typed dependencies and type-check the web app.               |
| `corepack pnpm@9.15.3 test`           | Run workspace Vitest suites with coverage.                         |
| `corepack pnpm@9.15.3 build`          | Build all workspace packages.                                      |
| `corepack pnpm@9.15.3 audit:security` | Audit production dependencies at moderate severity or higher.      |
| `corepack pnpm@9.15.3 bundle:report`  | Report initial `/` JavaScript and CSS sizes after a build.         |

Optional local utilities:

```bash
SETLISTFM_API_KEY=your_key corepack pnpm@9.15.3 fixtures:seed
corepack pnpm@9.15.3 diagnostics:export -- --out reports/diagnostics.json
corepack pnpm@9.15.3 cleanup:repo
```

Fixture seeding calls setlist.fm and writes
`scripts/fixtures/demo-setlists.json`. Diagnostics contain environment variable
names, platform information, and the configured API base URL. Review either
output before sharing it.

## Testing

```bash
corepack pnpm@9.15.3 test
corepack pnpm@9.15.3 test:e2e
```

The Playwright suite uses Chromium, intercepted first-party API routes, and a
browser MusicKit mock. It covers the workflow, keyboard focus, selected
responsive widths, and serious or critical axe findings.

Additional browser commands:

```bash
corepack pnpm@9.15.3 test:e2e:screenshots
corepack pnpm@9.15.3 test:e2e:performance
```

The performance command runs a local production-mode LCP and CLS check. It is
not field performance data. See
[browser tests](apps/web/tests/e2e/README.md)
and [docs/screenshots/README.md](docs/screenshots/README.md).

## Deployment and operation

The sanitized static demo is produced by `scripts/build-pages-demo.mjs`. Its
generated `dist/pages` directory is an ignored deployment artifact, not
committed source. The established `sebastianspicker.github.io` Pages workflow
owns deployment: it checks out a reviewed, immutable Showtape revision, builds
the demo, and stages it at `/showtape/` in the host artifact. Updating this
repository does not publish the demo until that host-side revision pin is
reviewed and advanced. See [deployment](docs/tech/deployment.md).

The full application supports a self-hosted Node.js process:

```bash
corepack pnpm@9.15.3 install --frozen-lockfile
corepack pnpm@9.15.3 build
corepack pnpm@9.15.3 --filter web start
```

Run the process behind TLS, provide the required environment variables, and
configure the exact browser origin in `ALLOWED_ORIGIN`. The repository does not
provide a container image, process supervisor, reverse-proxy configuration, or
full-application deployment workflow.

After deployment, check `GET /api/health`. See
[docs/tech/deployment.md](docs/tech/deployment.md) for proxy and rate-limit
requirements.

## Troubleshooting

- `SETLISTFM_API_KEY is not set`: set the server-side key and restart the
  process.
- Missing Apple token configuration: set `APPLE_TEAM_ID`, `APPLE_KEY_ID`,
  `APPLE_PRIVATE_KEY`, and `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`.
- CORS rejection: add the exact browser origin to `ALLOWED_ORIGIN`. Do not use
  `*` or `null`.
- Per-client rate limiting is disabled: this is expected when no trusted client
  key is available. Set `TRUST_PROXY=1` only behind a proxy that replaces
  forwarded IP headers.
- Playwright cannot find Chromium: install the pinned browser or set
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a compatible local executable.
- No catalog match: search manually or skip the song.
- Ambiguous playlist write: inspect the Apple Music library before trying
  again.

## Security considerations

Keep Apple and setlist.fm credentials on the server. The MusicKit user token
remains in the browser and is not sent to the Showtape API routes. Use TLS in
deployment, restrict CORS, review logs and diagnostics before sharing them, and
do not trust forwarded client IP headers unless the reverse proxy replaces
them.

Report vulnerabilities through the private process in
[SECURITY.md](SECURITY.md). Data handling is documented in
[PRIVACY.md](PRIVACY.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Keep
changes focused, add tests for behavior changes, update affected documentation,
and report exact validation commands and results.

Source code is available under the [MIT License](LICENSE). Use of setlist.fm and
Apple services is also subject to their current terms.
