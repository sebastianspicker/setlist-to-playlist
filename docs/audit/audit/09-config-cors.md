# Config, Environment & CORS Findings

Audit Date: 2026-02-15  
Files Examined: 25  
Total Findings: 14

## Summary by Severity
- Critical: 1
- High: 1
- Medium: 6
- Low: 6

---

## Findings

### [CRITICAL] Finding #1: “Localhost” origin check can allow non-local attacker origins when `ALLOWED_ORIGIN` is unset

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 8-18  
**Category:** broken-logic

**Description:**
`getAllowOrigin()` treats any `Origin` that *starts with* `http://localhost` or `http://127.0.0.1` as “local” and returns it when `ALLOWED_ORIGIN` is unset. Because this is a string-prefix check (not a hostname check), it also matches attacker-controlled domains like `http://localhost.evil.com` (and similar prefix tricks). In that misconfigured state (unset `ALLOWED_ORIGIN`), the API routes using `corsHeaders()` will emit `Access-Control-Allow-Origin` for an attacker origin, enabling browser JS on that attacker site to read responses.

**Code:**
```ts
export function getAllowOrigin(origin: string | null): string | null {
  const configured = (process.env.ALLOWED_ORIGIN ?? "").trim();
  const isLocalOrigin =
    origin &&
    (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
  if (configured) {
    const single = configured.split(",")[0].trim().replace(/\/$/, "");
    return single || (isLocalOrigin ? origin : null);
  }
  return isLocalOrigin ? origin : null;
}
```

**Why this matters:**
If `ALLOWED_ORIGIN` is forgotten/missing in a deployment where the dev-token/proxy endpoints are reachable cross-origin, this becomes a credential/data exposure path (Developer Token and setlist proxy responses become readable from attacker origins).

---

### [HIGH] Finding #2: `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` can pass “required” validation but still be used with invalid whitespace

**File:** `apps/web/src/lib/config.ts`  
**Lines:** 18-20  
**Category:** will-break

**Description:**
`APPLE_MUSIC_APP_ID` is exported as-is (no trimming/normalization). Downstream, `initMusicKit()` checks `APPLE_MUSIC_APP_ID.trim() === ""` to detect blank config, but then calls `MusicKit.configure` with the **untrimmed** value. A value like `" my-app-id "` passes the “required” check yet is still used with whitespace.

**Code:**
```ts
export const APPLE_MUSIC_APP_ID =
  process.env.NEXT_PUBLIC_APPLE_MUSIC_APP_ID ?? "";
```

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 103-116  
**Category:** will-break

**Code:**
```ts
if (!APPLE_MUSIC_APP_ID || APPLE_MUSIC_APP_ID.trim() === "") {
  throw new Error(
    "NEXT_PUBLIC_APPLE_MUSIC_APP_ID is required for MusicKit. Set it in your environment (see .env.example)."
  );
}
const configureResult = MusicKit.configure({
  developerToken: token,
  app: { name: "Setlist to Playlist", build: "1" },
  appId: APPLE_MUSIC_APP_ID,
});
```

**Why this matters:**
This creates a configuration “gotcha” where production can break despite appearing configured, and failures will look like downstream MusicKit issues rather than a simple env formatting issue.

---

### [MEDIUM] Finding #3: Trailing-slash normalization is incomplete; multiple trailing slashes can produce malformed API URLs (including `//api` and `/api//api`)

**File:** `apps/web/src/lib/config.ts`  
**Lines:** 12-16  
**Category:** will-break

**Description:**
`API_BASE_URL` only strips **one** trailing `/` via `.replace(/\/$/, "")`. If `NEXT_PUBLIC_API_URL` ends with multiple slashes (common copy/paste), it can leave `API_BASE_URL` with trailing `//`, which then interacts badly with `apiUrl()`’s `/api` stripping and concatenation.

**Code:**
```ts
export const API_BASE_URL: string =
  typeof process.env.NEXT_PUBLIC_API_URL === "string" &&
  process.env.NEXT_PUBLIC_API_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/$/, "")
    : "";
```

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 12-19  
**Category:** will-break

**Code:**
```ts
const raw = API_BASE_URL || "";
const base = raw.replace(/\/$/, "").replace(/\/api$/i, "");
...
if (base) return `${base}${apiSegment}${p}`;
```

**Why this matters:**
Operators can set `NEXT_PUBLIC_API_URL=https://example.com/api///` and end up with URLs like `https://example.com/api//api/...`, which can break requests and be very difficult to diagnose (especially when only some environments have “extra slash” values).

---

### [MEDIUM] Finding #4: `apiUrl()` always forces an `/api` segment; any non-standard base path produces surprising URLs

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 12-18  
**Category:** will-break

