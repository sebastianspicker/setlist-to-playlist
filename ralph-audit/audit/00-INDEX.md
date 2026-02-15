# Ralph Audit — Master Index (AUDIT-016)

Audit Date: 2026-02-15  
Reports Indexed: 15 (`01`–`15`)  
Total Findings (parsed from finding headings): **213**

## Executive Summary

This audit set identifies eight **CRITICAL** issues concentrated in three themes:

- **Unauthenticated public endpoints backed by server-side secrets**: API routes expose a public setlist.fm proxy and a public Apple Developer Token issuance surface; CORS headers are present but do not prevent non-browser callers from using these endpoints.
- **Setlist data-loss risk due to response-shape mismatch**: multiple findings indicate the setlist mapper/types assume `raw.set` while real responses can be wrapped as `sets: { set: ... }`, resulting in silently empty song lists downstream.
- **Client/runtime breakage risks in core UI/data flow**: the matching UI can crash due to assumptions about `sets` shape, and MusicKit API usage is flagged as likely incorrect (breaking catalog/library operations).

Across all reports, the dominant category is **will-break** (runtime failures, reliability/security exposure surfaces), followed by **slop** (quality/maintainability) and smaller but meaningful amounts of **broken-logic** and **dead-end** issues.

---

## Summary Statistics

### Total Findings by Severity

| Severity | Count | % of Total |
|---|---:|---:|
| **Critical** | 8 | 3.8% |
| **High** | 50 | 23.5% |
| **Medium** | 96 | 45.1% |
| **Low** | 59 | 27.7% |
| **Total** | **213** | **100%** |

### Breakdown by Category

| Category | Count | % of Total |
|---|---:|---:|
| **will-break** | 115 | 54.0% |
| **slop** | 47 | 22.1% |
| **broken-logic** | 22 | 10.3% |
| **dead-end** | 22 | 10.3% |
| **unfinished** | 6 | 2.8% |
| **stub** | 1 | 0.5% |
| **Total** | **213** | **100%** |

### Findings by Audit Report (parsed)

| Report | Total | Critical | High | Medium | Low |
|---|---:|---:|---:|---:|---:|
| [`01-api-routes.md`](./01-api-routes.md) | 10 | 1 | 1 | 5 | 3 |
| [`02-apple-token.md`](./02-apple-token.md) | 13 | 0 | 4 | 6 | 3 |
| [`03-setlist-proxy.md`](./03-setlist-proxy.md) | 12 | 0 | 3 | 8 | 1 |
| [`04-core-setlist-matching.md`](./04-core-setlist-matching.md) | 20 | 1 | 4 | 9 | 6 |
| [`05-setlist-import-ui.md`](./05-setlist-import-ui.md) | 16 | 0 | 2 | 7 | 7 |
| [`06-matching-ui.md`](./06-matching-ui.md) | 16 | 1 | 6 | 7 | 2 |
| [`07-playlist-export.md`](./07-playlist-export.md) | 13 | 0 | 6 | 5 | 2 |
| [`08-app-pages-layout.md`](./08-app-pages-layout.md) | 12 | 0 | 2 | 6 | 4 |
| [`09-config-cors.md`](./09-config-cors.md) | 14 | 1 | 1 | 7 | 5 |
| [`10-error-handling.md`](./10-error-handling.md) | 16 | 0 | 4 | 9 | 3 |
| [`11-types.md`](./11-types.md) | 17 | 2 | 2 | 11 | 2 |
| [`12-tests.md`](./12-tests.md) | 17 | 0 | 9 | 5 | 3 |
| [`13-lib-utils.md`](./13-lib-utils.md) | 14 | 2 | 4 | 4 | 4 |
| [`14-pwa-assets.md`](./14-pwa-assets.md) | 8 | 0 | 2 | 4 | 2 |
| [`15-dead-code.md`](./15-dead-code.md) | 15 | 0 | 0 | 3 | 12 |

### Report Header Consistency Notes (header vs parsed)

Some report header summaries/totals do not match the count of `### ... Finding #...` sections:

- [`03-setlist-proxy.md`](./03-setlist-proxy.md): header says Total 11 (Medium 6 / Low 2), parsed Total 12 (Medium 8 / Low 1)
- [`09-config-cors.md`](./09-config-cors.md): header Medium/Low distribution differs from parsed (header Medium 6 / Low 6 vs parsed Medium 7 / Low 5)
- [`10-error-handling.md`](./10-error-handling.md): header High/Medium distribution differs from parsed (header High 3 / Medium 10 vs parsed High 4 / Medium 9)
- [`11-types.md`](./11-types.md): header Medium/Low distribution differs from parsed (header Medium 9 / Low 4 vs parsed Medium 11 / Low 2)
- [`14-pwa-assets.md`](./14-pwa-assets.md): header Medium/Low distribution differs from parsed (header Medium 3 / Low 3 vs parsed Medium 4 / Low 2)

This index uses **parsed** counts from the finding headings/categories across `01`–`15`.

---

## Top 10 Critical Findings (8 total)

> Only **8** CRITICAL findings exist across `01`–`15`; all are listed below.

