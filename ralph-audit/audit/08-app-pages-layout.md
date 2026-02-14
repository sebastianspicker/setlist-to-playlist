# App Pages & Layout Deep Audit Findings

Audit Date: 2026-02-14  
Files Examined: 5  
Total Findings: 8

## Summary by Severity
- Critical: 0
- High: 2
- Medium: 4
- Low: 2

---

## Findings

### HIGH Finding #1: Root error boundary shows raw `error.message` (user-visible internal details)

**File:** `apps/web/src/app/error.tsx`  
**Lines:** 16-23  
**Category:** will-break

**Description:**
The root segment error UI derives `message` from `error.message` and renders it directly. While this is helpful in development, it makes the production UX dependent on the exact text of thrown errors. Any internal error message content (API responses, implementation details, environment/config hints, stack-adjacent messaging, etc.) becomes user-visible.

**Code:**
```typescript
const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

<p style={{ color: "#666", marginTop: "0.5rem" }}>
  {message || "An error occurred. You can try again."}
</p>
```

**Why this matters:**
User-visible internal error strings can leak debugging details and can confuse users with non-actionable text.

---

### MEDIUM Finding #2: Root error boundary logs the full error object to the browser console

**File:** `apps/web/src/app/error.tsx`  
**Lines:** 12-14  
**Category:** will-break

**Description:**
The error boundary unconditionally logs the full error object via `console.error`. In client-rendered contexts, this can expose stack traces and error details to end users in DevTools and increases the chance of accidentally surfacing sensitive operational details during incident scenarios.

**Code:**
```typescript
useEffect(() => {
  console.error(error);
}, [error]);
```

**Why this matters:**
Console logs are a common leakage channel for internal details and are noisy in production debugging (especially when errors are triggered repeatedly).

---

### HIGH Finding #3: Global error boundary shows raw `error.message` (user-visible internal details)

**File:** `apps/web/src/app/global-error.tsx`  
**Lines:** 10-19  
**Category:** will-break

**Description:**
Like `error.tsx`, the global error UI renders `error.message` directly. Since `global-error.tsx` is the catch-all boundary that replaces the root layout when active, this increases the likelihood that low-level root failures (including config/env-related failures) present internal messaging to users.

**Code:**
```typescript
const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

<p style={{ color: "#666", marginTop: "0.5rem" }}>
  {message || "An unexpected error occurred. You can try again."}
</p>
```

**Why this matters:**
Global errors are often the most sensitive/least user-actionable failures; exposing raw messages is a high-risk UX and information-disclosure pattern.

---

### MEDIUM Finding #4: `global-error.tsx` does not include global dependencies (styles/head/title) even though it replaces the root layout

**File:** `apps/web/src/app/global-error.tsx`  
**Lines:** 13-35  
**Category:** will-break

**Description:**
`global-error.tsx` returns `<html>`/`<body>` (required), but does not include a `<head>` section, `<title>`, or any imported global CSS that the normal app layout relies on (`apps/web/src/app/layout.tsx` imports global styles and injects `<meta name="theme-color">` and the MusicKit `<Script>`). Next.js explicitly notes that global error UI must define its own global styles/fonts/dependencies because it replaces the root layout when active, and that metadata exports are not supported for global error boundaries (use a `<title>` element instead).

**Code:**
```typescript
return (
  <html lang="en">
    <body>
      <main style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
        <h1>Something went wrong</h1>
        ...
      </main>
    </body>
  </html>
);
```

**Why this matters:**
When the global error boundary is shown, the page can lose expected global styling/branding and document metadata (title/theme color), making the failure mode look broken/untrusted and harder for users to understand.

---

### MEDIUM Finding #5: Root layout hard-depends on a third-party CDN script with no failure handling

**File:** `apps/web/src/app/layout.tsx`  
**Lines:** 22-27  
**Category:** will-break

