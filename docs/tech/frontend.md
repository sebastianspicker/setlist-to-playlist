# Frontend

## Stack

The web application uses Next.js 16 App Router, React 19, and TypeScript.
`apps/web/src/app/page.tsx` renders the interactive `SetlistImportWorkflow`.

## Routes

| Route      | Content                                        |
| ---------- | ---------------------------------------------- |
| `/`        | Import, preview, matching, and export workflow |
| `/privacy` | Privacy notice                                 |
| `/terms`   | Project and third-party service notice         |

API routes are under `apps/web/src/app/api`. There is no `/demo` route.

## Feature layout

- `src/features/setlist-import`: input, request lifecycle, preview, recent
  imports, and workflow transitions
- `src/features/matching`: automatic suggestions, manual search, and selected
  match state
- `src/features/playlist-export`: final review, Apple Music writes, terminal
  states, and resume state
- `src/lib/musickit`: token caching, SDK initialization, catalog search, and
  playlist writes
- `src/components`: shared workflow and status components
- `src/content`: public legal text used by pages and tests

## Configuration

`apps/web/src/lib/config.ts` reads:

- `NEXT_PUBLIC_API_URL`, with same-origin behavior when unset
- `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`

The API URL helper removes a trailing slash and an optional trailing `/api`
before constructing route URLs.

## Browser persistence

Recent imports use `localStorage`. A current record contains the original input
and parsed setlist ID. Valid legacy records are reduced to that shape; invalid
records are ignored.

Playlist recovery uses `sessionStorage`. State expires after 30 minutes and is
accepted only when the current selected IDs and duplicate-removal setting match
the stored signature.

## Delivery limits

The linked web manifest defines icons and `display: standalone`, but the
application registers no service worker. Import, matching, authorization, and
playlist creation require network access.

## Performance report

After a production build:

```bash
corepack pnpm@9.15.3 bundle:report
```

The command reads Next.js manifests and reports raw and gzip-estimated
JavaScript and CSS bytes for `/`. It excludes HTML, React Server Component
payloads, and protocol overhead. The checked-in local reference is
`docs/performance/public-alpha.json`.
