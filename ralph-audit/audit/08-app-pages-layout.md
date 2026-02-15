# App Pages & Layout Findings

Audit Date: 2026-02-15T07:19:27Z  
Files Examined: 4  
Total Findings: 12

## Summary by Severity
- Critical: 0
- High: 2
- Medium: 6
- Low: 4

---

## Findings

### [HIGH] Finding #1: Route error boundary displays raw `error.message` to users (information disclosure)

**File:** `apps/web/src/app/error.tsx`  
**Lines:** 16-23  
**Category:** will-break

**Description:**
The route-level error UI renders `error.message` directly into the page. This can disclose internal implementation details (upstream error strings, internal route names, stack-adjacent messages, misconfiguration hints) to end users.

**Code:**
```tsx
const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

<p style={{ color: "#666", marginTop: "0.5rem" }}>
  {message || "An error occurred. You can try again."}
</p>
```

**Why this matters:**
Error messages often contain internal details not intended for end users; displaying them increases the blast radius of otherwise recoverable failures.

---

### [HIGH] Finding #2: Global error boundary displays raw `error.message` to users (information disclosure)

**File:** `apps/web/src/app/global-error.tsx`  
**Lines:** 10-19  
**Category:** will-break

**Description:**
The global error UI also renders `error.message` directly. Global errors commonly come from root layout / framework-level failures, where messages are more likely to include internal details.

**Code:**
```tsx
const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

<p style={{ color: "#666", marginTop: "0.5rem" }}>
  {message || "An unexpected error occurred. You can try again."}
</p>
```

**Why this matters:**
When the root crashes, users can see sensitive operational detail at the exact moment the app is least controlled.

---

### [MEDIUM] Finding #3: Error-message extraction relies on `instanceof Error`, risking poor/incorrect user output

**File:** `apps/web/src/app/error.tsx`  
**Lines:** 16-16  
**Category:** will-break

**Description:**
The UI assumes `error` is an `Error` instance at runtime and falls back to `String(error)` otherwise. If `error` is not a real `Error` instance (e.g., unusual serialization/transport cases or non-Error throws), `String(error)` can render as `"[object Object]"`, creating an unhelpful and confusing error display.

**Code:**
```tsx
const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
```

**Why this matters:**
In the worst failure modes, the app’s last-resort UI can become uninformative (or misleading), reducing the chance users can recover.

---

### [MEDIUM] Finding #4: Client-side logging of full error object can leak internals in production consoles

**File:** `apps/web/src/app/error.tsx`  
**Lines:** 12-14  
**Category:** will-break

**Description:**
The route error boundary logs the full `error` object to the browser console for every error render. Depending on how errors are created/thrown, this can include stacks, nested causes, or other internal details.

**Code:**
```tsx
useEffect(() => {
  console.error(error);
}, [error]);
```

**Why this matters:**
Browser consoles are user-accessible; logging detailed errors increases inadvertent disclosure and can create noisy diagnostics in real user sessions.

---

### [MEDIUM] Finding #5: Homepage copy promises a 4-step flow, but app-level wiring only renders the import feature

**File:** `apps/web/src/app/page.tsx`  
**Lines:** 12-27  
**Category:** unfinished

**Description:**
The page presents an explicit “Import → Preview → Matching → Export” flow, but at the app-route level it only renders `SetlistImportView`. There is no top-level composition that visibly wires “matching” or “export” into the route. If those steps exist, they’re hidden behind (and coupled to) the import feature; if they don’t, the page copy is misleading.

**Code:**
```tsx
<ol style={{ marginTop: "1.5rem", paddingLeft: "1.5rem" }}>
  <li><strong>Import</strong> – Enter setlist.fm URL or ID</li>
  <li><strong>Preview</strong> – See artist, venue, date, and track list</li>
  <li><strong>Matching</strong> – Confirm or correct Apple Music track matches</li>
  <li><strong>Export</strong> – Create the playlist in Apple Music</li>
</ol>
<SetlistImportView />
```

**Why this matters:**
Mismatch between stated flow and route composition is a common source of user confusion and makes “where does matching/export live?” hard to reason about during maintenance.

---

### [MEDIUM] Finding #6: No route-level loading boundary or explicit loading UI at the app-page/layout layer

**File:** `apps/web/src/app/page.tsx`  
**Lines:** 3-28  
**Category:** will-break

**Description:**
The root route renders a feature component directly with no Suspense boundary or app-page-level loading UI. If the user experience depends on async work (fetching setlists, preparing preview state, initializing MusicKit authorization flows, etc.), the route-level UX can degrade into abrupt content jumps or “nothing happens” periods, depending on how nested components behave.

