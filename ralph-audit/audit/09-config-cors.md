# Config, Environment & CORS Findings

Audit Date: 2026-02-14T11:00:50Z  
Files Examined: 23  
Total Findings: 15

## Summary by Severity
- Critical: 1
- High: 4
- Medium: 6
- Low: 4

---

## Findings

### [CRITICAL] Finding #1: CORS “localhost” check is prefix-based and can be bypassed by attacker-controlled origins

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 7-17  
**Category:** will-break

**Description:**
`getAllowOrigin()` treats any `Origin` string that *starts with* `http://localhost` or `http://127.0.0.1` as “local”. This is not an exact host match. An attacker can host a page on an origin like `http://localhost.evil.com` (a valid origin) which passes the `startsWith("http://localhost")` check. When `ALLOWED_ORIGIN` is unset (or mis-set such that `single` becomes empty), the server will reflect that attacker origin in `Access-Control-Allow-Origin`, allowing browser JS on that origin to read responses from `/api/apple/dev-token`, `/api/setlist/proxy`, and `/api/health`.

**Code:**
```ts
const isLocalOrigin =
  origin &&
  (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
...
return isLocalOrigin ? origin : null;
```

**Why this matters:**
This is a credential/data exposure vector via browser CORS: a hostile web origin can read the Developer Token response (and proxy responses) if `ALLOWED_ORIGIN` isn’t set correctly.

---

### [HIGH] Finding #2: `ALLOWED_ORIGIN` is under-validated; common misformats can silently break CORS or behave unexpectedly

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 8-15  
**Category:** will-break

**Description:**
`ALLOWED_ORIGIN` is only `.trim()`’d and then treated as a single origin via `split(",")[0]`. There is no validation/normalization that it is a valid *origin* (scheme + host + optional port, no trailing slash, no path). Examples of problematic but plausible operator inputs:
- Trailing slash: `https://app.example.com/` (not a valid origin value for `Access-Control-Allow-Origin`).
- Comma-separated list: `https://a.example.com, https://b.example.com` (only the first is used; the second silently never works).
- Leading comma: `,https://app.example.com` (first entry trims to empty string, triggering the fallback behavior and potentially re-enabling the “local origin” reflection logic).

**Code:**
```ts
const configured = (process.env.ALLOWED_ORIGIN ?? "").trim();
...
const single = configured.split(",")[0].trim();
return single || (isLocalOrigin ? origin : null);
```

**Why this matters:**
Misconfiguration can cause production-only failures (frontend can’t read API responses due to CORS) or degrade the intended origin restriction behavior in surprising ways.

---

### [HIGH] Finding #3: Preflight (OPTIONS) responses are incomplete; CORS can fail for non-simple requests

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 19-27  
**Category:** will-break

