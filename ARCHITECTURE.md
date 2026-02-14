# Architecture Overview

## Goal

Import a setlist from setlist.fm (URL or ID) → preview and optionally correct track matches → create an Apple Music playlist in the user's account.

## Components and Data Flow (ASCII)

```
+------------------+     +------------------+     +------------------+
|   PWA (Next.js)  |     |   API (optional) |     |   External       |
|   - Import UI    |---->|   - /apple/      |---->|   - Apple Music  |
|   - Matching UI  |     |     dev-token    |     |     API          |
|   - Export UI    |     |   - /setlist/    |     |   - setlist.fm   |
|   - MusicKit JS  |     |     proxy        |     |     API         |
+------------------+     +------------------+     +------------------+
        |                         |                         ^
        |                         v                         |
        |                 setlist.fm API key                |
        |                 (server-side only)                 |
        +---------------------------------------------------+
                  MusicKit: User token + Dev token
```

## Flows

1. **Import:** User enters setlist.fm URL or setlist ID → frontend (or API proxy) calls setlist.fm → setlist data (artist, venue, date, tracks) is shown.
2. **Matching:** For each setlist entry, we derive a search query (track + artist, normalized). Apple Music search is done via MusicKit in the client (using our Developer Token from the API). User can correct or re-search.
3. **Export:** User confirms → MusicKit creates a playlist and adds the selected Apple Music track IDs in order.

## Token Handling

- **Apple Developer Token (JWT):** Minted server-side only (`apps/api` or Next API route). Never shipped to the client in source; client receives it at runtime via a dedicated endpoint. Short-lived (e.g. 1 hour); client or API can refresh as needed.
- **Apple User Token:** Obtained in the browser via MusicKit JS after user authorizes. Stays in the client; used for playlist create and catalog search on behalf of the user.
- **setlist.fm API key:** If used, kept server-side (e.g. in proxy route). Client calls our proxy; we add the key and optionally cache / rate-limit.

## Matching Strategy

- **Normalization:** Strip "feat.", "live", extra punctuation, ( … ) segments for search. Logic lives in `packages/core` (e.g. `normalizeTrackName`).
- **Search:** "track name artist name" → Apple Music catalog search. First result or best match can be suggested; user can change.
- **Fallbacks:** No match → show "No match"; user can search manually or skip.

## Error Cases and Rate Limits

- **setlist.fm:** Rate limits apply; use optional proxy to cache and throttle. Backoff on 429.
- **Apple:** Token expiry → refresh Developer Token; user revoke → show re-auth in MusicKit.
- **Network:** Show clear errors; optional PWA offline support for already-loaded setlist (export still requires network).

## Caching

- setlist.fm responses can be cached in the proxy (in-memory or Redis) with a short TTL to reduce calls and protect the API key.
- Apple catalog search results can be cached client-side per session to avoid duplicate requests during matching.
