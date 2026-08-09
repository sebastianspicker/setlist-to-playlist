# Security Policy

## Supported versions

Security fixes are applied to the current `0.3.0-alpha` development line. Older
snapshots are unsupported.

## Reporting a vulnerability

Use a
[private GitHub security advisory](https://github.com/sebastianspicker/showtape/security/advisories/new).
Do not open a public issue for a vulnerability, exposed credential, or private
user data.

Include the affected path or endpoint, reproduction conditions, observed
impact, and whether credentials or external data may have been exposed. Do not
include live secrets. The repository does not specify response or disclosure
time commitments.

## Security boundaries

- `APPLE_PRIVATE_KEY`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and
  `SETLISTFM_API_KEY` are server-side values.
- The Apple developer token is minted by the server and returned to the browser
  for MusicKit initialization.
- The MusicKit user token remains in the browser and is not sent to Showtape API
  routes.
- Successful setlist responses can remain in process memory for one hour.
- Browser import history contains only user input and parsed setlist ID.
- API routes validate input, restrict CORS, and use bounded in-memory rate
  limiting when a trusted client key is available.
- `TRUST_PROXY=1` is valid only behind a reverse proxy that replaces forwarded
  client IP headers.
- `corepack pnpm@9.15.3 hygiene:check` rejects common credential files, private
  key markers, local tool state, reports, and absolute home paths.
- `corepack pnpm@9.15.3 audit:security` checks production dependencies at
  moderate severity or higher.

## CI dependency integrity

Every third-party GitHub Action is pinned to a reviewed full commit SHA, with
the corresponding release version retained as a comment in the workflow.
Action updates require reviewing the upstream release and changing the SHA and
version comment together. The public-boundary check rejects mutable action
references.

Operators are responsible for TLS, secret storage, proxy configuration, access
logs, monitoring, backups, and incident response.
