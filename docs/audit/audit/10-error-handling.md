# Error Handling Deep Audit Findings

Audit Date: 2026-02-15  
Files Examined: 41  
Total Findings: 16  

## Summary by Severity
- Critical: 0
- High: 3
- Medium: 10
- Low: 3

---

## Findings

### [MEDIUM] Finding #1: Segment error boundary renders raw `error.message` to users (potential internal detail exposure)

**File:** `apps/web/src/app/error.tsx`  
**Lines:** 16-23  
**Category:** will-break  

**Description:**
The segment-level error boundary displays `error.message` directly in the UI. Many errors in this codebase are thrown with technical details (API “detail” strings, configuration/env variable names, upstream proxy messages). Rendering these messages verbatim can expose internal implementation details and produces inconsistent user-facing messaging.

**Code:**
```tsx
const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

<p style={{ color: "#666", marginTop: "0.5rem" }}>
  {message || "An error occurred. You can try again."}
</p>
```

**Why this matters:**
Users can see low-level error text that varies by failure mode and may reveal internal configuration or upstream service responses.

---

### [LOW] Finding #2: Segment error boundary logs full error object to browser console

**File:** `apps/web/src/app/error.tsx`  
**Lines:** 12-14  
**Category:** slop  

**Description:**
The error boundary always `console.error(error)` on the client. If error objects/messages contain sensitive or internal details (including upstream error payload fragments), they are written to the user’s browser console.

**Code:**
```tsx
useEffect(() => {
  console.error(error);
}, [error]);
```

**Why this matters:**
Client console output is user-visible and can unintentionally expose internal diagnostics.

---

### [MEDIUM] Finding #3: Global error page renders raw `error.message` and provides no logging/diagnostic signal

**File:** `apps/web/src/app/global-error.tsx`  
**Lines:** 10-19  
**Category:** will-break  

**Description:**
The global error UI renders `error.message` verbatim and does not log/report the error anywhere. This combines potential internal-detail exposure with loss of diagnostic context when root-level failures happen.

**Code:**
```tsx
const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

<p style={{ color: "#666", marginTop: "0.5rem" }}>
  {message || "An unexpected error occurred. You can try again."}
</p>
```

**Why this matters:**
Root-level crashes can be hard to diagnose while still showing technical/internal text to end users.

---

### [MEDIUM] Finding #4: Developer-token fetch path does not handle network-level fetch rejections; errors can surface as raw thrown messages

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 53-66  
**Category:** will-break  

**Description:**
`fetchDeveloperToken()` does not guard the `fetch()` call itself. Network failures reject the promise and bypass the “invalid JSON” handling, producing raw thrown errors that bubble to callers. Additionally, it throws `data.error` directly, which is controlled by the server response shape and may contain internal/technical strings.

**Code:**
```ts
const res = await fetch(devTokenUrl());
let data: { token?: string; error?: string };
try {
  data = (await res.json()) as { token?: string; error?: string };
} catch {
  throw new Error("Invalid response from Developer Token API (non-JSON).");
}
if (!res.ok || data.error || !data.token) {
  throw new Error(data.error ?? "Failed to get Developer Token");
}
```

**Why this matters:**
Failures can present as inconsistent, low-level errors depending on whether the failure is network vs. non-OK HTTP vs. invalid JSON, and the thrown strings can propagate into user-facing surfaces.

---

### [MEDIUM] Finding #5: `isMusicKitAuthorized()` swallows all errors and returns `false`, conflating auth state with config/network failures

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 140-146  
**Category:** will-break  

**Description:**
`isMusicKitAuthorized()` catches all errors from `initMusicKit()` (including missing app ID, dev-token fetch failures, MusicKit script load failures) and converts them into `false`. Callers cannot distinguish “not authorized” from “MusicKit is broken/misconfigured”.

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
Downstream UI/flows can take incorrect recovery actions (treating hard failures as simple “needs auth”), obscuring the real cause.

---

### [LOW] Finding #6: `waitForMusicKit()` leaves timeout pending after resolve (unnecessary timer; late reject attempt)

**File:** `apps/web/src/lib/musickit.ts`  
**Lines:** 83-93  
**Category:** slop  

**Description:**
`waitForMusicKit()` sets an interval and a timeout, but only clears the interval when `window.MusicKit` becomes available. The timeout is never cleared on success; it fires later and calls `reject(...)` after resolve (ignored by Promise semantics, but still executes).

