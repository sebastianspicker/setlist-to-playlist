# Setlist Import UI Deep Audit Findings

Audit Date: 2026-02-15  
Files Examined: 5  
Total Findings: 16

## Summary by Severity
- Critical: 0
- High: 2
- Medium: 7
- Low: 7

---

## Findings

### HIGH Finding #1: Input validation returns early without aborting/invalidating in-flight request (stale response can overwrite UI)

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 34-46  
**Category:** broken-logic

**Description:**
`loadSetlist()` validates `MAX_INPUT_LENGTH` and returns **before**:
- aborting any prior request (`abortControllerRef.current?.abort()`),
- updating `currentRequestRef.current` to the new input.

If a prior fetch is already in flight, submitting an over-long input does not cancel it and does not mark it stale. When the older request resolves, it still matches `currentRequestRef.current` and can update `setlist`, `step`, and `loading`, overriding the user’s current error state.

**Code:**
```tsx
async function loadSetlist(trimmed: string) {
  setError(null);
  if (trimmed.length > MAX_INPUT_LENGTH) {
    setError("Input is too long. Please paste the setlist ID only ...");
    return;
  }
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();
  const signal = abortControllerRef.current.signal;
  currentRequestRef.current = trimmed;
  setLoading(true);
  // ...
}
```

**Why this matters:**
This is a real race condition: user submits a new (invalid) input, sees an error, then an older request can “win” and unexpectedly replace the UI with a different setlist/step.

---

### HIGH Finding #2: `"error" in data` can throw TypeError for non-object JSON, producing cryptic user-facing errors

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 50-67, 73-77  
**Category:** will-break

**Description:**
After `res.json()` succeeds, `data` is assumed to be an object. The code then evaluates `"error" in data`. If the server returns valid JSON that’s not an object (e.g. `null`, a string, an array), the `in` operator throws a `TypeError`. That exception is caught by the outer `catch`, which displays the raw error message to the user.

**Code:**
```tsx
data = (await res.json()) as { error?: string } | SetlistFmResponse;

if (!res.ok || "error" in data) {
  const message =
    (data as { error?: string }).error ?? `Request failed (${res.status})`;
  setError(message);
  setSetlist(null);
  return;
}
```

**Why this matters:**
A backend/proxy returning unexpected-but-valid JSON can crash the happy-path check and degrade into a confusing UI error (and potentially inconsistent loading state).

---

### MEDIUM Finding #3: URL-length guard is based on raw input length; encoded query can still exceed practical limits, and input field allows unbounded paste

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 31-33, 36-40, 48-49, 142-159  
**Category:** will-break

**Description:**
The 2000-character limit is checked against the **raw** trimmed input, but the request puts the value into a **query string** after `encodeURIComponent()`. Encoding expands characters like `:` `/` `?` `&` into `%xx`, potentially multiplying length. A URL that is under 2000 raw characters can still produce a much longer request URL once encoded and combined with base path.

Also, the `<input>` has no `maxLength`, so users can paste extremely large strings into the field; the app only rejects them at submit time.

**Code:**
```tsx
const MAX_INPUT_LENGTH = 2000;

if (trimmed.length > MAX_INPUT_LENGTH) {
  setError("Input is too long. Please paste the setlist ID only ...");
  return;
}

const url = setlistProxyUrl(`id=${encodeURIComponent(trimmed)}`);
const res = await fetch(url, { signal });
```

**Why this matters:**
This can still hit “URI Too Long” style failures, intermediary/proxy limits, or logs capturing large URLs—even when the UI believes it’s within bounds.

---

### MEDIUM Finding #4: No format validation (URL vs ID); empty submit is silently ignored (no feedback)

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 86-90, 134-136  
**Category:** will-break

**Description:**
The UI copy says “Enter a setlist.fm URL or setlist ID”, but there is no validation that the input:
- looks like a setlist.fm URL,
- looks like a setlist ID (length/charset),
- is even plausibly related to setlist import.

Additionally, if the user submits an empty/whitespace-only value, `handleSubmit()` does nothing (no error message, no guidance), which can be confusing when combined with persisted error state.

**Code:**
```tsx
function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const trimmed = inputValue.trim();
  if (trimmed) loadSetlist(trimmed);
}
```

**Why this matters:**
Invalid inputs fall through to backend behavior and backend error messaging, which reduces clarity and can produce inconsistent UX depending on server-side parsing/error handling.

---

### MEDIUM Finding #5: Query parameter name `id` conflicts with UI that accepts “URL or ID” (contract ambiguity)

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 48-49, 134-136  
**Category:** will-break

