# setlist.fm Proxy Deep Audit Findings

Audit Date: 2026-02-14  
Files Examined: 7  
Total Findings: 16  

## Summary by Severity
- Critical: 0
- High: 4
- Medium: 8
- Low: 4

---

## Findings

### [HIGH] Finding #1: In-memory cache can grow without bound (memory/DoS risk)

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 36-65  
**Category:** will-break

**Description:**
The proxy caches successful setlist responses in a module-level `Map`. While there is a TTL and an “evict expired” pass, there is **no maximum cache size** and eviction only removes *expired* entries. Under steady traffic with many unique setlist IDs within the TTL window, the cache can grow indefinitely.

**Code:**
```ts
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, { body: unknown; expires: number }>();

const CACHE_EVICT_THRESHOLD = 200;

function evictExpired(): void {
  const now = Date.now();
  const toDelete: string[] = [];
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expires) toDelete.push(key);
  }
  toDelete.forEach((k) => cache.delete(k));
}

function setCached(id: string, body: unknown): void {
  cache.set(id, { body, expires: Date.now() + CACHE_TTL_MS });
  if (cache.size > CACHE_EVICT_THRESHOLD) {
    evictExpired();
  }
}
```

**Why this matters:**
A public-facing proxy endpoint can be driven with many unique IDs (valid-looking or random). Unbounded growth increases memory pressure and can crash long-lived processes or degrade performance.

---

### [HIGH] Finding #2: Network/`fetch()` failures are not handled (unhandled exception path)

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 74-123  
**Category:** will-break

**Description:**
`fetchSetlistFromApi` directly awaits `fetch(url, { headers })` without any try/catch. If DNS fails, the network is down, TLS errors occur, or the runtime aborts the request, `fetch()` can reject and **throw out of the function**, bypassing the structured `{ ok: false, status, message }` return type.

**Code:**
```ts
for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
  const res = await fetch(url, { headers });
  lastStatus = res.status;
  // ...
}
```

**Why this matters:**
Unhandled rejections can bubble up to the route handler and result in generic 500 responses, inconsistent JSON shapes, and missing CORS headers (see related findings).

---

### [HIGH] Finding #3: `handleSetlistProxy` does not guard against exceptions from the fetch layer

**File:** `apps/api/src/routes/setlist/proxy.ts`  
**Lines:** 30-34  
**Category:** will-break

**Description:**
`handleSetlistProxy` awaits `fetchSetlistFromApi` without try/catch. Any exception thrown by `fetchSetlistFromApi` (notably network `fetch()` rejections) will escape and crash the handler’s control flow.

**Code:**
```ts
const result = await fetchSetlistFromApi(setlistId, apiKey);

if (result.ok) {
  return { body: result.body, status: 200 };
}
```

**Why this matters:**
Even if most upstream failures are represented as HTTP statuses, real-world transient failures often manifest as thrown exceptions. This produces inconsistent behavior and error responses.

---

### [HIGH] Finding #4: Next.js route handler does not guard against thrown errors; failure responses may be non-JSON and lack CORS headers

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 13-29  
**Category:** will-break

