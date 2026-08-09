# Changelog

This file records user-visible and maintainer-relevant changes. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

The workspace version is `0.3.0-alpha.1`. This candidate has not been tagged or
published.

### Added

- Deterministic Playwright coverage for the import, preview, matching, manual
  search, export, partial-recovery, responsive, keyboard, and accessibility
  states.
- Workflow screenshots captured from the real `/` route with mocked external
  responses.
- Public `/privacy` and `/terms` routes backed by maintained root documents.
- Showtape product metadata, web manifest icons, and browser mark.
- Visible setlist.fm source attribution using the validated response URL or the
  setlist.fm homepage fallback.
- Public-boundary, bundle-report, fixture-seed, and diagnostic scripts.
- Optional ordered duplicate removal and bounded session recovery for known
  partial track-add failures.

### Changed

- Renamed the active application from Setlist to Playlist to Showtape. The GitHub
  repository slug remains unchanged.
- Updated the web application to Next.js 16 and React 19.
- Replaced the removed demo route with deterministic fixtures on the real workflow.
- Browser import history now retains only user-entered URLs or IDs and parsed IDs.
  Legacy upstream artist, venue, date, and song metadata is discarded during
  migration.
- Setlist requests now have a 10 second total upstream deadline, coalesce identical
  in-flight IDs, validate the minimum response shape, and keep bounded 429 retry.
- API routes return structured error codes and apply documented rate-limit policy.
- MusicKit logic is split into token, client, catalog, and playlist modules.

### Fixed

- Ambiguous Apple Music create or add failures no longer offer an unsafe automatic
  retry that could duplicate playlists or tracks.
- Late setlist and matching responses no longer overwrite newer user work.
- Browser history, diagnostic, trace, key, report, and local tool paths are covered
  by the public repository boundary.
- API failure bodies, oversized upstream responses, timeout states, and cache bounds
  return deterministic errors.

## 0.2.1, 2026-03-22

### 0.2.1 Added

- React Testing Library, jsdom, component tests, and CSP middleware tests.

### 0.2.1 Fixed

- Accessible search-result names and dynamic loading status text.
- MusicKit initialization timeout settlement and development-only error logging.

## 0.2.0, 2026-03-22

### 0.2.0 Added

- Content Security Policy and browser security headers.
- MusicKit client integration tests.

### 0.2.0 Fixed

- Export resume writes now tolerate unavailable browser storage.
- Playlist response handling uses a declared MusicKit response type.

## 0.1.0

- Initial workspace with the web application, reusable API handlers, shared
  packages, documentation, and scripts.
