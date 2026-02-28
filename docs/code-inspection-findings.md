# Deep Code Inspection Findings

Prioritised list of potential bugs and security findings. **P0** = critical, **P1** = breaking/high, **P2** = important/nice-to-have, **P3** = low/cleanup.

---

## P1 – High / Type safety & maintainability

| ID   | Location | Finding | Reason | Status |
|------|----------|---------|--------|--------|
| DCI-001 | `packages/core/src/setlist/mapper.ts` | Use of `any` for `fmSet.song` and `songs` / filter callback | ESLint `@typescript-eslint/no-explicit-any`; runtime shape of `raw.set[]` may differ from `SetlistFmSet`; weakens type safety and can hide API contract drift | **Fixed:** type guard `isSetlistFmSong`, `getSongsFromSet(fmSet)`, no `any`. Prototype-pollution checks use `hasOwnProperty` so normal objects (which inherit `__proto__`/`constructor`) are not excluded. |

---

## P2 – Important / Security & robustness

| ID   | Location | Finding | Reason | Status |
|------|----------|---------|--------|--------|
| DCI-002 | `apps/web/src/lib/cors.ts` | `ALLOWED_ORIGIN=*` results in reflecting any origin | If set to `*`, `getAllowOrigin()` returns `*`, allowing any site to call API (token, setlist proxy). Misconfiguration risk. | **Fixed:** return `null` when `single === "*"`. |
| DCI-003 | `packages/shared/src/utils/error.ts` | `getErrorMessage` returns `err.message` or `String(err)` | If caller throws `Error(sensitiveData)`, that string is exposed to UI. Callers must not pass sensitive data. | **Mitigated:** JSDoc added; no code change (caller responsibility). |
| DCI-004 | `apps/web/src/lib/fetch.ts` | No response body size limit in `fetchJson` | Very large JSON responses could cause high memory use or DoS. Prefer a size guard or streaming for untrusted origins. | **Fixed:** reject when `Content-Length` &gt; 10 MiB. |

---

## P3 – Low / Cleanup & consistency

| ID   | Location | Finding | Reason | Status |
|------|----------|---------|--------|--------|
| DCI-005 | `packages/core/src/setlist/mapper.ts` | Defensive runtime checks already present; types not aligned | `SetlistFmSet` has `song: SetlistFmSong[]`; we can use it and a type guard for `unknown` API payload instead of `any`. | **Fixed:** see DCI-001. |

---

## Verified / No issue

- **Setlist ID / SSRF:** `parseSetlistIdFromInput` validates hostname (setlist.fm only) and ID format; proxy uses parsed ID only. No user URL passed to `fetch`.
- **Secrets:** Developer Token minted server-side; setlist.fm API key only in env and server.
- **XSS:** User-controlled strings (e.g. `addTracksError`, setlist names) rendered as React text; no `dangerouslySetInnerHTML`. Apple Music `created.url` checked for `http(s):` before use in `href`.
- **CORS:** When `ALLOWED_ORIGIN` is a single origin, that value is used (not reflected from request).
- **JWT:** Uses `jose`, ES256; key normalisation applied; no obvious leakage.

---

## DCI Round 2 – Additional findings

| ID   | Location | Finding | Reason | Status |
|------|----------|---------|--------|--------|
| DCI-006 | `apps/web/src/app/api/setlist/proxy/route.ts` | Redundant ternary: `status = "error" in result ? result.status : result.status` | Both branches identical; dead code / clarity. | **Fixed:** use `result.status` only. |
| DCI-007 | `apps/web/src/lib/musickit.ts` | Non-null assertion `cachedToken!` after `isTokenValid()` | TypeScript does not narrow from side-effect; assertion could mask bugs if logic changes. Prefer explicit narrow. | **Fixed:** assign to `valid` and narrow with `typeof valid === "string"`. |
| DCI-008 | `packages/core/src/setlist/flatten.ts` | `entries.push({ ...entry, artist: ... })` spreads full `entry` | Unknown keys from API could leak into SetlistEntry; type purity and slight robustness. | **Fixed:** push only `{ name, artist, info }` with explicit reads. |
| DCI-009 | `scripts/export-diagnostics.ts` | `--out` path joined with `process.cwd()` without validation | `--out ../../../other/report.json` can write outside cwd; script is run by user but path should be constrained or resolved and checked. | **Fixed:** `resolveOutPath()` ensures path is under cwd via `path.relative`; refuse and exit(1) otherwise. |