**Code:**
```tsx
export default function HomePage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto", minWidth: 0 }}>
      ...
      <SetlistImportView />
    </main>
  );
}
```

**Why this matters:**
Without a route-level loading experience, failures and latency tend to present as confusing UI stalls, especially on cold loads or slow networks.

---

### [MEDIUM] Finding #7: Root layout unconditionally loads third-party MusicKit script with `beforeInteractive` (perf/availability risk; potential “layout flash”)

**File:** `apps/web/src/app/layout.tsx`  
**Lines:** 22-27  
**Category:** will-break

**Description:**
The root layout loads MusicKit from Apple’s CDN on every page view and does so using `strategy="beforeInteractive"`. This can increase the critical path (network dependency before interactivity) and makes core UX dependent on third-party script availability even when the current screen may not yet need MusicKit.

**Code:**
```tsx
<Script
  src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"
  strategy="beforeInteractive"
  crossOrigin="anonymous"
/>
```

**Why this matters:**
If the script is slow/blocked/unavailable, the app can feel broken (slow first load, delayed interactivity), and the user may perceive flicker/late initialization effects around MusicKit-dependent UI.

---

### [MEDIUM] Finding #8: Global error UI bypasses root layout head/styles (unstyled/inconsistent crash experience)

**File:** `apps/web/src/app/global-error.tsx`  
**Lines:** 13-34  
**Category:** will-break

**Description:**
The global error component returns its own `<html>`/`<body>` without any `<head>` content and without importing global CSS. This means that on a global crash, users will likely see a different (unstyled or partially styled) experience than the rest of the app, and layout-level metadata (theme-color meta, manifest link generation behavior, etc.) won’t apply consistently during the failure state.

**Code:**
```tsx
return (
  <html lang="en">
    <body>
      <main style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
        ...
      </main>
    </body>
  </html>
);
```

**Why this matters:**
Global failures are already high-friction; inconsistent styling/metadata makes recovery and user trust worse at the exact moment reliability is being tested.

---

### [LOW] Finding #9: Root layout mixes `metadata` API with manual `<head>` markup (risk of drift/duplication)

**File:** `apps/web/src/app/layout.tsx`  
**Lines:** 5-20  
**Category:** slop

**Description:**
The layout uses the `metadata` export (title/description/manifest) but also manually injects `<head>` with a theme-color meta tag. This split increases the risk that head concerns drift over time (e.g., some head tags managed in `metadata`, others manually), and can lead to duplication if theme/viewport metadata is later added via Next’s metadata APIs.

**Code:**
```tsx
export const metadata: Metadata = {
  title: "Setlist to Playlist",
  description: "Import a setlist from setlist.fm and create an Apple Music playlist.",
  manifest: "/manifest.webmanifest",
};

<html lang="en">
  <head>
    <meta name="theme-color" content="#1a1a1a" />
  </head>
```

**Why this matters:**
Head management is a cross-cutting concern; splitting patterns at the root increases maintenance risk and makes regressions more likely.

---

### [LOW] Finding #10: Error boundary types include `digest` but the UI ignores it entirely (reduced diagnosability)

**File:** `apps/web/src/app/error.tsx`  
**Lines:** 9-10  
**Category:** unfinished

**Description:**
The `error` type includes an optional `digest`, but the component neither displays it nor uses it for correlation. This appears to be an unused capability and can make debugging production-only failures harder.

**Code:**
```tsx
error: Error & { digest?: string };
```

**Why this matters:**
When errors are intermittent, having a stable identifier (when available) can be important for triage and support workflows.

---

### [LOW] Finding #11: Extensive inline styling in the root page suggests placeholder/prototype-level presentation

**File:** `apps/web/src/app/page.tsx`  
**Lines:** 5-26  
**Category:** stub

**Description:**
The main page UI is primarily styled via inline style objects (layout sizing, spacing, list indentation). This looks like scaffolding/prototype UI rather than a cohesive layout system, and makes consistent theming and reuse harder.

**Code:**
```tsx
<main style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto", minWidth: 0 }}>
...
<ol style={{ marginTop: "1.5rem", paddingLeft: "1.5rem" }}>
```

**Why this matters:**
Inline styles tend to accrete and diverge across pages, which increases UI inconsistency and makes global changes harder.

---

### [LOW] Finding #12: Minor UI slop in global error reset handler (unnecessary wrapper)

**File:** `apps/web/src/app/global-error.tsx`  
**Lines:** 20-23  
**Category:** slop

**Description:**
The reset handler is wrapped in an arrow function even though `reset` already matches the expected callback signature.

**Code:**
```tsx
<button
  type="button"
  onClick={() => reset()}
>
```

**Why this matters:**
Minor, but it’s a sign of inconsistent patterns and adds small avoidable noise in the most critical fallback UI.