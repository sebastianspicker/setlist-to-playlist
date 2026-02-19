# Next.js API Routes Deep Audit Findings

Audit Date: 2026-02-15T06:32:52Z  
Files Examined: 3  
Total Findings: 10  

## Summary by Severity
- Critical: 1
- High: 1
- Medium: 5
- Low: 3

---

## Findings

### [CRITICAL] Finding #1: Public, unauthenticated setlist.fm proxy enables third-party abuse of the server-side API key (CORS is not access control)

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 11-43  
**Category:** will-break  

**Description:**
This route exposes a public GET endpoint that proxies requests to setlist.fm via `handleSetlistProxy(id)`. The only access gating in this file is CORS response headers. CORS only controls whether *browser JavaScript* can read a response; it does not prevent:
- Server-to-server callers (curl, scripts, bots) from calling `/api/setlist/proxy` and receiving the full response.
- Abuse that consumes setlist.fm quota / rate limits associated with the server’s `SETLISTFM_API_KEY`.

As written, any external party can use this endpoint as a free relay to setlist.fm (or as a traffic amplifier), potentially exhausting rate limits, causing service degradation, or triggering key revocation—without needing the client app.

**Code:**
```typescript
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? request.nextUrl.searchParams.get("url") ?? "";
  // ...
  try {
    const result = await handleSetlistProxy(id);
    const status = "error" in result ? result.status : result.status;
    const body = "error" in result ? { error: result.error } : result.body;
    return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
  } catch {
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
```

**Why this matters:**
It creates an effectively public API-key-backed proxy surface. Even if browsers are blocked by CORS, non-browser clients can still exploit the endpoint and drain the API key’s quota or cause rate-limiting/outages.

---

### [HIGH] Finding #2: Public, unauthenticated Apple Developer Token issuance endpoint (CORS does not prevent non-browser clients from fetching tokens)

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 9-23  
**Category:** will-break  

**Description:**
This route returns an Apple Developer Token to any caller that can reach `/api/apple/dev-token`. Similar to the setlist proxy, the only “restriction” here is CORS response headers, which do not prevent server-side clients or bots from calling the endpoint and receiving the token.

There is also no evidence of throttling/rate limiting or any caller verification in this file; the endpoint is a public token mint + distribution surface.

**Code:**
```typescript
export async function GET(request: NextRequest) {
  try {
    const result = await handleDevToken();
    const status = "error" in result ? 503 : 200;
    const headers = corsHeaders(request) as Record<string, string>;
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
}
```

**Why this matters:**
It expands the token’s exposure surface to the entire internet (not just the intended frontend), increasing risk of misuse and operational incidents.

---

### [MEDIUM] Finding #3: Query parameter precedence bug — `?id=` masks a valid `?url=...` due to `??` fallback semantics

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 16-23  
**Category:** broken-logic  

**Description:**
The route chooses between `id` and `url` using nullish coalescing (`??`). If a caller supplies `?id=` (empty string) and also provides a valid `?url=...`, `searchParams.get("id")` returns `""` (not `null`), so the code selects the empty `id` and never considers `url`. The request then fails with “Missing id or url query parameter” even though `url` was present.

**Code:**
```typescript
const id = request.nextUrl.searchParams.get("id") ?? request.nextUrl.searchParams.get("url") ?? "";
if (!id) {
  return new Response(
    JSON.stringify({ error: "Missing id or url query parameter" }),
    { status: 400, headers: corsHeaders(request) }
  );
}
```

**Why this matters:**
It causes surprising/incorrect behavior for clients and can lead to hard-to-debug failures when multiple parameters are present (including accidental `id=`).

---

### [MEDIUM] Finding #4: `dev-token` handler sets `no-store`/`no-cache` only on the non-exception path; exception responses omit anti-caching headers

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 10-23  
**Category:** will-break  

**Description:**
In the try-path, the response is explicitly marked `Cache-Control: no-store` and `Pragma: no-cache`. In the exception path (`catch { ... }`), the handler does not set these headers.

**Code:**
```typescript
// try-path
headers["Cache-Control"] = "no-store";
headers["Pragma"] = "no-cache";
return new Response(JSON.stringify(result), { status, headers });

// catch-path
return new Response(
  JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
  { status: 500, headers }
);
```

**Why this matters:**
Token-related endpoints are sensitive to caching behavior. Divergent caching headers between success/error paths can lead to inconsistent intermediary behavior and operational confusion during incidents.