**Description:**
When `API_BASE_URL` is set, `apiUrl()` always appends `"/api"` (via `apiSegment`) after optionally stripping a trailing `/api`. If a deployment mounts the API under a different path (e.g. `/api/v1`) or expects root-mounted endpoints, the helper will still generate `.../api/...`.

**Code:**
```ts
const base = raw.replace(/\/$/, "").replace(/\/api$/i, "");
const apiSegment = "/api";
if (base) return `${base}${apiSegment}${p}`;
return `${API_PATH}${p}`;
```

**Why this matters:**
This is a sharp edge in configuration: the env var name (`NEXT_PUBLIC_API_URL`) implies “base URL”, but the helper’s behavior implies “origin (optionally with `/api`)”. Misalignment can lead to hard-to-debug 404s (wrong constructed URL).

---

### [MEDIUM] Finding #5: `ALLOWED_ORIGIN` accepts invalid/ambiguous values (paths, multiple origins) and only partially normalizes trailing slashes

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 9-16  
**Category:** will-break

**Description:**
- The implementation takes only the first comma-separated origin (`split(",")[0]`) and silently ignores additional entries.
- It removes only a single trailing slash (`replace(/\/$/, "")`), so values with multiple trailing slashes remain malformed.
- It does not guard against `ALLOWED_ORIGIN` including a path (e.g. `https://app.example.com/some/path`), which is not a valid `Access-Control-Allow-Origin` value.

**Code:**
```ts
const configured = (process.env.ALLOWED_ORIGIN ?? "").trim();
...
const single = configured.split(",")[0].trim().replace(/\/$/, "");
return single || (isLocalOrigin ? origin : null);
```

**Why this matters:**
CORS configuration errors typically manifest as opaque “CORS error” in browsers; these normalization gaps increase the chance that “looks correct” env values fail at runtime.

---

### [MEDIUM] Finding #6: CORS headers vary by request `Origin` but responses do not emit `Vary: Origin`

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 20-28  
**Category:** will-break

**Description:**
When `ALLOWED_ORIGIN` is unset, `getAllowOrigin()` may echo back the request’s `Origin`. That means the response varies by `Origin`, but the headers do not include `Vary: Origin`. Intermediary caching (CDNs/proxies) can cache a response and serve it with a mismatched `Access-Control-Allow-Origin` behavior.

**Code:**
```ts
export function corsHeaders(request: NextRequest, contentType = "application/json"): HeadersInit {
  const origin = request.headers.get("origin");
  const allowOrigin = getAllowOrigin(origin);
  const headers: HeadersInit = { "Content-Type": contentType };
  if (allowOrigin) {
    (headers as Record<string, string>)["Access-Control-Allow-Origin"] = allowOrigin;
  }
  return headers;
}
```

**Why this matters:**
Caching/CORS interactions are a common source of production-only failures and confusing security postures (the wrong origin may appear “allowed” or “blocked” depending on cache state).

---

### [LOW] Finding #7: “Local origin” logic excludes `https://localhost` (dev environments using HTTPS will fail unless `ALLOWED_ORIGIN` is set)

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 10-12  
**Category:** will-break

**Description:**
The “local” fallback only recognizes `http://localhost…` and `http://127.0.0.1…`. It does not recognize `https://localhost…` or `https://127.0.0.1…`.

**Code:**
```ts
const isLocalOrigin =
  origin &&
  (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
```

**Why this matters:**
Developers using HTTPS locally (or tools that serve HTTPS by default) can get unexpected CORS failures in dev/test setups.

---

### [LOW] Finding #8: `.env.example` CORS guidance is incomplete and slightly inaccurate

**File:** `.env.example`  
**Lines:** 18-19  
**Category:** slop

**Description:**
- The guidance says “only http://localhost is allowed” when unset, but the code also allows `http://127.0.0.1…` and has more nuanced behavior.
- `ALLOWED_ORIGIN` is only shown as a commented example (no placeholder assignment line), which increases the chance it is missed.

**Code:**
```env
# CORS: required in production. When unset, only http://localhost is allowed (DCI-001).
# ALLOWED_ORIGIN=https://your-app.example.com
```

**Why this matters:**
CORS misconfiguration frequently looks like an application outage from the browser perspective; incomplete examples increase operational risk.

---

### [MEDIUM] Finding #9: Apple Music docs list a dev-token endpoint path that does not match the implemented Next.js route

**File:** `docs/tech/apple-music.md`  
**Lines:** 19-22  
**Category:** slop

**Description:**
The docs state `GET /apple/dev-token (or equivalent)` but the current implemented route is `GET /api/apple/dev-token` (`apps/web/src/app/api/apple/dev-token/route.ts:9-23`). This ambiguity is directly relevant to `NEXT_PUBLIC_API_URL` usage and reverse-proxy / monitoring configuration.

**Code:**
```md
## Endpoints (our side)

- `GET /apple/dev-token` (or equivalent): Returns `{ token: "…" }` ...
```

