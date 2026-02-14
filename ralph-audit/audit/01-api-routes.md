```markdown
# Next.js API Routes Deep Audit Findings

Audit Date: 2026-02-14T10:08:03Z  
Files Examined: 3  
Total Findings: 14  

## Summary by Severity
- Critical: 2
- High: 5
- Medium: 4
- Low: 3

---

## Findings

### [CRITICAL] Finding #1: `GET /api/apple/dev-token` is publicly callable; CORS does not prevent non-browser access

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 9-15  
**Category:** will-break  

**Description:**
This route issues an Apple MusicKit Developer Token to any caller. The only “restriction” in this module is CORS headers (via `corsHeaders(request)`), but CORS is enforced by browsers—not by the server. Any non-browser client (curl, server script, bot) can call this endpoint and receive a valid `token` response regardless of `Origin` / CORS behavior.

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
If the security model assumes “only my frontend can mint tokens,” this assumption is false at the HTTP layer; the endpoint can be harvested/abused outside the browser context.

---

### [HIGH] Finding #2: Developer token response lacks explicit anti-caching headers (token may be stored by intermediaries)

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 9-15  
**Category:** will-break  

**Description:**
The response contains a bearer token (`{ token: string }`) but no `Cache-Control`/`Pragma` headers are set in this route. Depending on client/proxy/CDN behavior, the token response could be cached/stored longer than intended.

**Code:**
```ts
return new Response(JSON.stringify(result), {
  status,
  headers: corsHeaders(request),
});
```

**Why this matters:**
Developer tokens are credentials. Accidental caching increases exposure risk and can create confusing “stale token” behaviors.

---

### [MEDIUM] Finding #3: Token route collapses all error cases into HTTP 503 (status code likely inaccurate for some failures)

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 10-15  
**Category:** broken-logic  

**Description:**
The route maps any `{ error: string }` result to HTTP 503. This conflates at least two materially different cases: permanent misconfiguration (missing env) vs. transient/service failure (signing failure). The API package return type does not include a status, so the mapping here is simplistic and potentially misleading for clients/monitors.

**Code:**
```ts
const status = "error" in result ? 503 : 200;
```

**Why this matters:**
Incorrect status codes lead to incorrect retry/backoff, misleading uptime checks, and harder-to-debug production behavior.

---

### [HIGH] Finding #4: `OPTIONS` handler does not implement full CORS preflight (likely breaks non-simple requests)

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 5-7  
**Category:** will-break  

**Description:**
The `OPTIONS` route returns only `corsHeaders(request)`. In this repo, `corsHeaders` sets `Content-Type` and (conditionally) `Access-Control-Allow-Origin`, but does not set key preflight headers such as `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` (see `apps/web/src/lib/cors.ts:19-26`). If the browser sends a preflight (e.g., due to `Authorization` or `Content-Type: application/json`), the preflight can fail even when the origin is allowed.

**Code:**
```ts
export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
```

**Why this matters:**
Cross-origin calls can fail intermittently depending on how the frontend constructs requests, creating fragile production behavior that’s hard to diagnose.

---

### [CRITICAL] Finding #5: `GET /api/setlist/proxy` is publicly callable; CORS does not prevent non-browser abuse of the proxy

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 13-29  
**Category:** will-break  

**Description:**
This route proxies setlist.fm data and is intended to keep the setlist.fm API key server-side. While the key is not returned, the endpoint itself is still publicly callable by any client (CORS does not block non-browser requests). That means anyone can use this endpoint as an open proxy to consume your server resources and your setlist.fm quota.

**Code:**
```ts
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? request.nextUrl.searchParams.get("url") ?? "";
  if (!id) {
    return new Response(
      JSON.stringify({ error: "Missing id or url query parameter" }),
      { status: 400, headers: corsHeaders(request) }
    );
  }

  const result = await handleSetlistProxy(id);
  // ...
}
```

**Why this matters:**
Even without direct API key leakage, an unauthenticated proxy endpoint can be abused (quota exhaustion, elevated hosting costs, degraded service for real users).

---

### [HIGH] Finding #6: Unhandled exceptions in setlist proxy route can return non-JSON 500 responses without CORS headers

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 22-29  
**Category:** will-break  

**Description:**
The route does not wrap `handleSetlistProxy(id)` (or JSON serialization) in error handling. If the underlying call rejects/throws (network error, unexpected runtime error), the handler can crash and Next.js will emit a generic 500 response. That response may not include `Access-Control-Allow-Origin` and may not be JSON, breaking browser clients and producing inconsistent behavior.

**Code:**
```ts
const result = await handleSetlistProxy(id);
// ...
return new Response(JSON.stringify(body), {
  status,
  headers: corsHeaders(request),
});
```

**Why this matters:**
A single upstream failure mode can turn into a client-visible “CORS error” or JSON parse failure, obscuring root cause and harming UX.

---

### [MEDIUM] Finding #7: Query fallback bug: `??` treats empty `id` as present and prevents `url` fallback

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 14-20  
**Category:** broken-logic  

**Description:**
The code uses nullish coalescing (`??`) to choose between `id` and `url`. If the request is `?id=&url=<valid>`, `searchParams.get("id")` returns `""` (empty string), which is not nullish, so the `url` param is ignored and the handler returns 400.

**Code:**
```ts
const id =
  request.nextUrl.searchParams.get("id") ??
  request.nextUrl.searchParams.get("url") ??
  "";
