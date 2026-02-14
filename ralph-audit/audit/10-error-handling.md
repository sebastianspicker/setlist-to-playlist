# Error Handling Findings

Audit Date: 2026-02-14T11:09:59Z  
Files Examined: 37  
Total Findings: 15

## Summary by Severity
- Critical: 0
- High: 3
- Medium: 10
- Low: 2

---

## Findings

### HIGH Finding #1: Unhandled `fetch()` rejections bypass the function’s structured error return type

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 74-93  
**Category:** will-break

**Description:**
`fetchSetlistFromApi()` advertises a fully-structured result type (`{ ok: true } | { ok: false, status, message }`), but it directly awaits `fetch(url, { headers })` without any error containment. Network-level failures (DNS, TLS, connection resets, runtime aborts) will throw and escape the function, skipping the typed error path entirely.

**Code:**
```ts
for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
  const res = await fetch(url, { headers });
  lastStatus = res.status;
```

**Why this matters:**
Downstream handlers assume this function *returns* a `FetchSetlistResult`. When it throws instead, callers fall out of their normal error handling and can generate unexpected 500s and non-JSON responses.

---

### HIGH Finding #2: Proxy handler awaits a potentially-throwing function with no containment

**File:** `apps/api/src/routes/setlist/proxy.ts`  
**Lines:** 30-46  
**Category:** will-break