**Description:**
`corsHeaders()` only sets `Content-Type` and (optionally) `Access-Control-Allow-Origin`. It does **not** include common preflight headers such as `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, or `Access-Control-Max-Age`. The API routes implement `OPTIONS` handlers (e.g., `apps/web/src/app/api/apple/dev-token/route.ts:5-7`, `apps/web/src/app/api/setlist/proxy/route.ts:5-7`, `apps/web/src/app/api/health/route.ts:6-8`) but they return the same minimal headers, which can cause browsers to reject cross-origin requests that trigger preflight (custom headers, credentials mode changes, future method changes, etc.).

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
Clients can experience opaque “CORS error” failures even when the origin is intended to be allowed.

---

### [MEDIUM] Finding #4: Responses vary by `Origin` but do not include `Vary: Origin` (cache correctness risk)

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 19-27  
**Category:** will-break

**Description:**
When `ALLOWED_ORIGIN` is unset (or when fallback returns the request’s origin), the value of `Access-Control-Allow-Origin` varies based on the incoming `Origin` header. The implementation does not emit `Vary: Origin`. Intermediary caches (CDNs, proxies) can cache a response with one `Access-Control-Allow-Origin` value and serve it to a different requesting origin, causing incorrect CORS behavior.

**Code:**
```ts
const headers: HeadersInit = { "Content-Type": contentType };
if (allowOrigin) {
  (headers as Record<string, string>)["Access-Control-Allow-Origin"] = allowOrigin;
}
```

**Why this matters:**
Caching edge cases can produce confusing, inconsistent CORS behavior across users/origins.

---

### [HIGH] Finding #5: Unhandled exceptions can cause responses without CORS headers (browser sees “CORS error” instead of JSON)

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 13-30  
**Category:** will-break

**Description:**
The handler directly awaits `handleSetlistProxy(id)` and then `JSON.stringify(body)` without a `try/catch`. If `handleSetlistProxy` throws (e.g., network-level fetch error in upstream code) or if serialization throws, Next.js will generate a framework error response outside this handler’s explicit `corsHeaders(request)` usage. In cross-origin browser usage, this frequently manifests as an opaque “CORS error” because the thrown-path response may not include `Access-Control-Allow-Origin` or a JSON body.

**Code:**
```ts
const result = await handleSetlistProxy(id);
...
return new Response(JSON.stringify(body), {
  status,
  headers: corsHeaders(request),
});
```

**Why this matters:**
CORS and error-handling interact: the “happy path” includes CORS headers, but the thrown-path likely does not, degrading reliability and debuggability.

---

### [MEDIUM] Finding #6: `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` is not normalized before use; whitespace can pass validation but break configuration

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 103-116  
**Category:** will-break

**Description:**
The code checks `APPLE_MUSIC_APP_ID.trim() === ""` to detect missing/blank config, but then passes the **untrimmed** `APPLE_MUSIC_APP_ID` to `MusicKit.configure`. If the env value contains leading/trailing whitespace (e.g., `" my-app-id "`), it passes the “required” check but still uses the invalid spaced value downstream. This is amplified by `apps/web/src/lib/config.ts:18-20`, which exports `APPLE_MUSIC_APP_ID` from `process.env` without trimming.

**Code:**
```ts
if (!APPLE_MUSIC_APP_ID || APPLE_MUSIC_APP_ID.trim() === "") { ... }
...
appId: APPLE_MUSIC_APP_ID,
```

**Why this matters:**
This creates a subtle “looks configured but still fails” class of production configuration bugs.

---

### [MEDIUM] Finding #7: `NEXT_PUBLIC_API_URL` trailing-slash normalization only removes one slash; multiple slashes can produce malformed URLs

**File:** `apps/web/src/lib/config.ts`  
**Lines:** 12-16  
**Category:** will-break

**Description:**
`API_BASE_URL` does `.trim().replace(/\/$/, "")`, which removes only a single trailing slash. Values like `http://localhost:3000///` normalize to `http://localhost:3000//` (still has trailing slash(es)). `apps/web/src/lib/api.ts:14-18` also only removes a single trailing slash before concatenation. This can produce URLs containing `//api/...`, which can cause inconsistent behavior depending on intermediaries and servers.

**Code:**
```ts
? process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/$/, "")
: "";
```

**Why this matters:**
URL construction becomes sensitive to minor formatting differences in env values, creating hard-to-diagnose environment-specific failures.

---

### [MEDIUM] Finding #8: `apiUrl()` hard-codes the `/api` prefix; base URLs with path prefixes (or APIs mounted differently) can break

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 4-18  
**Category:** will-break

**Description:**
`apiUrl()` always appends `"/api"` when `API_BASE_URL` is set. It only strips a trailing `/api` from the base (case-insensitive). If an operator sets `NEXT_PUBLIC_API_URL` to a URL that already includes a path prefix other than exactly `/api` (e.g., `https://example.com/api/v1`), the constructed URLs become `https://example.com/api/v1/api/...`. Likewise, if a future “standalone API” is mounted at root without `/api`, this helper still forces `/api`.

**Code:**
```ts
const base = raw.replace(/\/$/, "").replace(/\/api$/i, "");
...
const apiSegment = "/api";
if (base) return `${base}${apiSegment}${p}`;
```

**Why this matters:**
This is a configuration footgun when environments differ (same-origin Next.js vs. separate API host vs. reverse-proxied paths).

---

### [LOW] Finding #9: Misleading/duplicated URL-building comments/constants add confusion to config expectations

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 3-7  
**Category:** slop

**Description:**
The comment says “Base path … (same app: /api, or empty when using API_BASE_URL with trailing path)”, but the implementation always uses `"/api"` as the segment for both same-origin and `API_BASE_URL` cases. Additionally, both `API_PATH` and `apiSegment` represent the same literal value.

**Code:**
```ts
/** Base path ... (same app: /api, or empty when using API_BASE_URL with trailing path). */
const API_PATH = "/api";
...
const apiSegment = "/api";
```

**Why this matters:**
It increases the chance of operators assuming unsupported base URL shapes are supported.

---

### [MEDIUM] Finding #10: `.env.example` CORS guidance is partially inaccurate and omits critical formatting constraints

**File:** `.env.example`  
**Lines:** 18-19  
**Category:** will-break

