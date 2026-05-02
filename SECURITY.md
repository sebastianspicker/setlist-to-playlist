# Security

## Threat Model (Light)

- **Secrets:** Apple private key and setlist.fm API key must stay server-side. Developer Token (JWT) is short-lived and delivered over HTTPS; it must not be logged or stored in client storage beyond session use.
- **User data:** Apple Music authorization is handled by MusicKit in the browser; we do not store user passwords. Setlist data from setlist.fm is displayed and used only to build a playlist; we do not persist it unless we add optional caching (then only setlist ID and response, with access control).
- **APIs:** All calls to our API should use HTTPS. CORS is restricted to our frontend origin(s). Rate limiting on token and proxy endpoints reduces abuse. Upstream retry delays are capped locally so remote `Retry-After` headers cannot keep requests open indefinitely.
- **Dependencies:** Production dependency advisories are gated with `pnpm audit:security`, which fails on moderate-or-higher findings.

## Handling Tokens

- **Developer Token:** Generated server-side from env (Team ID, Key ID, private key). Never commit these; use `.env` and a secure secret store in production.
- **User Token:** Obtained and held by MusicKit in the client; we do not transmit or store it on our servers.
- **setlist.fm API key:** Used only in the server/proxy; never exposed to the client.

## Dependency Security

Run `pnpm audit:security` before release and when dependency locks change. The gate uses `pnpm audit --audit-level=moderate --prod` so frontend build-chain XSS advisories are caught before deployment.

## Reporting Vulnerabilities

Please report security issues privately (e.g. via maintainer contact or a private security advisory). Do not open public issues for sensitive vulnerabilities.
