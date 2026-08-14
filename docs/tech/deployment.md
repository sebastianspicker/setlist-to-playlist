# Deployment

## Host-owned GitHub Pages static demo

GitHub Pages hosts only the sanitized, local-only workflow demo. It does not run
the Next.js application, call Showtape API routes, connect to MusicKit, or create
an Apple Music playlist.

Build and validate the exact Pages artifact locally:

```bash
corepack pnpm@9.15.3 demo:check
corepack pnpm@9.15.3 demo:build
```

The ignored output is `dist/pages`. Showtape intentionally does not own a Pages
deployment workflow. The established `sebastianspicker.github.io` workflow is
the sole deployer: it checks out a reviewed, immutable Showtape commit, runs the
same validation and build, and stages the artifact at `public/showtape` only
after Hugo's final clean build. The host then uploads one combined Pages
artifact.

Pushing Showtape does not publish the demo by itself. After a source revision is
reviewed and available remotely, advance `SHOWTAPE_REF` in the host workflow to
that full commit ID and validate the combined host artifact before deployment.
No application credentials are required by the static build or staging step.

## Supported live application process

One self-hosted Next.js process serves the browser application and all API
routes.

```bash
corepack pnpm@9.15.3 install --frozen-lockfile
corepack pnpm@9.15.3 build
corepack pnpm@9.15.3 --filter web start
```

Node.js 20 or later is required. The repository does not provide a container
image, process supervisor, reverse-proxy configuration, or full-application
deployment workflow.

## Environment

Set these values in the process environment:

| Variable                         | Description                           |
| -------------------------------- | ------------------------------------- |
| `APPLE_TEAM_ID`                  | Apple Developer Team ID               |
| `APPLE_KEY_ID`                   | MusicKit key ID                       |
| `APPLE_PRIVATE_KEY`              | Full PEM private key                  |
| `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` | Browser MusicKit application ID       |
| `SETLISTFM_API_KEY`              | Server-side setlist.fm API key        |
| `ALLOWED_ORIGIN`                 | Comma-separated exact browser origins |

Leave `NEXT_PUBLIC_API_URL` unset for the included same-origin routes.

`NEXT_PUBLIC_*` values are incorporated into the browser build. Set production
values before running `build`.

## Reverse proxy

Terminate TLS before the Next.js process and preserve the request origin.
Set `TRUST_PROXY=1` only if the proxy removes client-supplied forwarded-IP
headers and writes trusted `X-Forwarded-For` or `X-Real-IP` values.

Without a trusted client key, per-client route limiting is disabled and API
responses include:

```text
X-RateLimit-Policy: disabled-direct-no-trusted-client-key
```

The application still uses bounded in-memory caches and limiter storage. These
structures are per process and are not shared across instances.

## Health check

After deployment:

```bash
curl --fail --silent https://your-app.example.com/api/health
```

A successful response confirms that the Next.js route is running. It does not
verify Apple credentials, setlist.fm access, MusicKit authorization, or a
playlist write.

## Release boundary

CI verifies formatting, public-tree hygiene, linting, types, builds, tests,
production dependency audit, and mocked Chromium behavior. The host Pages
workflow deploys only the static demo and is not evidence that the live API or
MusicKit workflow is operational.

Operators must provide revision selection, deployment, monitoring, credential
checks, and rollback procedures.
