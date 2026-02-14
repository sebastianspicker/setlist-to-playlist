# Completed: Web – Matching UI (T046–T053)

**Done:** 2025-02-14

## Summary

- **T046** – For each setlist track, search query is built with `buildSearchQuery(entry.name, entry.artist)` from `@repo/core` (used when fetching suggestions and when user runs a custom search).
- **T047** – On entering matching step, suggestions are fetched: for each flattened setlist entry, `searchCatalog(query, 1)` is called and the first result is stored as the suggested Apple track.
- **T048** – `MatchingView` renders one row per setlist track: setlist track name (+ artist), suggested Apple track (name + artistName) or "No match", and "Change" / "Skip" controls.
- **T049** – "Change" opens an inline search: text input + "Search" button; results listed below; clicking a result sets that track as the match for the row.
- **T050** – "Skip" sets the row’s Apple track to null; rows can have no match.
- **T051** – State is `MatchRow[]`: `{ setlistEntry, appleTrack }` per row in setlist order; `appleTrack` is the full track (id, name, artistName) or null.
- **T052** – "Fetching suggestions…" is shown while the initial suggestion requests run; "Searching…" on the Search button during manual search.
- **T053** – "Create playlist →" button at the bottom; disabled until at least one track is matched; on click calls `onProceedToCreatePlaylist(matches)` and the flow moves to the export step (placeholder for §9).

## Files touched

- `apps/web/src/features/matching/MatchingView.tsx` (new)
- `apps/web/src/features/matching/index.ts` (exports)
- `apps/web/src/features/setlist-import/SetlistImportView.tsx` (matching + export step, `MatchingView`, `matchRows` state)
- `docs/exec-plans/implementation-tasks.md` (progress)
