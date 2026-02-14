# Setlist Import UI Deep Audit Findings

Audit Date: 2026-02-14  
Files Examined: 5  
Total Findings: 12

## Summary by Severity
- Critical: 0
- High: 3
- Medium: 4
- Low: 5

---

## Findings

### [HIGH] Finding #1: “Ignore stale responses” logic breaks when re-requesting the same input (abort + same `trimmed` value)

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 34-75  
**Category:** broken-logic

**Description:**
The “latest request” guard uses the request payload string (`trimmed`) as the identity token (`currentRequestRef.current = trimmed`). If the user triggers another request with the *same* trimmed value (double-submit, clicking “Try again” while still loading, etc.), the earlier request can be aborted and will hit the `catch` early-return, but its `finally` still runs. Because `currentRequestRef.current === trimmed` is still true (the new request stored the same string), the aborted request’s `finally` clears `loading` and sets `currentRequestRef.current = null`, which can cause the newer in-flight request to be ignored when it returns (`currentRequestRef.current !== trimmed`).

**Code:**
```tsx
currentRequestRef.current = trimmed;
setLoading(true);
try {
  const res = await fetch(url, { signal });
  const data = (await res.json()) as { error?: string } | SetlistFmResponse;

  if (currentRequestRef.current !== trimmed) return;
  // ...
} catch (err) {
  if ((err as { name?: string })?.name === "AbortError") return;
  if (currentRequestRef.current !== trimmed) return;
  // ...
} finally {
  if (currentRequestRef.current === trimmed) {
    setLoading(false);
    currentRequestRef.current = null;
  }
}
```

**Why this matters:**
Users can get stuck in a state where loading stops early, and the successful response of the most recent request is discarded. This directly undermines the component’s stated intent (DCI-042) and can break the import flow under common “double action” behavior.

---

### [HIGH] Finding #2: New fetch does not clear previous preview; “Continue” remains clickable during loading, enabling wrong-step/wrong-setlist transitions

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 34-75, 201-218  
**Category:** will-break

**Description:**
When starting `loadSetlist`, the code sets `loading` but does not clear the currently displayed `setlist` or disable downstream navigation controls. If the user is on the preview step and submits a new input, the old preview remains visible while the new request is in-flight. The “Continue to Matching” button is also still rendered and enabled (it’s not gated by `loading`), allowing the user to proceed using stale data. When the fetch eventually completes, it unconditionally sets `setStep("preview")`, potentially yanking the user back from matching to preview.

**Code:**
```tsx
setLoading(true);
// does NOT clear setlist or step here

const mapped = mapSetlistFmToSetlist(data as SetlistFmResponse);
setSetlist(mapped);
setStep("preview");
```

```tsx
{setlist && step === "preview" && (
  <>
    <SetlistPreview setlist={setlist} />
    <button type="button" onClick={goToMatching}>
      Continue to Matching →
    </button>
  </>
)}
```

**Why this matters:**
This enables mismatched UI state (preview/matching/export not corresponding to the user’s most recent import intent). It can also cause confusing “teleporting” between steps when a late response forces `preview`.

---

### [HIGH] Finding #3: Response handling assumes JSON and an object shape; can throw or produce opaque errors on non-object JSON / non-JSON responses

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 49-69  
**Category:** will-break

**Description:**
The code always calls `res.json()` without checking content-type or guarding empty/non-JSON responses. Additionally, it uses `"error" in data` which assumes `data` is an object (the `in` operator throws on `null`, and can also be problematic on primitives). If the proxy returns non-JSON (HTML error page, plain text) or JSON that isn’t an object, the import flow can fail with confusing messages (e.g., JSON parse errors or `Cannot use 'in' operator...`) rather than a clear user-facing error.

**Code:**
```tsx
const data = (await res.json()) as { error?: string } | SetlistFmResponse;

if (!res.ok || "error" in data) {
  const message =
    (data as { error?: string }).error ?? `Request failed (${res.status})`;
  setError(message);
  setSetlist(null);
  return;
}
```

**Why this matters:**
Network/proxy failures are a primary failure mode for an import flow. Opaque parse/type errors degrade UX and make support/debugging harder.

---

### [MEDIUM] Finding #4: No unmount cleanup for in-flight requests (AbortController exists but is not used for component teardown)

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 28-45  
**Category:** will-break

**Description:**
The component maintains an `AbortController` and aborts when starting a new request, but there is no unmount cleanup to abort an in-flight request when the component unmounts (navigation, hot reload, parent conditional render). A late-resolving request may still attempt to update state in `try/catch/finally`.

**Code:**
```tsx
const abortControllerRef = useRef<AbortController | null>(null);

abortControllerRef.current?.abort();
abortControllerRef.current = new AbortController();
const signal = abortControllerRef.current.signal;
```

**Why this matters:**
This can cause wasted network work and late state updates after unmount (at best no-ops, at worst noisy dev warnings or unexpected UI flicker if remounted).

---

### [MEDIUM] Finding #5: Input validation is largely “non-empty + max length”; no format/domain checks despite UI claiming “URL or ID”

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 78-82, 126-165  
**Category:** will-break

**Description:**
The submit handler only checks `trimmed` is non-empty and below `MAX_INPUT_LENGTH`. There is no validation that an entered “ID” resembles a setlist ID, nor that a URL is plausibly a setlist.fm URL. This pushes avoidable invalid inputs into the network/proxy layer and yields less actionable error messaging.

