# Reliability

- **Token refresh:** Developer Token has short expiry; client or a small middleware can request a new one when needed. Handle MusicKit auth errors (user revoked, expired) with a clear re-auth prompt.
- **setlist.fm:** Proxy can cache and throttle; on failure, show a retry option and avoid exposing stack traces.
- **PWA:** Optional offline support for already-loaded setlist view; export still requires network and Apple Music.
