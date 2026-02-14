# Ralph Audit — Master Index (AUDIT-016)

Audit Date: 2026-02-14  
Audit Files Indexed: 15 (`01`–`15`)  
Total Findings Indexed: 219  

## Table of Contents
- [01 — Next.js API Routes Deep Audit Findings](./01-api-routes.md)
- [02 — Apple Developer Token & JWT Findings](./02-apple-token.md)
- [03 — setlist.fm Proxy Deep Audit Findings](./03-setlist-proxy.md)
- [04 — Core Package – Setlist & Matching Findings](./04-core-setlist-matching.md)
- [05 — Setlist Import UI Deep Audit Findings](./05-setlist-import-ui.md)
- [06 — Matching UI Deep Audit Findings](./06-matching-ui.md)
- [07 — Playlist Export Deep Audit Findings](./07-playlist-export.md)
- [08 — App Pages & Layout Deep Audit Findings](./08-app-pages-layout.md)
- [09 — Config, Environment & CORS Findings](./09-config-cors.md)
- [10 — Error Handling Findings](./10-error-handling.md)
- [11 — Types & Interfaces Findings](./11-types.md)
- [12 — Tests Deep Audit Findings](./12-tests.md)
- [13 — Lib & Utils Deep Audit Findings](./13-lib-utils.md)
- [14 — PWA & Static Assets Findings](./14-pwa-assets.md)
- [15 — Dead Code & Unused Files Findings](./15-dead-code.md)

## Executive Summary
This audit documents 219 findings across the Setlist→Playlist pipeline (API routes, Apple Developer Token/JWT, setlist.fm proxy, core matching, UI flows, config/CORS, error handling, types, tests, utilities, PWA assets, and dead code). The dominant themes are “things that will break” behaviors (106 findings; 48.4%) and reliability/maintainability “slop” (60 findings; 27.4%).

There are 7 **CRITICAL** findings (3.2%), concentrated around: (1) public-callable token/proxy endpoints where CORS does not prevent non-browser abuse, (2) spoofable CORS “localhost” allowlisting, and (3) MusicKit integration risks (token refresh effectively disabled; likely-invalid API property chain usage).

## Summary Statistics

### Total Findings by Severity
| Severity | Count | % of Total |
|---|---:|---:|
| CRITICAL | 7 | 3.2% |
| HIGH | 52 | 23.7% |
| MEDIUM | 94 | 42.9% |
| LOW | 66 | 30.1% |
| **Total** | **219** | **100.0%** |

### Breakdown by Category
| Category | Count | % of Total |
|---|---:|---:|
| will-break | 106 | 48.4% |
| slop | 60 | 27.4% |
| dead-end | 23 | 10.5% |
| unfinished | 15 | 6.8% |
| broken-logic | 13 | 5.9% |
| stub | 2 | 0.9% |
| **Total** | **219** | **100.0%** |

### Findings by Audit File
| Audit | Total | Critical | High | Medium | Low |
|---|---:|---:|---:|---:|---:|
| [01-api-routes.md](./01-api-routes.md) | 14 | 2 | 5 | 4 | 3 |
| [02-apple-token.md](./02-apple-token.md) | 12 | 0 | 3 | 7 | 2 |
| [03-setlist-proxy.md](./03-setlist-proxy.md) | 16 | 0 | 4 | 8 | 4 |
| [04-core-setlist-matching.md](./04-core-setlist-matching.md) | 13 | 0 | 4 | 5 | 4 |
| [05-setlist-import-ui.md](./05-setlist-import-ui.md) | 12 | 0 | 3 | 4 | 5 |
| [06-matching-ui.md](./06-matching-ui.md) | 26 | 1 | 5 | 12 | 8 |
| [07-playlist-export.md](./07-playlist-export.md) | 12 | 0 | 5 | 5 | 2 |
| [08-app-pages-layout.md](./08-app-pages-layout.md) | 8 | 0 | 2 | 4 | 2 |
| [09-config-cors.md](./09-config-cors.md) | 15 | 1 | 4 | 6 | 4 |
| [10-error-handling.md](./10-error-handling.md) | 15 | 0 | 3 | 10 | 2 |
| [11-types.md](./11-types.md) | 16 | 0 | 3 | 12 | 1 |
| [12-tests.md](./12-tests.md) | 16 | 0 | 7 | 8 | 1 |
| [13-lib-utils.md](./13-lib-utils.md) | 18 | 3 | 3 | 4 | 8 |
| [14-pwa-assets.md](./14-pwa-assets.md) | 8 | 0 | 1 | 3 | 4 |
| [15-dead-code.md](./15-dead-code.md) | 18 | 0 | 0 | 2 | 16 |

## Top Critical Findings (Top 10 Requested; 7 Present)
1. [01-api-routes.md](./01-api-routes.md) — **CRITICAL Finding #1:** `GET /api/apple/dev-token` is publicly callable; CORS does not prevent non-browser access  
   - **File:** `apps/web/src/app/api/apple/dev-token/route.ts` — **Lines:** 9-15 — **Category:** will-break
2. [01-api-routes.md](./01-api-routes.md) — **CRITICAL Finding #5:** `GET /api/setlist/proxy` is publicly callable; CORS does not prevent non-browser abuse of the proxy  
   - **File:** `apps/web/src/app/api/setlist/proxy/route.ts` — **Lines:** 13-29 — **Category:** will-break
3. [06-matching-ui.md](./06-matching-ui.md) — **CRITICAL Finding #16:** MusicKit instance is cached indefinitely; developer token refresh is effectively disabled  
   - **File:** `apps/web/src/lib/musickit.ts` — **Lines:** 43-70, 96-122 — **Category:** will-break
4. [09-config-cors.md](./09-config-cors.md) — **CRITICAL Finding #1:** CORS “localhost” check is prefix-based and can be bypassed by attacker-controlled origins  
   - **File:** `apps/web/src/lib/cors.ts` — **Lines:** 7-17 — **Category:** will-break
5. [13-lib-utils.md](./13-lib-utils.md) — **CRITICAL Finding #1:** Localhost CORS allowlist check is prefix-based and spoofable (duplicate risk area surfaced in multiple audits)  
   - **File:** `apps/web/src/lib/cors.ts` — **Lines:** 7-17 — **Category:** will-break
6. [13-lib-utils.md](./13-lib-utils.md) — **CRITICAL Finding #4:** MusicKit API usage likely references a non-existent property chain (`music.music.api`)  
   - **File:** `apps/web/src/lib/musickit.ts` — **Lines:** 27-35, 168-203, 210-236, 238-275 — **Category:** will-break
7. [13-lib-utils.md](./13-lib-utils.md) — **CRITICAL Finding #5:** Developer token “refresh” cache is ineffective because MusicKit is never reconfigured after first init  
   - **File:** `apps/web/src/lib/musickit.ts` — **Lines:** 43-70, 96-122 — **Category:** will-break

## Indexing Notes (Transparency)
- All statistics in this index are derived by counting audit finding headers of the form `### ... Finding #N: ...` across `01`–`15`.
- One audit file appears internally inconsistent: `12-tests.md` declares `Total Findings: 15` but contains **16** enumerated findings (by headings).