**Description:**
The route handler directly awaits `handleSetlistProxy(id)` and then `JSON.stringify(body)` without try/catch. If `handleSetlistProxy` throws (see findings #2–#3) or if serialization throws, Next.js will generate a generic error response outside the handler’s explicit `corsHeaders(request)` usage.

**Code:**
```ts
export async function GET(request: NextRequest) {
  // ...
  const result = await handleSetlistProxy(id);
  const body = "error" in result ? { error: result.error } : result.body;

  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request),
  });
}
```

**Why this matters:**
Browser clients can see opaque “CORS error” failures when the server emits an unhandled 500 without `Access-Control-Allow-Origin`, making incidents harder to diagnose and breaking UX.

---

### [MEDIUM] Finding #5: 429 retry/backoff is fixed and ignores upstream pacing signals; can amplify traffic during rate limiting

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 67-131  
**Category:** will-break

**Description:**
On HTTP 429, the proxy retries up to `MAX_RETRIES_429` with a fixed, linear backoff and does not consult any response headers (e.g. a `Retry-After` value, if present). During a rate-limit event, this pattern can increase request volume (multiple attempts per client request) and prolong rate limiting.

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
Rate limits are typically a system-wide constraint. Retrying without coordinating on server-provided guidance can worsen the condition and cause more user-visible failures.

---

### [MEDIUM] Finding #6: Cache does not deduplicate concurrent in-flight requests for the same ID

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 78-107  
**Category:** will-break

**Description:**
If multiple requests for the same `setlistId` arrive concurrently, both can observe a cache miss and proceed to call the upstream API before the first response populates the cache. There is no in-flight promise registry / request coalescing.

**Code:**
```ts
const cached = getCached(setlistId);
if (cached !== null) return { ok: true, body: cached };

// upstream fetch happens after this point
const res = await fetch(url, { headers });
```

**Why this matters:**
This reduces the practical value of caching under load and can contribute to hitting 429 rate limits faster.

---

### [MEDIUM] Finding #7: Proxy returns and caches `unknown` without validating response shape or size

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 70-107  
**Category:** will-break

**Description:**
The upstream JSON is treated as `unknown`, cached as-is, and returned to the caller with no runtime validation (shape, required fields, or size constraints). The cache will store whatever JSON is returned on `res.ok`, including unexpected shapes.

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
Downstream code can implicitly assume certain fields exist and fail at runtime. Caching also increases blast radius if the upstream returns an unexpectedly large payload.

---

### [MEDIUM] Finding #8: URL/ID parsing rules are inconsistent and hardcoded; documented intent conflicts with implementation details

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 3-33  
**Category:** broken-logic

**Description:**
`parseSetlistIdFromInput` mixes multiple parsing strategies with different constraints:
- URL parsing primarily extracts `-[a-f0-9]{4,12}.html` or validates `idPart` as `{4,12}` hex.
- Raw ID parsing accepts `{4,64}` characters, but still restricted to `[a-f0-9-]` despite the comment stating “alphanumeric”.

This creates inconsistent acceptance rules between URL-derived IDs and direct IDs, and the comments do not match the actual regex constraints.

**Code:**
```ts
// e.g. /setlist/.../63de4613.html or .../abc1.html (DCI-005: allow 4-12 hex chars)
const match = path.match(/-([a-f0-9]{4,12})\.html$/i);

// raw ID (alphanumeric, possibly with hyphens)
if (/^[a-f0-9-]{4,64}$/i.test(trimmed)) return trimmed;
```

**Why this matters:**
Inconsistent parsing rules can cause confusing “invalid ID/URL” errors for some real-world inputs and make behavior differ depending on whether a user pastes a URL or an ID.

---

### [MEDIUM] Finding #9: URL parsing does not verify hostname or path category; may extract IDs from non-setlist pages/hosts

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 8-29  
**Category:** broken-logic

**Description:**
The “URL mode” triggers when the input contains `setlist.fm`, even if it is not a canonical setlist URL, and does not validate `url.hostname` or that `url.pathname` is actually a setlist page. Any pathname ending with `-<hex>.html` can yield an ID.

**Code:**
```ts
if (
  trimmed.startsWith("http://") ||
  trimmed.startsWith("https://") ||
  trimmed.includes("setlist.fm")
) {
  const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  const path = url.pathname;
  const match = path.match(/-([a-f0-9]{4,12})\.html$/i);
  if (match) return match[1];
  // ...
}
```

**Why this matters:**
Users can paste other setlist.fm pages (or lookalike domains) that happen to end in a similar pattern and get an extracted ID that leads to a confusing 404 from the API, masking the true input problem.

---

### [MEDIUM] Finding #10: Upstream error messages are reflected to clients (truncated but otherwise unsanitized)

**File:** `apps/api/src/routes/setlist/proxy.ts`  
**Lines:** 36-46  
**Category:** will-break

**Description:**
When upstream responses are non-2xx, the proxy forwards `result.message` back to the client (capped at 500 chars). The message content is derived from upstream body text/JSON and can include HTML, internal phrasing, or other details not meant for end users.

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
This can leak upstream implementation details into client-visible responses and creates inconsistent UX because error strings depend on upstream formatting.

---

### [MEDIUM] Finding #11: Query param selection bug when `id` is present but empty; `url` is ignored

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 14-20  
**Category:** broken-logic

**Description:**
The handler uses nullish coalescing (`??`) to select `id` over `url`. If the request includes `?id=` (empty string) and also includes a valid `?url=...`, `id` is treated as present (not null), so `url` is ignored, and the route returns a “Missing id or url” 400.

**Code:**
```ts
const id =
  request.nextUrl.searchParams.get("id") ??
  request.nextUrl.searchParams.get("url") ??
  "";
if (!id) {
  return new Response(JSON.stringify({ error: "Missing id or url query parameter" }), { status: 400, ... });
}
```

**Why this matters:**
Clients constructing URLs programmatically (or users editing query params) can trigger unexpected 400s even when a valid `url` parameter is present.

---

### [MEDIUM] Finding #12: CORS handling is minimal and does not include common preflight headers; OPTIONS response likely insufficient for some browsers/clients

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 19-26  
**Category:** will-break

**Description:**
`corsHeaders` only sets `Content-Type` and (optionally) `Access-Control-Allow-Origin`. It does not provide `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, or `Access-Control-Max-Age`. The route defines an `OPTIONS` handler, but it uses the same minimal headers, which may fail preflight checks when requests include non-simple headers or methods.

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
If a frontend ever sends a request that triggers a preflight (custom headers, some fetch configurations, etc.), the browser can block the response and surface generic CORS errors.

---

### [LOW] Finding #13: Missing `Vary: Origin` can cause incorrect caching behavior when behind shared caches/CDNs

**File:** `apps/web/src/lib/cors.ts`  
**Lines:** 19-26  
**Category:** slop

**Description:**
Responses vary based on the request `Origin` header, but the implementation does not emit `Vary: Origin`. If an intermediary cache stores responses, it can serve the wrong `Access-Control-Allow-Origin` behavior across different requesting origins.

**Code:**
```ts
const headers: HeadersInit = { "Content-Type": contentType };
if (allowOrigin) {
  (headers as Record<string, string>)["Access-Control-Allow-Origin"] = allowOrigin;
}
```

**Why this matters:**
CORS-related caching bugs are notoriously hard to diagnose; missing `Vary` increases the chance of intermittent failures in some deployments.

---

### [LOW] Finding #14: `OPTIONS` handler returns JSON content type with a null body

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 5-7  
**Category:** slop

**Description:**
The `OPTIONS` handler returns `new Response(null, ...)` but uses `corsHeaders(request)` which sets `Content-Type: application/json` by default.

**Code:**
```ts
export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
```

**Why this matters:**
This is a minor semantic mismatch that can confuse debugging tools and does not reflect the actual body content.

---

### [LOW] Finding #15: Minor code slop / redundancies in response handling

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 23-25  
**Category:** slop

**Description:**
The `status` assignment is redundant (`result.status` in both branches), and the handler’s local naming (`id` storing `url` inputs) reduces clarity.

**Code:**
```ts
const status = "error" in result ? result.status : result.status;
const body = "error" in result ? { error: result.error } : result.body;
```

**Why this matters:**
This increases maintenance overhead and makes audits for security-sensitive flows slightly harder.

---

### [LOW] Finding #16: Error bodies are fully buffered into memory and parsed; no guardrails on size

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 109-115  
**Category:** will-break

**Description:**
On non-2xx responses, the code reads the entire response body via `await res.text()` and then attempts `JSON.parse(text)`. There is no size cap, and the resulting message may later be forwarded to the client (truncated at a later layer).

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
Large upstream error bodies can increase latency and memory usage, and the forwarded message content can still be user-visible (even if truncated later).

---

## External References

- `https://api.setlist.fm/` (accessed 2026-02-14)  
- `https://api.setlist.fm/docs/1.0/index.html` (accessed 2026-02-14)  
- `https://www.setlist.fm/forum/setlistfm/setlistfm-api/406-response-code-for-apple-products-63d6e6c7` (accessed 2026-02-14)