**Code:**
```tsx
const trimmed = inputValue.trim();
if (trimmed) loadSetlist(trimmed);
```

**Why this matters:**
Users can enter arbitrary strings and get backend/proxy errors that don’t help them correct the input, increasing retries and perceived flakiness.

---

### [MEDIUM] Finding #6: MAX_INPUT_LENGTH check uses raw input length, not actual encoded URL length

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 31-40, 48  
**Category:** will-break

**Description:**
The code checks `trimmed.length` against `MAX_INPUT_LENGTH`, but the request is a GET with a query string that includes `encodeURIComponent(trimmed)`. Encoding can increase the length, meaning an input that passes the check may still produce an overly long URL.

**Code:**
```tsx
const MAX_INPUT_LENGTH = 2000;

const url = setlistProxyUrl(`id=${encodeURIComponent(trimmed)}`);
```

**Why this matters:**
If the goal is to prevent URL-length issues (DCI-010), checking the pre-encoded string may not reliably prevent failures for inputs containing many escapable characters.

---

### [MEDIUM] Finding #7: Error messaging and accessibility signaling are conflated (network/proxy errors mark the input invalid)

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 54-59, 141-143, 173-199  
**Category:** will-break

**Description:**
`aria-invalid={!!error}` flags the input as invalid for all errors, including network/proxy/server failures that are not necessarily “input invalid”. The displayed message is either backend-provided `error` or a generic `Request failed (status)`, without context like “could not reach server” vs “not found” vs “invalid URL”.

**Code:**
```tsx
aria-invalid={!!error}
aria-describedby={error ? "setlist-error" : undefined}
```

```tsx
const message =
  (data as { error?: string }).error ?? `Request failed (${res.status})`;
setError(message);
```

**Why this matters:**
This can confuse users and assistive tech: a transient backend failure is announced as an invalid form field, and the message may not guide recovery.

---

### [LOW] Finding #8: Preview can include blank track rows and misleading track counts

**File:** `apps/web/src/features/setlist-import/SetlistPreview.tsx`  
**Lines:** 8-16, 41-58  
**Category:** will-break

**Description:**
`getAllTracks` pushes entries with `name: entry?.name ?? ""`. If entries are missing names or contain empty strings, the preview will render blank list items and count them in `Tracks ({tracks.length})`, which can look broken.

**Code:**
```tsx
for (const entry of set) {
  tracks.push({ name: entry?.name ?? "", info: entry?.info });
}
```

```tsx
{tracks.map((t, i) => (
  <li key={i}>
    {t.name}
```

**Why this matters:**
A preview step should build confidence before matching/export; blank items reduce trust and can misrepresent how many tracks will be processed.

---

### [LOW] Finding #9: Uses array index as React key in track list

**File:** `apps/web/src/features/setlist-import/SetlistPreview.tsx`  
**Lines:** 51-58  
**Category:** slop

**Description:**
The preview list uses `key={i}`. If the track array changes due to filtering, insertion, or mapping adjustments, React may reuse DOM nodes in ways that momentarily display mismatched track content.

**Code:**
```tsx
{tracks.map((t, i) => (
  <li key={i} style={{ marginBottom: "0.25rem" }}>
```

**Why this matters:**
It’s a common source of subtle UI bugs, and it conflicts with the audit focus on key correctness when names repeat (this avoids duplicates but trades for stability issues).

---

### [LOW] Finding #10: `setlistProxyUrl` takes a raw query string, making callers responsible for correct `?`/encoding behavior

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 22-23  
**Category:** slop

**Description:**
`setlistProxyUrl` concatenates `?${query}` without guarding whether `query` already includes `?` or whether it is properly encoded. The current caller encodes correctly, but the helper is a footgun for future use.

**Code:**
```ts
export const setlistProxyUrl = (query?: string) =>
  apiUrl("/setlist/proxy") + (query ? `?${query}` : "");
```

**Why this matters:**
Small URL builder inconsistencies tend to accumulate and become hard-to-debug request failures.

---

### [LOW] Finding #11: `APPLE_MUSIC_APP_ID` is not trimmed/validated; whitespace values silently pass through

**File:** `apps/web/src/lib/config.ts`  
**Lines:** 18-20  
**Category:** will-break

**Description:**
Unlike `NEXT_PUBLIC_API_URL`, the Apple Music app ID is not trimmed and defaults to `""` with no validation. A misconfigured env value like `"  "` will be treated as a present string but still invalid for downstream usage.

**Code:**
```ts
export const APPLE_MUSIC_APP_ID =
  process.env.NEXT_PUBLIC_APPLE_MUSIC_APP_ID ?? "";
```

**Why this matters:**
Misconfiguration becomes harder to diagnose when invalid values are accepted without normalization.

---

### [LOW] Finding #12: Barrel export includes `SetlistPreview`, but internal usage bypasses the barrel (inconsistent import surface)

**File:** `apps/web/src/features/setlist-import/index.ts`  
**Lines:** 1-2  
**Category:** slop

**Description:**
`index.ts` re-exports `SetlistPreview`, but `SetlistImportView` imports it directly from `./SetlistPreview`. This creates an inconsistent module surface and increases the chance of duplicate import styles or circular dependency issues as the feature grows.

**Code:**
```ts
export { SetlistImportView } from "./SetlistImportView";
export { SetlistPreview } from "./SetlistPreview";
```

**Why this matters:**
Inconsistent import patterns add friction and can produce subtle bundling/refactor issues over time, especially in feature-sliced codebases.