**Description:**
`handleSetlistProxy()` directly awaits `fetchSetlistFromApi()` without guarding against exceptions. Given `fetchSetlistFromApi()` can throw (see Finding #1), this handler can throw despite its own return type claiming it always resolves to a `ProxyResponse`.

**Code:**
```ts
const result = await fetchSetlistFromApi(setlistId, apiKey);

if (result.ok) {
  return { body: result.body, status: 200 };
}
```

**Why this matters:**
Any thrown exception escapes into the Next.js route layer(s), producing generic error responses and breaking the client’s expectation of a JSON `{ error }` payload.

---

### HIGH Finding #3: Next.js route returns JSON only on the “happy path”; thrown exceptions bypass CORS + JSON formatting

**File:** `apps/web/src/app/api/setlist/proxy/route.ts`  
**Lines:** 13-29  
**Category:** will-break

**Description:**
The route handler does not contain exceptions from `handleSetlistProxy(id)` (which can throw via the API-layer chain described in Findings #1–#2). If an exception escapes, Next.js will generate an error response outside the explicit `corsHeaders(request)` usage.

**Code:**
```ts
const result = await handleSetlistProxy(id);
const body = "error" in result ? { error: result.error } : result.body;

return new Response(JSON.stringify(body), {
  status,
  headers: corsHeaders(request),
});
```

**Why this matters:**
Clients expecting CORS headers and JSON (and calling `res.json()`) can instead receive a non-JSON framework error response (often HTML), triggering secondary parse failures and obscuring the original issue.

---

### MEDIUM Finding #4: Signing failures are swallowed with a generic message and no local diagnostic signal

**File:** `apps/api/src/routes/apple/dev-token.ts`  
**Lines:** 20-32  
**Category:** slop

**Description:**
The handler catches all errors during signing but discards the exception (no capture, no message, no logging in this function) and returns a generic error string. The returned message instructs operators to “check logs”, but this function itself does not emit any log signal.

**Code:**
```ts
try {
  const token = await signDeveloperToken({ teamId, keyId, privateKeyPem: privateKey });
  ...
  return { token };
} catch {
  return { error: "Token signing failed. Check server configuration and logs." };
}
```

**Why this matters:**
Operational failures are hard to triage from runtime behavior alone: all signing errors collapse into the same response, and there is no guaranteed correlation point emitted by this code path.

---

### MEDIUM Finding #5: Next.js dev-token route assumes `handleDevToken()` never throws; an exception would bypass JSON + CORS response shape

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 9-16  
**Category:** will-break

**Description:**
`GET()` directly awaits `handleDevToken()` and then constructs a JSON response. If `handleDevToken()` ever throws (unexpected runtime error, import/package mismatch, serialization edge case), the handler will not return a controlled JSON error payload with `corsHeaders(request)`.

**Code:**
```ts
export async function GET(request: NextRequest) {
  const result = await handleDevToken();
  const status = "error" in result ? 503 : 200;
  return new Response(JSON.stringify(result), { status, headers: corsHeaders(request) });
}
```

**Why this matters:**
The client-side token fetch path (`fetchDeveloperToken()` → `res.json()`) is sensitive to non-JSON responses; an unexpected framework error response can surface as confusing JSON parse errors on the client.

---

### MEDIUM Finding #6: URL parsing errors are swallowed without diagnostics, collapsing diverse failures into `null`

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 13-28  
**Category:** slop

**Description:**
When input looks like a URL / hostname, parsing errors are caught with `catch { return null; }`, discarding the reason for failure. Callers only see a `null` result, which later becomes a generic “Invalid setlist ID or URL” error regardless of whether the URL was malformed, unsupported, or unexpectedly formatted.

**Code:**
```ts
try {
  const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  ...
} catch {
  return null;
}
```

**Why this matters:**
The system loses the ability to distinguish “bad input” from “parser limitation” from “unexpected URL shape,” which reduces clarity for both users and operators when diagnosing failures.

---

### MEDIUM Finding #7: Authorization check swallows all errors and reports “not authorized”

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 140-146  
**Category:** will-break

**Description:**
`isMusicKitAuthorized()` catches all failures from `initMusicKit()` and returns `false`. This conflates (a) the user not being authorized with (b) MusicKit misconfiguration, script load failures, dev-token failures, or runtime issues.

**Code:**
```ts
export async function isMusicKitAuthorized(): Promise<boolean> {
  try {
    const music = await initMusicKit();
    return music.isAuthorized === true;
  } catch {
    return false;
  }
}
```

**Why this matters:**
UI flows that interpret `false` as “user needs to connect” can lead users into loops where the real blocker is a system/config error, not authorization state.

---

### MEDIUM Finding #8: Playlist creation gate can hide underlying system/config errors behind an auth prompt

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 42-48  
**Category:** will-break

**Description:**
The create flow uses `isMusicKitAuthorized()` as a gate. Because that helper returns `false` on *any* error (Finding #7), the UI sets `needsAuth` and exits early without surfacing the underlying error context.

**Code:**
```tsx
const authorized = await isMusicKitAuthorized();
if (!authorized) {
  setNeedsAuth(true);
  setLoading(false);
  return;
}
```

**Why this matters:**
Users can be told to “connect Apple Music” even when the actual failure is “MusicKit script did not load”, “Developer Token API returned non-JSON”, or a missing `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`.

---

### MEDIUM Finding #9: MusicKit search failures are silently converted into “no match” / empty results

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 54-77, 100-113  
**Category:** will-break

**Description:**
Both suggestion fetching and manual search catch errors without capturing details or surfacing a user-visible error state. Failures become indistinguishable from legitimate “no results” scenarios.

**Code:**
```tsx
try {
  const tracks = await searchCatalog(query, 1);
  ...
} catch {
  setMatches((prev) => { ... appleTrack: null ... });
}
```

```tsx
try {
  const tracks = await searchCatalog(q, 8);
  setSearchResults(tracks);
} catch {
  setSearchResults([]);
}
```

**Why this matters:**
Users cannot tell whether a track truly has no match, whether they are unauthorized, whether rate limiting/network issues occurred, or whether MusicKit failed to initialize.

---

### MEDIUM Finding #10: Setlist import parses JSON unconditionally; non-JSON responses can surface as low-level parse errors to users

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 47-69  
**Category:** will-break

**Description:**
The import flow calls `await res.json()` without guarding for non-JSON bodies (e.g., framework-generated HTML error pages, upstream proxy failures, misconfigured deployments). JSON parse errors fall into the generic `catch` path and are surfaced via `err.message` to the user.

It also displays API-provided error strings directly (`data.error`) when present.

**Code:**
```tsx
const res = await fetch(url, { signal });
const data = (await res.json()) as { error?: string } | SetlistFmResponse;

...
setError(err instanceof Error ? err.message : String(err ?? "Network error"));
```

**Why this matters:**
Users can receive confusing technical messages (e.g., JSON parse errors) that do not describe what went wrong at a product level, and failures caused by earlier uncaught exceptions can be masked by secondary parsing errors.

---

### LOW Finding #11: Friendly-error classification relies on case-sensitive substring checks of error messages

**File:** `apps/web/src/features/matching/ConnectAppleMusic.tsx`  
**Lines:** 28-37  
**Category:** slop

**Description:**
The component builds “friendly” messages by checking whether `message.includes("cancel")`, `"denied"`, `"revoked"`, `"unauthorized"`. These checks are case-sensitive and depend on the exact wording of upstream error messages.

**Code:**
```tsx
const friendly =
  message.includes("cancel") || message.includes("denied")
    ? "You cancelled or denied access. Click below to try again."
    : message.includes("revoked") || message.includes("unauthorized")
      ? "Apple Music access was revoked. Click below to connect again."
      : message;
```

**Why this matters:**
Small changes in upstream error wording/casing can cause misclassification and inconsistent UX, with raw technical messages leaking through unpredictably.

---

### MEDIUM Finding #12: Route-level error UI logs full error object and renders raw `error.message` to users

**File:** `apps/web/src/app/error.tsx`  
**Lines:** 12-23  
**Category:** slop

**Description:**
The error boundary logs the full error object via `console.error(error)` and renders `error.message` directly in the UI. If thrown errors contain technical details (including upstream API “detail” strings, configuration variable names, or internal messages), those details are user-visible.

**Code:**
```tsx
useEffect(() => {
  console.error(error);
}, [error]);

const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

...
{message || "An error occurred. You can try again."}
```

**Why this matters:**
This increases the chance of surfacing internal/technical error strings to end users and can expose stack traces/details in the browser console during failure scenarios.

---

### MEDIUM Finding #13: Global error UI renders raw `error.message` for root failures with no local diagnostic signal

**File:** `apps/web/src/app/global-error.tsx`  
**Lines:** 10-19  
**Category:** slop

**Description:**
The global error boundary renders `error.message` directly, similar to `error.tsx`, but does not emit any log signal here. Because `global-error.tsx` is used when root-level rendering fails, it can surface low-level messages in a high-visibility context.

**Code:**
```tsx
const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

...
{message || "An unexpected error occurred. You can try again."}
```

**Why this matters:**
Root-level issues (script load failures, configuration problems, unexpected runtime exceptions) can become user-facing as raw technical strings without any obvious correlation point from this component.

---

### LOW Finding #14: `waitForMusicKit()` leaves a timeout active after resolving, later calling `reject()` after resolve

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 73-93  
**Category:** slop

**Description:**
When `window.MusicKit` becomes available, the interval is cleared and the promise is resolved, but the `setTimeout()` is not cleared. After 10 seconds it still runs and calls `reject(...)` even though the promise is already resolved (no effect on the settled promise, but the timer still fires).

**Code:**
```ts
const check = setInterval(() => { ... resolve(window.MusicKit); }, 50);
setTimeout(() => {
  clearInterval(check);
  reject(new Error("MusicKit script did not load"));
}, 10000);
```

**Why this matters:**
This is a latent “extra work after success” pattern that can complicate debugging and profiling during repeated init calls and can create misleading signals when reasoning about asynchronous behavior.

---

### MEDIUM Finding #15: Upstream API “detail” strings are embedded into thrown errors that flow to the UI

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 187-194, 229-235, 262-273  
**Category:** will-break

**Description:**
Multiple MusicKit operations convert upstream `errors[].detail` / `status` fields into thrown `Error` messages. These thrown messages are then displayed directly in the UI by calling components (e.g., `ConnectAppleMusic`, `CreatePlaylistView`) without normalization beyond basic string formatting.

**Code:**
```ts
const detail = data.errors.map((e) => e.detail ?? e.status ?? "Unknown").join("; ");
throw new Error(`Catalog search failed: ${detail}`);
```

```ts
const detail = res.errors.map((e) => e.detail ?? e.status ?? "Unknown").join("; ");
throw new Error(`Failed to create playlist: ${detail}`);
```

```ts
const detail = res.errors.map((e) => e.detail ?? e.status ?? "Unknown").join("; ");
throw new Error(`Adding tracks to playlist failed: ${detail}`);
```

**Why this matters:**
Users can be presented with verbose or technical upstream error text. It also makes user-facing messaging dependent on the shape and wording of external API error details, which can change and may not be actionable for end users.