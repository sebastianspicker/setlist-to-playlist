# Completed: Core – Setlist and matching (T025–T031)

**Done:** 2025-02-14

## Summary

- **T025** – Setlist.fm API types in `packages/core/src/setlist/setlistfm-types.ts`: `SetlistFmResponse`, `SetlistFmArtist`, `SetlistFmVenue`, `SetlistFmSong`, `SetlistFmSet` (artist, venue, eventDate, sets/songs).
- **T026** – `mapSetlistFmToSetlist()` in `packages/core/src/setlist/mapper.ts`: maps setlist.fm response to `Setlist` with `SetlistEntry[][]`, preserves set order.
- **T027** – `normalizeTrackName` extended with "ft." / "ft" stripping; existing tests + one for "ft.". Parentheticals and "feat." already covered.
- **T028** – `buildSearchQuery(trackName, artistName?)` in `packages/core/src/matching/search-query.ts`: uses normalization, returns one string for catalog search.
- **T029** – `Setlist`, `SetlistEntry`, matching types and `buildSearchQuery` exported via `packages/core` (setlist + matching index and main index).
- **T030** – `packages/core/tests/setlist-mapper.test.ts`: fixture from API doc shape; asserts id/artist/venue/date, set structure, track order; minimal response (no venue/sets).
- **T031** – `packages/core/tests/search-query.test.ts`: no artist, track+artist, normalization, trim/collapse spaces, empty artist/track.

## Files touched

- `packages/core/src/setlist/setlistfm-types.ts` (new)
- `packages/core/src/setlist/mapper.ts` (new)
- `packages/core/src/setlist/index.ts` (exports)
- `packages/core/src/matching/normalize.ts` (ft. strip)
- `packages/core/src/matching/search-query.ts` (new)
- `packages/core/src/matching/index.ts` (export buildSearchQuery)
- `packages/core/tests/normalize.test.ts` (ft. test, quote style)
- `packages/core/tests/setlist-mapper.test.ts` (new)
- `packages/core/tests/search-query.test.ts` (new)
- `docs/exec-plans/implementation-tasks.md` (progress)