**Description:**
The UI invites either a URL or an ID, but the request always sends the value under the query key `id`. This creates ambiguity:
- If the backend interprets `id` strictly as a setlist ID, URLs may fail unexpectedly.
- If the backend accepts URLs here, the parameter name becomes misleading and increases the chance of future contract drift.

**Code:**
```tsx
// UI: "Enter a setlist.fm URL or setlist ID ..."
const url = setlistProxyUrl(`id=${encodeURIComponent(trimmed)}`);
```

**Why this matters:**
Small client/server mismatches around query parameter naming are a common source of “works in dev, breaks in prod” regressions when either side evolves independently.

---

### MEDIUM Finding #6: Error state persists while editing; `aria-invalid` stays true until next submit

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 23, 35, 145-151  
**Category:** will-break

**Description:**
`error` is only cleared when `loadSetlist()` starts (`setError(null)`). Editing the input does not clear the error. This means:
- the input remains `aria-invalid={true}` while the user is typing a correction,
- `aria-describedby` continues to point to the error content even when it may no longer apply.

**Code:**
```tsx
const [error, setError] = useState<string | null>(null);

<input
  // ...
  onChange={(e) => setInputValue(e.target.value)}
  aria-invalid={!!error}
  aria-describedby={error ? "setlist-error" : undefined}
/>
```

**Why this matters:**
This can confuse users (especially assistive tech users) because the field stays in an “invalid” state even as they correct the value.

---

### MEDIUM Finding #7: Old setlist preview remains visible while loading a new request (stale preview can mislead)

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 34-47, 175-179, 209-226  
**Category:** will-break

**Description:**
Starting a new `loadSetlist()` call does not clear `setlist` or reset `step`. If the user is already in the preview step and submits another value:
- `loading` becomes true,
- the previous preview remains rendered (because `setlist` is still non-null and `step === "preview"`).

**Code:**
```tsx
setLoading(true);
// setSetlist(...) is only changed on success/error later

{loading && <p role="status">Loading setlist…</p>}

{setlist && step === "preview" && (
  <>
    <SetlistPreview setlist={setlist} />
    <button type="button" onClick={goToMatching}>Continue to Matching →</button>
  </>
)}
```

**Why this matters:**
Users can be shown a loading indicator for a new input while still seeing (and potentially proceeding with) the previous setlist’s preview.

---

### MEDIUM Finding #8: No unmount cleanup for in-flight fetch; potential setState-after-unmount behavior

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 28-30, 42-44, 73-83  
**Category:** will-break

**Description:**
The component uses an `AbortController` ref and a “current request” ref, but there is no cleanup tied to component unmount. If the component unmounts while a fetch is in-flight, the request can complete and attempt to call `setError`, `setSetlist`, `setStep`, and `setLoading`.

**Code:**
```tsx
const abortControllerRef = useRef<AbortController | null>(null);

abortControllerRef.current = new AbortController();
const signal = abortControllerRef.current.signal;

const res = await fetch(url, { signal });
// ... later: setError / setSetlist / setStep / setLoading
```

**Why this matters:**
Unmount-time behavior can become noisy in development and unpredictable in navigation flows, and it undermines the “ignore stale responses” intent.

---

### MEDIUM Finding #9: User-facing errors directly surface raw server/error strings (unclear messaging; potential internal detail leakage)

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 62-66, 73-77, 181-195  
**Category:** will-break

**Description:**
Errors shown to users are pulled from:
- backend-provided `data.error` (untrusted string),
- raw `err.message` / stringified error values.

These messages may be technical (e.g. network stack errors, TypeErrors) and can inadvertently expose internal wording that isn’t meant for end users.

**Code:**
```tsx
const message = (data as { error?: string }).error ?? `Request failed (${res.status})`;
setError(message);

setError(err instanceof Error ? err.message : String(err ?? "Network error"));

<p style={{ margin: 0 }}>{error}</p>
```

**Why this matters:**
This reduces clarity (“what do I do now?”) and increases the chance of leaking implementation details through UI text.

---

### LOW Finding #10: Length-validation path can show `error` while `loading` remains true from a previous request

**File:** `apps/web/src/features/setlist-import/SetlistImportView.tsx`  
**Lines:** 35-41, 175-179, 181-207  
**Category:** broken-logic

**Description:**
Because the over-length early return does not manage `loading` (and does not abort/replace the current request), the UI can display:
- a loading status (from an earlier request),
- an immediate validation error (for the newly submitted too-long input),
at the same time.

**Code:**
```tsx
if (trimmed.length > MAX_INPUT_LENGTH) {
  setError("Input is too long ...");
  return;
}

{loading && <p role="status">Loading setlist…</p>}
{error && <div role="alert">...</div>}
```

**Why this matters:**
Mixed signals (“loading” + “input too long”) make the UI feel inconsistent and can cause users to retry unnecessarily.

---