---

### [MEDIUM] Finding #5: Exception handling drops all error details (no capture, no logging), reducing debuggability during production failures (`dev-token`)

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 17-23  
**Category:** will-break  

**Description:**
The handler uses `catch { ... }` without capturing the thrown error object, and it returns a generic error message. There is no observable error detail in the response, and this file provides no logging/telemetry hook.

**Code:**
```typescript
} catch {
  const headers = corsHeaders(request) as Record<string, string>;
  return new Response(
    JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
    { status: 500, headers }
  );
}
```

**Why this matters:**
If unexpected exceptions occur (dependency failures, runtime issues, serialization edge cases), diagnosing the root cause becomes substantially harder.

---

### [MEDIUM] Finding #6: Exception handling drops all error details (no capture, no logging), reducing debuggability during production failures (`setlist/proxy`)

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 33-42  
**Category:** will-break  

**Description:**
Like the dev-token route, this handler uses a bare `catch { ... }` and returns a generic error message, with no captured error detail and no logging.

**Code:**
```typescript
} catch {
  return new Response(
    JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
    { status: 500, headers: corsHeaders(request) }
  );
}
```

**Why this matters:**
When upstream fetching/parsing fails unexpectedly, operators and developers may see only generic client-side failures with limited actionable information.

---

### [MEDIUM] Finding #7: Responses are origin-dependent via `corsHeaders(request)` but no `Vary: Origin` header is set in route responses (cache interaction risk)

**File:** `apps/web/src/app/api/health/route.ts`  
**Lines:** 6-8, 14-19  
**Category:** will-break  

**Description:**
This route computes response headers from the request object via `corsHeaders(request)` / `corsHeadersForOptions(request)` but does not set `Vary: Origin`. If any caching layer (platform/CDN/proxy) is present and does not incorporate `Origin` into its cache key, it can cache and replay responses across different origins with mismatched CORS headers.

**Code:**
```typescript
return new Response(null, { status: 204, headers: corsHeadersForOptions(request) });
// ...
return new Response(JSON.stringify(body), {
  status: 200,
  headers: corsHeaders(request),
});
```

**Why this matters:**
It can cause intermittent, hard-to-reproduce CORS failures (and confusing behavior differences between environments) when caches are involved.

---

### [LOW] Finding #8: Redundant / dead conditional — `status` assignment uses identical branches (`setlist/proxy`)

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 34-37  
**Category:** slop  

**Description:**
The `status` assignment is a ternary whose branches are identical, making it redundant and suggesting incomplete refactoring or copy/paste.

**Code:**
```typescript
const result = await handleSetlistProxy(id);
const status = "error" in result ? result.status : result.status;
const body = "error" in result ? { error: result.error } : result.body;
```

**Why this matters:**
It adds noise, weakens readability, and can conceal intended-but-missing logic (especially around error vs success handling).

---

### [LOW] Finding #9: Type-unsafe header mutation via cast to `Record<string, string>` (`dev-token`)

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 13-16  
**Category:** slop  

**Description:**
`corsHeaders(request)` returns `HeadersInit`, but this handler casts it to `Record<string, string>` and mutates it in-place. This couples correctness to the current implementation detail that `corsHeaders()` returns a plain object; if the helper ever returns a `Headers` instance or an array-of-tuples, this pattern becomes fragile.

**Code:**
```typescript
const headers = corsHeaders(request) as Record<string, string>;
headers["Cache-Control"] = "no-store";
headers["Pragma"] = "no-cache";
```

**Why this matters:**
It’s a maintainability hazard that can introduce runtime bugs during refactors of shared CORS utilities.

---

### [LOW] Finding #10: Health endpoint provides a timestamp but does not include explicit cache directives

**File:** `apps/web/src/app/api/health/route.ts`  
**Lines:** 10-19  
**Category:** slop  

**Description:**
The health endpoint returns a timestamp intended to reflect “now,” but the response does not include explicit cache directives (e.g., no `Cache-Control` in this file). Depending on deployment infrastructure, intermediate caching could produce stale timestamps.

**Code:**
```typescript
export async function GET(request: NextRequest) {
  const body = handleHealth();
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: corsHeaders(request),
  });
}
```

**Why this matters:**
A liveness/health signal that is accidentally cached can mislead monitoring, diagnostics, or load balancer health checks.