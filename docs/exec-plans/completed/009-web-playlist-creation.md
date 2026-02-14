# Completed: Web – Playlist creation (T054–T059)

**Done:** 2025-02-14

## Summary

- **T054** – On "Create playlist", `CreatePlaylistView` checks `isMusicKitAuthorized()`; if not authorized, sets `needsAuth` and shows the Connect Apple Music flow. After user authorizes, `onAuthorized` triggers playlist creation.
- **T055** – `createLibraryPlaylist(name)` in `musickit.ts`: POST `/v1/me/library/playlists` with `data: [{ type: "playlists", attributes: { name } }]`. Playlist name = `buildPlaylistName(setlist)` → "Setlist – Artist – Date".
- **T056** – `addTracksToLibraryPlaylist(playlistId, songIds)`: POST `/v1/me/library/playlists/{id}/tracks` with `data: [{ id, type: "songs" }, ...]`. Song IDs taken from `matchRows` in order.
- **T057** – On success, green success box with "Playlist created." and link "Open in Apple Music →" (uses `created.url` from API or fallback `https://music.apple.com`).
- **T058** – On error, red alert with message and "Try again" button; retry calls `handleCreate()` again.
- **T059** – "Create playlist" is disabled until at least one track is matched (implemented in §8: MatchingView disables "Create playlist →" when `!canProceed`). Documented here.

## Files touched

- `apps/web/src/lib/musickit.ts` (`createLibraryPlaylist`, `addTracksToLibraryPlaylist`, `CreatePlaylistResult`)
- `apps/web/src/features/playlist-export/CreatePlaylistView.tsx` (new)
- `apps/web/src/features/playlist-export/index.ts` (export)
- `apps/web/src/features/setlist-import/SetlistImportView.tsx` (export step uses `CreatePlaylistView`)
- `docs/exec-plans/implementation-tasks.md` (progress)