if (!id) {
  return new Response(
    JSON.stringify({ error: "Missing id or url query parameter" }),
    { status: 400, headers: corsHeaders(request) }
  );
}
```

**Why this matters:**
Valid client input can be rejected due to a subtle truthiness/nullish mismatch, creating hard-to-debug “it works sometimes” behavior.

---

### [MEDIUM] Finding #8: No normalization/limits on `id`/`url` query input before passing downstream

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 14-22  
**Category:** will-break  

**Description:**
The route passes the raw query value to `handleSetlistProxy` without trimming, length checks, or basic sanity constraints. Inputs containing whitespace-only values, extremely long strings, or unexpected encodings can produce inconsistent downstream behavior and may increase resource usage.

**Code:**
```ts
const id = request.nextUrl.searchParams.get("id") ?? request.nextUrl.searchParams.get("url") ?? "";
// ...
const result = await handleSetlistProxy(id);
```

**Why this matters:**
Unbounded, unnormalized inputs are a common source of edge-case bugs and reliability issues, especially for proxy endpoints.

---

### [LOW] Finding #9: Redundant conditional for `status` is dead code / copy-paste residue

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 23-23  
**Category:** slop  

**Description:**
The `status` assignment uses a conditional but returns the same expression on both branches, which is functionally pointless. This strongly suggests leftover placeholder logic or a refactor mistake.

**Code:**
```ts
const status = "error" in result ? result.status : result.status;
```

**Why this matters:**
Code slop in API routes increases maintenance cost and reduces confidence that error-handling logic is intentional and correct.

---

### [LOW] Finding #10: Response shapes are inconsistent (raw upstream on success vs `{ error }` on failure)

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 22-29  
**Category:** slop  

**Description:**
On success, the route returns the raw `result.body` (typed as `unknown` in the API package). On error, it returns a new `{ error: string }` wrapper, discarding any structure that might exist in the upstream error payload. This yields a “shape-shifting” API response with no stable envelope.

**Code:**
```ts
const body = "error" in result ? { error: result.error } : result.body;

return new Response(JSON.stringify(body), {
  status,
  headers: corsHeaders(request),
});
```

**Why this matters:**
Clients must implement ad-hoc branching logic and may fail at runtime if they assume a stable response structure.

---

### [HIGH] Finding #11: Setlist proxy `OPTIONS` handler does not implement full CORS preflight (likely breaks non-simple requests)

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 5-7  
**Category:** will-break  

**Description:**
As with the dev-token route, the `OPTIONS` handler only returns `corsHeaders(request)`. In this repo, that helper does not set `Access-Control-Allow-Methods`/`Access-Control-Allow-Headers` (see `apps/web/src/lib/cors.ts:19-26`), which can cause browser preflight failures depending on request headers.

**Code:**
```ts
export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
```

**Why this matters:**
Cross-origin behavior becomes fragile and dependent on subtle frontend request construction details.

---

### [HIGH] Finding #12: Health route `OPTIONS` handler claims to support preflight, but does not implement full preflight headers

**File:** `apps/web/src/app/api/health/route.ts`  
**Lines:** 5-8  
**Category:** will-break  

**Description:**
The comment explicitly frames this `OPTIONS` handler as enabling CORS preflight (“so cross-origin health checks succeed”), but the headers returned via `corsHeaders(request)` do not include key preflight headers such as `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` (see `apps/web/src/lib/cors.ts:19-26`). This can cause preflight failures for non-simple health requests.

**Code:**
```ts
/** DCI-043: OPTIONS for CORS preflight so cross-origin health checks succeed. */
export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
```

**Why this matters:**
The implementation does not fully match its stated intent; monitoring tooling or browser-based health checks may fail unexpectedly.

---

### [MEDIUM] Finding #13: Health response lacks explicit cache-control; liveness checks may be cached and become misleading

**File:** `apps/web/src/app/api/health/route.ts`  
**Lines:** 14-19  
**Category:** will-break  

**Description:**
The health endpoint returns a timestamped payload but sets no explicit cache headers. If any intermediary caches the response, clients/load balancers may see stale “ok” status and stale timestamps.

**Code:**
```ts
export async function GET(request: NextRequest) {
  const body = handleHealth();
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: corsHeaders(request),
  });
}
```

**Why this matters:**
Health checks are often used for routing and alerting. Cached responses can mask outages or create false confidence.

---

### [LOW] Finding #14: Type-only import inconsistency for `NextRequest` in route modules

**File:** `apps/web/src/app/api/health/route.ts`, `apps/web/src/app/api/apple/dev-token/route.ts`, `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** health: 2; dev-token: 2; setlist/proxy: 2  
**Category:** slop  

**Description:**
Each route imports `NextRequest` as a normal import, but uses it only for typing in the handler signature. Elsewhere in the codebase (e.g., `apps/web/src/lib/cors.ts:1`) the code uses `import type`. Depending on TypeScript/ESLint settings, this can be flagged and creates inconsistent style across API route modules.

**Code:**
```ts
import { NextRequest } from "next/server";
```

**Why this matters:**
Inconsistent import style increases lint churn and makes it harder to enforce a consistent TS module boundary pattern.
```