**Code:**
```ts
const check = setInterval(() => {
  if (window.MusicKit) {
    clearInterval(check);
    resolve(window.MusicKit);
  }
}, 50);
setTimeout(() => {
  clearInterval(check);
  reject(new Error("MusicKit script did not load"));
}, 10000);
```

**Why this matters:**
Creates avoidable timers and adds noisy, misleading control flow (timeout path runs even after successful resolve).

---

### [HIGH] Finding #7: Matching auto-suggestions swallow MusicKit/search errors, producing silent “No match” outcomes

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 54-79  
**Category:** will-break  

**Description:**
The suggestion loop catches all failures from `searchCatalog()` and silently sets `appleTrack: null`. This masks major failures (not authorized, dev-token fetch failure, MusicKit script not loaded, Apple API error responses) as if there were simply no catalog matches.

**Code:**
```tsx
try {
  const tracks = await searchCatalog(query, 1);
  ...
  if (next[i]) next[i] = { ...next[i], appleTrack: track };
} catch {
  if (cancelled) return;
  setMatches((prev) => {
    const next = [...prev];
    if (next[i]) next[i] = { ...next[i], appleTrack: null };
    return next;
  });
}
```

**Why this matters:**
Users receive no signal that matching failed due to system/auth/config issues, and the UI can look “successful” while silently failing.

---

### [HIGH] Finding #8: Manual search swallows MusicKit/search errors and shows empty results with no error UI

**File:** `apps/web/src/features/matching/MatchingView.tsx`  
**Lines:** 100-113  
**Category:** will-break  

**Description:**
Manual search catches all `searchCatalog()` errors and replaces results with an empty list, with no error state or messaging. This makes failures indistinguishable from valid “no results”.

**Code:**
```tsx
try {
  const tracks = await searchCatalog(q, 8);
  setSearchResults(tracks);
} catch {
  setSearchResults([]);
} finally {
  setSearching(false);
}
```

**Why this matters:**
Users have no actionable understanding of whether Apple Music search failed vs. legitimately found nothing.

---

### [MEDIUM] Finding #9: Setlist import surfaces backend/upstream error strings directly to users (inconsistent and potentially internal)

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 62-77  
**Category:** will-break  

**Description:**
The import flow displays server-provided `{ error }` verbatim (`setError(message)`), and also displays thrown `err.message` verbatim for other failures (including mapping errors). Since the proxy may forward upstream setlist.fm error text, users can see internal/opaque upstream messages and technical mapping/config errors.

**Code:**
```tsx
if (!res.ok || "error" in data) {
  const message = (data as { error?: string }).error ?? `Request failed (${res.status})`;
  setError(message);
  ...
  return;
}

...

} catch (err) {
  ...
  setError(err instanceof Error ? err.message : String(err ?? "Network error"));
  setSetlist(null);
}
```

**Why this matters:**
User-visible errors vary widely in phrasing/detail and can reflect upstream/internal messages rather than consistent UX-level errors.

---

### [LOW] Finding #10: Connect flow’s “friendly” error mapping is brittle; raw internal messages can leak through unchanged

**File:** `apps/web/src/features/matching/ConnectAppleMusic.tsx`  
**Lines:** 29-37  
**Category:** slop  

**Description:**
The “friendly” messaging depends on case-sensitive substring checks against an arbitrary error message string. Errors that don’t match these exact substrings pass through as raw messages.

**Code:**
```tsx
const friendly =
  message.includes("cancel") || message.includes("denied")
    ? "You cancelled or denied access. Click below to try again."
    : message.includes("revoked") || message.includes("unauthorized")
      ? "Apple Music access was revoked. Click below to connect again."
      : message;
setError(friendly);
```

**Why this matters:**
Produces inconsistent user messaging and can surface technical/internal strings for common failure modes that don’t match these heuristics.

---

### [MEDIUM] Finding #11: Create-playlist flow interprets “any MusicKit init error” as “needs auth”, delaying/obscuring real failures

**File:** `apps/web/src/features/playlist-export/CreatePlaylistView.tsx`  
**Lines:** 42-48  
**Category:** will-break  

**Description:**
This flow relies on `isMusicKitAuthorized()`. Because `isMusicKitAuthorized()` converts all initialization failures into `false`, this component will prompt for authorization even when the underlying failure is configuration/script/token/network-related.

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
The UI can guide users into an authorization loop rather than reflecting the actual failure mode.