**Why this matters:**
Operators may configure base URLs, proxy rewrites, or uptime checks against the wrong path, leading to “works locally” but fails in deployment.

---

### [MEDIUM] Finding #10: `docs/code-inspection-findings.md` contains high-impact stale/contradictory CORS claims

**File:** `docs/code-inspection-findings.md`  
**Lines:** 33-60  
**Category:** slop

**Description:**
The document simultaneously claims:
- In the top “Fixes applied” table that only `http://localhost*` is allowed when `ALLOWED_ORIGIN` is unset (line 15), **and**
- In the summary + detailed section that CORS allows **any HTTPS origin** when `ALLOWED_ORIGIN` is unset (lines 33 and 55-60), including a code snippet that no longer matches the current implementation.

**Code:**
```md
| DCI-001  | P0       | §2 API Token   | CORS allows any HTTPS origin when `ALLOWED_ORIGIN` unset |

### DCI-001 — CORS allows any HTTPS origin when `ALLOWED_ORIGIN` is unset [P0]
- **What:** `allowOrigin` is set to `ALLOWED_ORIGIN || ... origin.startsWith("https://") ...`
```

**Why this matters:**
This is security-relevant documentation. Stale claims can cause incorrect risk assessments, incorrect incident response, and misinformed changes to CORS configuration.

---

### [MEDIUM] Finding #11: Multiple “completed plan” docs still describe a different CORS fallback behavior (“localhost/https”)

**File:** `docs/exec-plans/completed/002-api-dev-token.md`  
**Lines:** 7-12  
**Category:** slop

**Description:**
The dev-token completion notes claim dev fallback allows “localhost/https”, which does not match the current `apps/web/src/lib/cors.ts` logic (http-only localhost/127.0.0.1 checks).

**Code:**
```md
- **T009** – CORS on dev-token route: `Access-Control-Allow-Origin` from `ALLOWED_ORIGIN` or, in dev, request origin when localhost/https.
```

**File:** `docs/exec-plans/completed/003-api-setlistfm-proxy.md`  
**Lines:** 12-14  
**Category:** slop

**Code:**
```md
- **T019** – CORS on setlist proxy route (same pattern as dev-token: `ALLOWED_ORIGIN` or request origin for localhost/https).
```

**Why this matters:**
These docs are likely referenced for environment setup. When they disagree with code, they increase the odds of broken deployments or incorrect assumptions about what’s allowed cross-origin.

---

### [LOW] Finding #12: `NEXT_PUBLIC_*` values are build-time substituted in the client; docs/UX may implicitly suggest runtime configurability

**File:** `apps/web/src/lib/config.ts`  
**Lines:** 12-16  
**Category:** will-break

**Description:**
The web app config reads `process.env.NEXT_PUBLIC_*` in a module export. In Next.js, `NEXT_PUBLIC_*` values used in client bundles are typically inlined at build time. If operators expect to change `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` without rebuilding/redeploying, the running client may keep using old values.

**Code:**
```ts
export const API_BASE_URL: string =
  typeof process.env.NEXT_PUBLIC_API_URL === "string" &&
  process.env.NEXT_PUBLIC_API_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/$/, "")
    : "";
```

**Why this matters:**
Misunderstanding env lifecycle can lead to “we changed the env var but nothing changed” incidents, especially during cutovers between same-origin and separate API setups.

---

### [LOW] Finding #13: Preflight `Access-Control-Allow-Headers` is hard-coded to `Content-Type` only

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 33-42  
**Category:** will-break

**Description:**
`corsHeadersForOptions()` only allows `Content-Type`. If future browser requests include non-simple headers (e.g. `Authorization`) or other requested headers, preflight can fail.

**Code:**
```ts
headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
headers["Access-Control-Allow-Headers"] = "Content-Type";
```

**Why this matters:**
This is a latent integration hazard: CORS may appear fine today (GET-only, simple requests) but break when request shapes evolve.

---

### [LOW] Finding #14: Dev-token error responses omit the explicit no-cache headers applied on success

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 9-23  
**Category:** will-break

**Description:**
On the success path, the handler sets `Cache-Control: no-store` and `Pragma: no-cache`. On the exception path, it returns a 500 with `corsHeaders(request)` only (no explicit cache headers). Depending on intermediaries, error responses could be cached differently than intended.

**Code:**
```ts
try {
  ...
  headers["Cache-Control"] = "no-store";
  headers["Pragma"] = "no-cache";
  return new Response(JSON.stringify(result), { status, headers });
} catch {
  const headers = corsHeaders(request) as Record<string, string>;
  return new Response(
    JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
    { status: 500, headers }
  );
}
```

**Why this matters:**
Inconsistent caching behavior around sensitive endpoints increases operational confusion and can worsen incident recovery (clients seeing cached failures).

---