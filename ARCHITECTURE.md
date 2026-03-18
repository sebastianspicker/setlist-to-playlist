# Architecture Overview

## Goal

Import a setlist from setlist.fm (URL or ID) → preview and optionally correct track matches → create an Apple Music playlist in the user's account.

## Deployment Model

In this repo, the **web app** (Next.js) serves both the PWA and the API. The API is implemented as Next.js Route Handlers under `apps/web/src/app/api/`, which delegate to the shared logic in the `api` package (JWT signing, setlist proxy). There is no separate API server for local development or default deployment.

## Components and Data Flow (ASCII)

```
+------------------+     +------------------+
|   PWA (Next.js)  |     |   External       |
|   - Import UI    |     |   - Apple Music  |
|   - Matching UI  |---->|     API          |
|   - Export UI    |     |   - setlist.fm   |
|   - MusicKit JS  |     |     API          |
|   - /api/*       |---->|                  |
|     dev-token    |     +------------------+
|     setlist/proxy|              ^
|     health       |              |
+------------------+              |
        |                  setlist.fm API key
        |                  (server-side only)
        +--------------------------+
                  MusicKit: User token + Dev token
```

## Flows

1. **Import:** User enters setlist.fm URL or setlist ID → frontend calls our API proxy (`/api/setlist/proxy`) → proxy validates the ID and calls setlist.fm server-side (API key never leaves the server) → setlist data (artist, venue, date, tracks) is shown.
2. **Matching:** For each setlist entry, we derive a search query (track + artist, normalized). Apple Music search is done via MusicKit in the client (using our Developer Token from the API). User can correct or re-search.
3. **Export:** User confirms → MusicKit creates a playlist and adds the selected Apple Music track IDs in order.

## Token Handling

- **Apple Developer Token (JWT):** Minted server-side only in the `api` package; exposed via the Next.js route `GET /api/apple/dev-token`. Never shipped to the client in source; the client receives it at runtime. Short-lived (e.g. 1 hour); the client refreshes as needed.
- **Apple User Token:** Obtained in the browser via MusicKit JS after user authorizes. Stays in the client; used for playlist create and catalog search on behalf of the user.
- **setlist.fm API key:** Kept server-side in the setlist proxy (`GET /api/setlist/proxy`). The client calls our proxy; we add the key, cache responses in memory (1 h TTL), and rate-limit (20 req/60 s per client IP).

## Matching Strategy

- **Normalization:** Strip "feat.", "live", extra punctuation, ( … ) segments for search. Logic lives in `packages/core` (e.g. `normalizeTrackName`).
- **Search:** "track name artist name" → Apple Music catalog search. First result or best match can be suggested; user can change.
- **Fallbacks:** No match → show "No match"; user can search manually or skip.

## Error Cases and Rate Limits

- **setlist.fm:** Rate limits apply; the proxy caches and throttles. Backoff on 429.
- **Apple:** Token expiry → refresh Developer Token; user revoke → show re-auth in MusicKit.
- **Network:** Show clear errors; optional PWA offline support for already-loaded setlist (export still requires network).

## Caching

- setlist.fm responses are cached in the proxy (in-memory, 1 h TTL) to reduce calls and protect the API key.
- Apple catalog search results can be cached client-side per session to avoid duplicate requests during matching.
- **Next 16+:** Cache Components (`use cache`, PPR) can cache server-rendered setlist or config; see `docs/tech/cache-components.md`.
