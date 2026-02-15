# setlist.fm Proxy Deep Audit Findings

Audit Date: 2026-02-15  
Files Examined: 4  
Total Findings: 11

## Summary by Severity
- Critical: 0
- High: 3
- Medium: 6
- Low: 2

---

## Findings

### [HIGH] Finding #1: Public proxy can be abused to drain `SETLISTFM_API_KEY` quota (CORS is not access control)

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 11-44  
**Category:** will-break

**Description:**
This is a public, unauthenticated GET endpoint that triggers server-side calls to setlist.fm using the server’s `SETLISTFM_API_KEY` (via `handleSetlistProxy`). The only “restriction” visible here is CORS response headers, but CORS only affects whether browser JavaScript can read the response. Any non-browser client (curl, bots, server-to-server) can call this endpoint directly and force upstream requests, consuming rate limits/quota and potentially causing service degradation.

**Code:**
```ts
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? request.nextUrl.searchParams.get("url") ?? "";
  // ...
  const result = await handleSetlistProxy(id);
  // ...
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}
```

**Why this matters:**
Even if browser cross-origin reads are blocked, the server still performs the upstream call. This enables trivial automated abuse that burns the API key’s allowance and can cascade into 429s and user-visible failures.

---

### [HIGH] Finding #2: Upstream fetch has no timeout/abort; requests can hang and tie up server resources

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 92-125  
**Category:** will-break

**Description:**
`fetchSetlistFromApi` calls `fetch()` without any timeout/abort. Network stalls (DNS issues, upstream hangs, partial connectivity) can lead to long-running requests. Because this runs in an API route path, hung upstream calls can accumulate under load, consuming runtime resources and causing cascading latency/failures.

**Code:**
```ts
for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
  const res = await fetch(url, { headers });
  // ...
}
```

**Why this matters:**
In production, transient upstream/network issues are normal. Without a bounded request time, the proxy can become a bottleneck and amplify outages.

---

### [HIGH] Finding #3: “Cache eviction threshold” does not cap cache size; memory can grow unbounded within TTL window

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 38-67  
**Category:** will-break

**Description:**
The cache only evicts *expired* entries when `cache.size > CACHE_EVICT_THRESHOLD`. If an attacker (or heavy usage) requests many unique setlist IDs within the 1-hour TTL, none expire, so `evictExpired()` deletes nothing and the `Map` continues growing without bound. The threshold reduces eviction frequency but does not enforce a maximum size.

**Code:**
```ts
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, { body: unknown; expires: number }>();

const CACHE_EVICT_THRESHOLD = 200;

function setCached(id: string, body: unknown): void {
  cache.set(id, { body, expires: Date.now() + CACHE_TTL_MS });
  if (cache.size > CACHE_EVICT_THRESHOLD) {
    evictExpired();
  }
}
```

**Why this matters:**
A simple high-cardinality request pattern can cause steady memory growth, leading to process instability or crashes.

---

### [MEDIUM] Finding #4: Host validation contradicts comment; `includes("setlist.fm")` accepts lookalike domains

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 15-16  
**Category:** broken-logic

**Description:**
The comment says “only accept URLs whose host is setlist.fm”, but the implementation uses substring matching on hostname. This accepts hosts like `evilsetlist.fm` or `setlist.fm.evil.com`, which are not setlist.fm.

**Code:**
```ts
// only accept URLs whose host is setlist.fm ...
if (!url.hostname.toLowerCase().includes("setlist.fm")) return null;
```

**Why this matters:**
This is a correctness/security footgun: the parser claims to enforce strict host checks but does not. Even though the current code only extracts an ID (and later fetches a fixed setlist.fm API base), the mismatch invites future unsafe reuse and can accept misleading inputs.

---

### [MEDIUM] Finding #5: Setlist ID validation is inconsistent and overly permissive (e.g., accepts all-hyphen “IDs”)

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 18-35  
**Category:** broken-logic

**Description:**
The parser uses multiple, inconsistent acceptance rules:
- URL regex accepts 4–12 hex chars (`[a-f0-9]{4,12}`).
- Raw ID accepts 4–64 chars of `[a-f0-9-]`, which includes values like `"----"` (no hex digits at all).
- A fallback returns `withoutHtml` if it matches `^[a-f0-9-]+$` with no length constraints, potentially returning nonsense.

These rules can produce false positives (treat invalid input as an ID), resulting in confusing downstream errors and extra upstream calls.

**Code:**
```ts
const match = path.match(/-([a-f0-9]{4,12})\.html$/i);
// ...
if (withoutHtml && /^[a-f0-9-]+$/i.test(withoutHtml)) return withoutHtml;
// ...
if (/^[a-f0-9-]{4,64}$/i.test(trimmed)) return trimmed;
```

**Why this matters:**
Loose parsing increases unexpected 404s/429s and makes it harder to reason about input validity and error reporting.

---

### [MEDIUM] Finding #6: Upstream error message forwarding can leak raw upstream content (JSON/HTML) to clients

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 111-117  
**Category:** will-break

**Description:**
On non-OK responses, the code reads the entire response body as text and tries to parse JSON. If parsing succeeds but the JSON does not have a top-level `message`, it falls back to `text`, which is the full response payload. That payload then becomes `result.message` and is returned to clients (truncated later, but still raw upstream content).

