# Completed: Web – Setlist import UI (T032–T038)

**Done:** 2025-02-14

## Summary

- **T032** – Import section on home page: input for setlist URL or ID, "Load setlist" submit button (`SetlistImportView.tsx`).
- **T033** – On submit, `fetch(setlistProxyUrl('id=' + encodeURIComponent(input)))`; proxy returns setlist JSON or error.
- **T034** – API response mapped with `mapSetlistFmToSetlist()` from `@repo/core`; result stored in component state (`setlist`).
- **T035** – `SetlistPreview`: shows artist, venue, event date, and ordered list of track names (flattened from sets).
- **T036** – Loading: button shows "Loading…", disabled input, and "Loading setlist…" status text.
- **T037** – Error: red alert box with message and "Try again" button; `handleRetry` re-runs the same request.
- **T038** – "Continue to Matching →" button after successful import; advances to a placeholder matching step (full matching UI in later block).

## Files touched

- `apps/web/src/features/setlist-import/SetlistImportView.tsx` (new, client)
- `apps/web/src/features/setlist-import/SetlistPreview.tsx` (new)
- `apps/web/src/features/setlist-import/index.ts` (exports)
- `apps/web/src/app/page.tsx` (imports and renders `SetlistImportView`)
- `docs/exec-plans/implementation-tasks.md` (progress)
