# ADR 0001: Stack – Next.js + MusicKit

## Status

Accepted.

## Context

We need a web app that talks to setlist.fm and Apple Music, runs in the browser, and can be deployed as a PWA. We need to mint an Apple Developer Token server-side and keep the setlist.fm API key off the client.

## Decision

- **Frontend:** Next.js (App Router) + TypeScript + React. Enables SSR/SSG if needed later, simple deployment, and a single codebase for pages and (optionally) API routes.
- **Apple Music in client:** MusicKit JS. Apple’s official SDK for catalog search and library/playlist operations. User authorization happens in the browser; we only provide the Developer Token from our backend.
- **Backend:** Minimal serverless/API (separate `apps/api` or Next API routes) for Developer Token and optional setlist.fm proxy.

## Consequences

- One framework to maintain; good DX and ecosystem. MusicKit is the supported way to integrate Apple Music in the browser. Token and API key stay server-side.