**Code:**
```ts
const text = await res.text();
try {
  const json = JSON.parse(text) as { message?: string };
  lastMessage = json.message ?? (text || res.statusText);
} catch {
  lastMessage = text || res.statusText;
}
```

**Why this matters:**
This can expose upstream error formats/details directly to the frontend (including markup). If the frontend ever renders this unsafely, it can become an injection vector; even when rendered safely, it can leak implementation details and confuse users.

---

### [MEDIUM] Finding #7: Proxy forwards upstream error strings to clients with minimal sanitization

**File:** `apps/api/src/routes/setlist/proxy.ts`  
**Lines:** 38-46  
**Category:** will-break

**Description:**
`handleSetlistProxy` truncates error strings to 500 chars but otherwise forwards upstream-derived messages. Combined with the upstream behavior in `fetchSetlistFromApi`, this means end users can receive arbitrary upstream text/JSON/HTML fragments.

**Code:**
```ts
const MAX_ERROR_MESSAGE_LENGTH = 500;
const message =
  typeof result.message === "string" && result.message.length > MAX_ERROR_MESSAGE_LENGTH
    ? result.message.slice(0, MAX_ERROR_MESSAGE_LENGTH) + "…"
    : result.message;

return { error: message, status };
```

**Why this matters:**
Even truncated, returning raw upstream content is a common source of confusing UX and accidental information disclosure.

---

### [MEDIUM] Finding #8: No response-shape validation; `unknown` is passed through end-to-end

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 72-75, 96-109  
**Category:** will-break

**Description:**
Successful responses are typed as `unknown`, cached as `unknown`, and returned as-is. No runtime validation ensures the payload actually matches the expected setlist.fm “setlist” shape. If setlist.fm returns a partial payload, an error payload with 200 status, or an unexpected structure, downstream code may break or show incorrect data.

**Code:**
```ts
export type FetchSetlistResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; message: string };

// ...
body = (await res.json()) as unknown;
setCached(setlistId, body);
return { ok: true, body };
```

**Why this matters:**
This makes the system fragile to upstream changes and unusual edge responses, and it can turn upstream anomalies into hard-to-debug client issues.

---

### [MEDIUM] Finding #9: 429 handling is simplistic; no use of server guidance headers and no global throttling

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 69-133  
**Category:** will-break

**Description:**
The retry loop uses a fixed backoff schedule (1s, 2s) with a small retry count and does not consider any response headers that might guide retry timing (if present). It also retries per-request without any shared throttling, so concurrent bursts can repeatedly hit 429 and multiply load.

**Code:**
```ts
const MAX_RETRIES_429 = 2;
const BACKOFF_MS = 1000;

if (res.status === 429 && attempt < MAX_RETRIES_429) {
  await new Promise((r) => setTimeout(r, BACKOFF_MS * (attempt + 1)));
  continue;
}
```

**Why this matters:**
Under bursty traffic, this approach can increase latency, waste retries, and amplify rate-limit lockouts.

---

### [MEDIUM] Finding #10: Cache can serve stale setlist data despite API being “current version”; no cache-bypass mechanism

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 38-48, 80-82  
**Category:** will-break

**Description:**
The implementation caches setlist responses for 1 hour and always serves cached results when present. The setlist.fm API endpoint explicitly returns the “current version” of a setlist (which can change if edited), but this proxy can serve up to 1 hour of stale data with no bypass/refresh path.

**Code:**
```ts
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const cached = getCached(setlistId);
if (cached !== null) return { ok: true, body: cached };
```

**Why this matters:**
Users may see outdated setlist contents (tracks/ordering) after edits on setlist.fm, and the behavior will be inconsistent across instances (in-memory per process).

---

### [LOW] Finding #11: Minor code slop / redundancy in route handler status assignment

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 35-36  
**Category:** slop

**Description:**
The status computation is redundant and does not meaningfully branch; both sides return `result.status`. This looks like leftover code and adds noise to a security-sensitive route.

**Code:**
```ts
const status = "error" in result ? result.status : result.status;
```

**Why this matters:**
Small, unnecessary redundancy increases maintenance burden and can hide real logic mistakes during future changes.

---

## CORS-Specific Findings (Supporting File)

### [MEDIUM] Finding #12: Dynamic `Access-Control-Allow-Origin` without `Vary: Origin` can enable cache confusion

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 20-27  
**Category:** will-break

**Description:**
When CORS is enabled, `Access-Control-Allow-Origin` is set dynamically based on environment/request origin. The response headers do not include `Vary: Origin`. If an intermediary cache/CDN ever caches these GET responses, it could incorrectly serve a response with a previously set `Access-Control-Allow-Origin` value to a different requesting origin.

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
This is a classic subtle CORS + caching interaction that can produce inconsistent behavior and, in some configurations, weaken origin isolation.

---

## External References

- setlist.fm API documentation (API keys via `x-api-key` header), accessed 2026-02-15: https://api.setlist.fm/docs/1.0/index.html  
- setlist.fm API `GET /1.0/setlist/{setlistId}` (“current version” semantics), accessed 2026-02-15: https://api.setlist.fm/docs/1.0/resource__1.0_setlist__setlistId_.html