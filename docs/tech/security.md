# Security

- **Secrets:** All in env; never in code or commits. Use `.env.example` with placeholders.
- **Tokens:** Developer Token minted server-side; User Token stays in client. See SECURITY.md and docs/tech/apple-music.md.
- **API:** HTTPS only; CORS limited to our frontend; rate-limit token and proxy endpoints to reduce abuse.
- **Input:** Validate setlist ID/URL format before calling setlist.fm; sanitize any user-displayed content.