---

### [HIGH] Finding #12: setlist.fm fetch path does not catch network-level `fetch()` failures; structured error return can be bypassed

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 92-97  
**Category:** will-break  

**Description:**
`fetchSetlistFromApi()` calls `fetch()` without a surrounding try/catch. Network failures (DNS, connection errors, timeouts surfaced as rejected promises) will throw and skip returning a `FetchSetlistResult`, causing unexpected exceptions upstream.

**Code:**
```ts
for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
  const res = await fetch(url, { headers });
  lastStatus = res.status;
  ...
}
```

**Why this matters:**
Callers expecting `{ ok: false, status, message }` can instead receive an unhandled exception, leading to generic 500s and loss of intended error semantics.

---

### [MEDIUM] Finding #13: Upstream error bodies are propagated (as text) into client-visible error messages

**File:** `apps/api/src/lib/setlistfm.ts`  
**Lines:** 111-117, 135-139  
**Category:** will-break  

**Description:**
For non-OK responses, the code reads `res.text()` and uses it (or parsed JSON `message`) as `lastMessage`, which is returned to higher layers. This can include HTML or opaque upstream/internal text. While later layers truncate, the content can still be user-visible and inconsistent.

**Code:**
```ts
const text = await res.text();
try {
  const json = JSON.parse(text) as { message?: string };
  lastMessage = json.message ?? (text || res.statusText);
} catch {
  lastMessage = text || res.statusText;
}

...

return {
  ok: false,
  status: lastStatus,
  message: lastMessage || `setlist.fm returned ${lastStatus}`,
};
```

**Why this matters:**
User-facing error strings can become upstream response fragments rather than stable, user-appropriate messages.

---

### [HIGH] Finding #14: Proxy handler does not guard against library throws; unexpected rejections can propagate to API layer

**File:** `apps/api/src/routes/setlist/proxy.ts`  
**Lines:** 30-31  
**Category:** will-break  

**Description:**
`handleSetlistProxy()` awaits `fetchSetlistFromApi()` without try/catch. If `fetchSetlistFromApi()` throws (e.g., network-level fetch rejection), this function can throw instead of returning the declared `ProxyResponse` union.

**Code:**
```ts
const result = await fetchSetlistFromApi(setlistId, apiKey);
```

**Why this matters:**
Breaks the function’s “always returns { body/status } or { error/status }” contract under real-world network failure conditions.

---

### [MEDIUM] Finding #15: Dev-token minting swallows signing failures and returns a generic error with no local diagnostic output

**File:** `apps/api/src/routes/apple/dev-token.ts`  
**Lines:** 20-29  
**Category:** will-break  

**Description:**
If JWT signing fails, the error is fully swallowed and replaced with a generic message. This function itself does not emit any diagnostic info, so failures may be opaque depending on the runtime’s error logging.

**Code:**
```ts
try {
  const token = await signDeveloperToken({ teamId, keyId, privateKeyPem: privateKey });
  return { token };
} catch {
  return { error: "Token signing failed. Check server configuration and logs." };
}
```

**Why this matters:**
Operational failures can become difficult to triage while still preventing core functionality (MusicKit authorization).

---

### [MEDIUM] Finding #16: Next.js API routes use bare catch-all handling with generic 500s; dev-token error responses also drop no-store headers

**File:** `apps/web/src/app/api/apple/dev-token/route.ts`  
**Lines:** 10-23  
**Category:** will-break  

**Description:**
The route wraps the call in a bare `catch {}` and returns a generic 500 error body with no diagnostics. Additionally, the success path sets `Cache-Control: no-store` and `Pragma: no-cache`, but the catch path omits them—creating inconsistent caching behavior between success and error responses.

**Code:**
```ts
try {
  const result = await handleDevToken();
  const headers = corsHeaders(request) as Record<string, string>;
  headers["Cache-Control"] = "no-store";
  headers["Pragma"] = "no-cache";
  return new Response(JSON.stringify(result), { status, headers });
} catch {
  const headers = corsHeaders(request) as Record<string, string>;
  return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
    status: 500,
    headers,
  });
}
```

**Why this matters:**
When failures occur, clients receive minimal information and intermediaries may treat error responses differently than success responses due to missing cache controls.