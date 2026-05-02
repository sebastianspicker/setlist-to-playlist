# Security

- **Secrets:** All in env; never in code or commits. Use `.env.example` with placeholders.
- **Tokens:** Developer Token minted server-side; User Token stays in client. See SECURITY.md and docs/tech/apple-music.md.
- **API:** HTTPS only; CORS limited to our frontend; rate-limit token and proxy endpoints to reduce abuse.
- **Input:** Validate setlist ID/URL format before calling setlist.fm; sanitize any user-displayed content.
- **Rate-limit proxy trust:** forwarded client IP headers are ignored unless `TRUST_PROXY=1`. Enable that only behind a trusted reverse proxy that overwrites `X-Forwarded-For` / `X-Real-IP`.
- **Upstream waits:** setlist.fm `Retry-After` delays are capped by the proxy before retrying so a large upstream value cannot pin a server request for an unbounded period.
- **CSP:** script execution is nonce-based for app pages and the external MusicKit script. Inline styles remain allowed because Next.js still injects them.
- **Dependency gate:** `pnpm audit:security` runs `pnpm audit --audit-level=moderate --prod`; moderate-or-higher production advisories block CI.