**Description:**
The app injects Apple MusicKit JS from Apple’s CDN using `strategy="beforeInteractive"`. There is no visible handling for script load failure or degraded behavior at the layout level (no onError, no fallback UI, no “script unavailable” state). If the CDN is blocked/unreachable, any downstream code depending on MusicKit availability can fail in ways that may cascade into the error boundaries.

**Code:**
```typescript
<Script
  src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"
  strategy="beforeInteractive"
  crossOrigin="anonymous"
/>
```

**Why this matters:**
This creates a single point of failure outside your infrastructure and increases the chance of “blank/failed app” experiences in restrictive networks.

---

### MEDIUM Finding #6: Home page describes a 4-step flow but only wires a single feature component at the route level

**File:** `apps/web/src/app/page.tsx`  
**Lines:** 12-28  
**Category:** unfinished

**Description:**
The root page presents an ordered list implying distinct stages (“Import”, “Preview”, “Matching”, “Export”), but the route-level wiring only renders `SetlistImportView` with no explicit page-level composition for preview/matching/export. This makes the “flow wiring” correctness entirely implicit and dependent on what `SetlistImportView` does internally, and the page text can drift from actual behavior without any route-level structure enforcing the stages.

**Code:**
```typescript
<ol style={{ marginTop: "1.5rem", paddingLeft: "1.5rem" }}>
  <li><strong>Import</strong> – Enter setlist.fm URL or ID</li>
  <li><strong>Preview</strong> – See artist, venue, date, and track list</li>
  <li><strong>Matching</strong> – Confirm or correct Apple Music track matches</li>
  <li><strong>Export</strong> – Create the playlist in Apple Music</li>
</ol>
<SetlistImportView />
```

**Why this matters:**
If the internal feature orchestration changes or is incomplete, users may have no clear way to complete the intended import → match → export journey.

---

### LOW Finding #7: Theme color is inconsistent between HTML meta and the PWA manifest

**File:** `apps/web/src/app/layout.tsx`  
**Lines:** 18-20  
**Category:** slop

**Description:**
The root layout sets `theme-color` to `#1a1a1a`, but the referenced manifest defines `theme_color` as `#000000` (and `background_color` as `#ffffff`). This mismatch can lead to inconsistent browser UI tinting (tab/address bar) vs installed-PWA theming.

**Code:**
```typescript
<head>
  <meta name="theme-color" content="#1a1a1a" />
</head>
```

**File:** `apps/web/public/manifest.webmanifest`  
**Lines:** 6-9  
**Category:** slop

**Code:**
```json
"display": "standalone",
"background_color": "#ffffff",
"theme_color": "#000000",
"icons": [
```

**Why this matters:**
Inconsistent theme colors create subtle but noticeable polish issues and can contribute to perceived “flash” or mismatched UI chrome across contexts.

---

### LOW Finding #8: Error UIs are duplicated with minor divergences (drift risk)

**File:** `apps/web/src/app/error.tsx`  
**Lines:** 18-37  
**Category:** slop

**Description:**
`error.tsx` and `global-error.tsx` implement nearly the same UI (heading, message paragraph, “Try again” button) with slight style differences (e.g., `global-error.tsx` sets `fontFamily` inline; `error.tsx` does not). This duplication increases the chance of inconsistent user experience and future drift.

**Code:**
```typescript
<main style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto" }}>
  <h1>Something went wrong</h1>
  ...
  <button type="button" onClick={reset}>Try again</button>
</main>
```

**Why this matters:**
Duplicated error UI tends to diverge over time, especially as branding, accessibility, and messaging evolve.

---

## External References

- Next.js Docs — “Routing: Error Handling” (global-error replaces root layout; must define `<html>`/`<body>`): https://nextjs.org/docs/13/app/building-your-application/routing/error-handling (accessed 2026-02-14)
- Next.js Docs — “File-system conventions: `error.js` / `global-error`” (global error UI must include global styles/dependencies; metadata not supported; use `<title>`): https://nextjs.org/docs/app/api-reference/file-conventions/error (accessed 2026-02-14)