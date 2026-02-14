# Completed: Web – MusicKit integration (T039–T045)

**Done:** 2025-02-14

## Summary

- **T039** – Developer Token fetched from API via `fetchDeveloperToken()` in `apps/web/src/lib/musickit.ts`; stored in memory (`cachedToken`). Called when `initMusicKit()` runs.
- **T040** – `initMusicKit()` fetches token, waits for MusicKit script, calls `MusicKit.configure({ developerToken, app: { name, build }, appId })` with `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`. Script loaded in `layout.tsx` (Next.js Script, musickit v3 CDN).
- **T041** – "Connect Apple Music" flow in `ConnectAppleMusic.tsx`: button calls `authorizeMusicKit()` (init + `music.authorize()`). Shown on the matching step in the setlist-import flow.
- **T042** – Auth errors (cancel, denied, revoked) show a clear message and "Try again" button; friendly copy for cancel/denied vs revoked.
- **T043** – `searchCatalog(term, limit)` in `musickit.ts`: calls `/v1/catalog/{storefront}/search`, returns `AppleMusicTrack[]` with `id`, `name`, `artistName`.
- **T044** – Storefront from `music.storefrontId` (MusicKit instance); fallback `"us"` when not set.
- **T045** – Session cache: `searchCache` Map in musickit.ts; repeated same term returns cached tracks.

## Files touched

- `apps/web/src/lib/musickit.ts` (new)
- `apps/web/src/app/layout.tsx` (MusicKit script)
- `apps/web/src/features/matching/ConnectAppleMusic.tsx` (new)
- `apps/web/src/features/matching/index.ts` (export)
- `apps/web/src/features/setlist-import/SetlistImportView.tsx` (Connect Apple Music on matching step)
- `docs/exec-plans/implementation-tasks.md` (progress)