1. [`01-api-routes.md`](./01-api-routes.md#critical-finding-1-public-unauthenticated-setlistfm-proxy-enables-third-party-abuse-of-the-server-side-api-key-cors-is-not-access-control) — **Finding #1**  
   **Issue:** Public, unauthenticated setlist.fm proxy enables third-party abuse of the server-side API key (CORS is not access control)  
   **Location:** `apps/web/src/app/api/setlist/proxy/route.ts` (Lines: 11-43) — Category: `will-break`

2. [`04-core-setlist-matching.md`](./04-core-setlist-matching.md#critical-finding-1-mapsetlistfmtosetlist-only-reads-rawset-and-can-silently-drop-all-songs-when-the-api-returns-a-sets-wrapper) — **Finding #1**  
   **Issue:** `mapSetlistFmToSetlist` only reads `raw.set` and can silently drop all songs when the API returns a `sets` wrapper  
   **Location:** `packages/core/src/setlist/mapper.ts` (Lines: 20-22) — Category: `broken-logic`

3. [`06-matching-ui.md`](./06-matching-ui.md#critical-finding-1-useeffect-dependency-can-crash-on-non-arraynullable-sets-entries) — **Finding #1**  
   **Issue:** `useEffect` dependency can crash on non-array/nullable `sets` entries  
   **Location:** `apps/web/src/features/matching/MatchingView.tsx` (Lines: 14-25, 44-86) — Category: `will-break`

4. [`09-config-cors.md`](./09-config-cors.md#critical-finding-1-localhost-origin-check-can-allow-non-local-attacker-origins-when-allowedorigin-is-unset) — **Finding #1**  
   **Issue:** “Localhost” origin check can allow non-local attacker origins when `ALLOWED_ORIGIN` is unset  
   **Location:** `apps/web/src/lib/cors.ts` (Lines: 8-18) — Category: `broken-logic`

5. [`11-types.md`](./11-types.md#critical-finding-1-setlistfmresponse-models-set-but-real-responses-use-sets-set-songs-can-be-dropped) — **Finding #1**  
   **Issue:** `SetlistFmResponse` models `set` but real responses use `sets: { set: ... }` (songs can be dropped)  
   **Location:** `packages/core/src/setlist/setlistfm-types.ts` (Lines: 34-44) — Category: `will-break`

6. [`11-types.md`](./11-types.md#critical-finding-2-mapper-only-reads-rawset-so-rawsetsset-responses-map-to-empty-sets) — **Finding #2**  
   **Issue:** Mapper only reads `raw.set`, so `raw.sets.set` responses map to empty `sets`  
   **Location:** `packages/core/src/setlist/mapper.ts` (Lines: 20-35) — Category: `will-break`

7. [`13-lib-utils.md`](./13-lib-utils.md#critical-finding-1-localhost-cors-allowlist-is-bypassable-via-startswithhttplocalhost) — **Finding #1**  
   **Issue:** Localhost CORS allowlist is bypassable via `startsWith("http://localhost")`  
   **Location:** `apps/web/src/lib/cors.ts` (Lines: 8-18) — Category: `broken-logic`

8. [`13-lib-utils.md`](./13-lib-utils.md#critical-finding-3-musickit-api-usage-likely-incorrect-musicmusicapi-vs-documented-musicapi) — **Finding #3**  
   **Issue:** MusicKit API usage likely incorrect (`music.music.api` vs documented `music.api.*`)  
   **Location:** `apps/web/src/lib/musickit.ts` (Lines: 27-35, 172-203, 210-268) — Category: `will-break`

---

## Table of Contents (Audit Reports)

1. [`01-api-routes.md`](./01-api-routes.md) — Next.js API Routes Deep Audit Findings  
2. [`02-apple-token.md`](./02-apple-token.md) — Apple Developer Token & JWT Deep Audit Findings  
3. [`03-setlist-proxy.md`](./03-setlist-proxy.md) — setlist.fm Proxy Deep Audit Findings  
4. [`04-core-setlist-matching.md`](./04-core-setlist-matching.md) — Core Package – Setlist & Matching Findings  
5. [`05-setlist-import-ui.md`](./05-setlist-import-ui.md) — Setlist Import UI Deep Audit Findings  
6. [`06-matching-ui.md`](./06-matching-ui.md) — Matching UI Deep Audit Findings  
7. [`07-playlist-export.md`](./07-playlist-export.md) — Playlist Export Findings  
8. [`08-app-pages-layout.md`](./08-app-pages-layout.md) — App Pages & Layout Findings  
9. [`09-config-cors.md`](./09-config-cors.md) — Config, Environment & CORS Findings  
10. [`10-error-handling.md`](./10-error-handling.md) — Error Handling Deep Audit Findings  
11. [`11-types.md`](./11-types.md) — Types & Interfaces Deep Audit Findings  
12. [`12-tests.md`](./12-tests.md) — Tests Deep Audit Findings  
13. [`13-lib-utils.md`](./13-lib-utils.md) — Lib & Utils Deep Audit Findings  
14. [`14-pwa-assets.md`](./14-pwa-assets.md) — PWA & Static Assets Findings  
15. [`15-dead-code.md`](./15-dead-code.md) — Dead Code & Unused Files Findings