**Description:**
The `.env.example` comment states that when `ALLOWED_ORIGIN` is unset, only `http://localhost` is allowed. Current code also allows `http://127.0.0.1*` and uses prefix matching (see `apps/web/src/lib/cors.ts:9-16`). The example also does not warn that `ALLOWED_ORIGIN` must be a single exact origin value (no trailing slash, no comma-separated list), even though the implementation only uses the first comma-separated entry and otherwise emits the value as-is.

**Code:**
```dotenv
# CORS: required in production. When unset, only http://localhost is allowed (DCI-001).
# ALLOWED_ORIGIN=https://your-app.example.com
```

**Why this matters:**
Operators can deploy with subtly broken or insecure CORS due to misleading/incomplete env documentation.

---

### [MEDIUM] Finding #11: Apple Music docs reference a dev-token endpoint path that does not match the actual API routes

**File:** `docs/tech/apple-music.md`  
**Lines:** 19-22  
**Category:** will-break

**Description:**
The docs list `GET /apple/dev-token` (or equivalent), but the implemented route is `GET /api/apple/dev-token` (`apps/web/src/app/api/apple/dev-token/route.ts:9-16`). This mismatch can lead to incorrect reverse-proxy rules, monitoring checks, or client assumptions when configuring `NEXT_PUBLIC_API_URL`.

**Code:**
```md
- `GET /apple/dev-token` (or equivalent): Returns `{ token: "…" }` or `{ error: "…" }`. CORS restricted to our frontend origin.
```

**Why this matters:**
Path mismatches in configuration docs regularly cause production outages and misrouted traffic.

---

### [LOW] Finding #12: Multiple internal docs describe a different (older) CORS policy than the code actually enforces

**File:** `docs/code-inspection-findings.md`  
**Lines:** 55-60  
**Category:** slop

**Description:**
Several internal docs describe a CORS behavior that no longer matches the implementation:
- `docs/code-inspection-findings.md:55-60` claims “any HTTPS origin” is reflected when `ALLOWED_ORIGIN` is unset.
- `docs/exec-plans/completed/002-api-dev-token.md:7-11` and `docs/exec-plans/completed/003-api-setlistfm-proxy.md:11-14` describe a localhost/**https** fallback.
Current code (`apps/web/src/lib/cors.ts:9-16`) does not implement those behaviors. This can lead to incorrect security assumptions during review or deployment.

**Code:**
```md
- **What:** ... (origin.startsWith("http://localhost") || origin.startsWith("https://")) ...
... any request with an `Origin` starting with `https://` gets that origin reflected ...
```

**Why this matters:**
Stale security documentation can be as harmful as missing documentation: it misguides reviewers and operators about the system’s actual exposure.

---

### [LOW] Finding #13: Test fixture includes a real PEM private key committed to the repository

**File:** `apps/api/tests/fixtures/apple-test-key.pem`  
**Lines:** 1-5  
**Category:** slop

**Description:**
A PEM-formatted EC private key is checked in as a test fixture. Even if intended to be non-production, it is still private key material present in the repo.

**Code:**
```text
-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...
-----END PRIVATE KEY-----
```

**Why this matters:**
Key material in-repo is a high-risk pattern if it ever gets reused outside tests or mistaken for a real credential.

---

### [LOW] Finding #14: Redundant status assignment suggests copy/paste and makes route logic harder to trust

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 22-25  
**Category:** slop

**Description:**
`status` is assigned via a conditional that returns the same value on both branches. This looks like leftover scaffolding and increases the chance future edits accidentally introduce divergence.

**Code:**
```ts
const status = "error" in result ? result.status : result.status;
```

**Why this matters:**
Small “slop” in API glue code tends to accumulate and becomes a source of subtle regressions.

---

### [HIGH] Finding #15: CORS headers are the only “restriction”; endpoints still return tokens/data to any caller (CORS is not server-side access control)

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 9-16  
**Category:** will-break

**Description:**
The dev-token route always returns the token payload (or error payload) to the requester. There is no server-side authorization check based on `Origin` (or any other credential). The only “restriction” in this layer is adding `Access-Control-Allow-Origin` via `corsHeaders(request)`, which only affects whether **browsers** expose the response to JS. Non-browser clients (curl, bots, server scripts) can call the endpoint and receive the response regardless of CORS headers. The same applies to the setlist proxy route (`apps/web/src/app/api/setlist/proxy/route.ts:13-30`).

**Code:**
```ts
export async function GET(request: NextRequest) {
  const result = await handleDevToken();
  const status = "error" in result ? 503 : 200;
  return new Response(JSON.stringify(result), {
    status,
    headers: corsHeaders(request),
  });
}
```

**Why this matters:**
Relying on CORS alone does not prevent token/proxy abuse by non-browser clients, and can create a false sense of protection in deployment/security reviews.