### LOW Finding #11: Preview flattener inserts empty track names; blank `<li>` entries are rendered

**File:** `apps/web/src/features/setlist-import/SetlistPreview.tsx`  
**Lines:** 8-16, 51-57  
**Category:** will-break

**Description:**
`getAllTracks()` pushes `{ name: entry?.name ?? "" }`. If `entry` is nullish or lacks a `name`, the preview will render an empty list item.

**Code:**
```tsx
for (const entry of set) {
  tracks.push({ name: entry?.name ?? "", info: entry?.info });
}

<li key={i}>
  {t.name}
  {t.info ? <span> — {t.info}</span> : null}
</li>
```

**Why this matters:**
Blank track rows degrade the preview and can mislead users about the actual track count.

---

### LOW Finding #12: Preview list uses array index keys (stable ordering assumptions; potential UI mismatch if list changes)

**File:** `apps/web/src/features/setlist-import/SetlistPreview.tsx`  
**Lines:** 51-53  
**Category:** slop

**Description:**
The `<li>` uses `key={i}`. While this avoids duplicate key collisions when names repeat, it also ties identity to position. Any future filtering/reordering (or conditional insertion) can cause React to reuse DOM nodes incorrectly.

**Code:**
```tsx
{tracks.map((t, i) => (
  <li key={i}>...</li>
))}
```

**Why this matters:**
Index keys are a frequent source of subtle UI bugs when lists evolve beyond strictly static rendering.

---

### LOW Finding #13: Preview has no explicit empty-state messaging for 0 tracks

**File:** `apps/web/src/features/setlist-import/SetlistPreview.tsx`  
**Lines:** 41-59  
**Category:** will-break

**Description:**
When `tracks.length === 0`, the UI still renders a “Tracks (0)” header and an empty ordered list, with no explanation or guidance.

**Code:**
```tsx
<h3>Tracks ({tracks.length})</h3>
<ol>
  {tracks.map(...)}
</ol>
```

**Why this matters:**
A “0 tracks” preview is an important state (bad parse, empty response, mapping issue) that currently looks like a blank UI rather than an actionable result.

---

### LOW Finding #14: Feature index re-export appears unused and import style is inconsistent within the feature

**File:** `apps/web/src/features/setlist-import/index.ts`  
**Lines:** 1-2  
**Category:** dead-end

**Description:**
`index.ts` re-exports `SetlistPreview`, but `SetlistImportView` imports `SetlistPreview` directly via `./SetlistPreview` (see `SetlistImportView.tsx` line 11). Repo search shows no other imports of `SetlistPreview` via the feature index, so the re-export currently looks like unused surface area.

**Code:**
```ts
export { SetlistImportView } from "./SetlistImportView";
export { SetlistPreview } from "./SetlistPreview";
```

**Why this matters:**
Unused exports and inconsistent import patterns increase maintenance cost and make it harder to reason about intended public API boundaries for the feature.

---

### LOW Finding #15: `setlistProxyUrl` concatenates raw query strings without normalization (caller-dependent correctness)

**File:** `apps/web/src/lib/api.ts`  
**Lines:** 21-23  
**Category:** will-break

**Description:**
`setlistProxyUrl(query)` appends `?${query}` verbatim. This is safe only if every caller:
- omits a leading `?`,
- properly encodes values,
- avoids malformed `&`/`=` patterns.

The setlist import path currently constructs a query manually, but the helper itself provides no guardrails.

**Code:**
```ts
export const setlistProxyUrl = (query?: string) =>
  apiUrl("/setlist/proxy") + (query ? `?${query}` : "");
```

**Why this matters:**
As the app grows, additional callers can easily produce malformed URLs or double `?` bugs, and these failures can be hard to diagnose from client-side symptoms.

---

### LOW Finding #16: Config values are permissive without validation/normalization consistency (silent misconfig risk)

**File:** `apps/web/src/lib/config.ts`  
**Lines:** 12-16, 18-20  
**Category:** will-break

**Description:**
- `API_BASE_URL` silently becomes `""` when unset/blank; failures then manifest later as same-origin calls with no explicit indication that a configured API base was expected.
- `APPLE_MUSIC_APP_ID` is not trimmed/normalized and defaults to an empty string.

**Code:**
```ts
export const API_BASE_URL: string =
  typeof process.env.NEXT_PUBLIC_API_URL === "string" &&
  process.env.NEXT_PUBLIC_API_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/$/, "")
    : "";

export const APPLE_MUSIC_APP_ID =
  process.env.NEXT_PUBLIC_APPLE_MUSIC_APP_ID ?? "";
```

**Why this matters:**
Misconfiguration becomes a runtime behavior problem (unexpected request targets / failing downstream integrations) rather than a clear, early configuration signal.