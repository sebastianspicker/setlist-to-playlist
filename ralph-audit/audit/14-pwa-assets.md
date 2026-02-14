# PWA & Static Assets Findings

Audit Date: 2026-02-14T11:48:44Z  
Files Examined: 6  
Total Findings: 8

## Summary by Severity
- Critical: 0
- High: 1
- Medium: 3
- Low: 4

---

## Findings

### [HIGH] Finding #1: Manifest icon `sizes` do not match actual icon dimensions (and icons are extremely large)

**File:** `apps/web/public/manifest.webmanifest`  
**Lines:** 9-21  
**Category:** will-break

**Description:**
The manifest declares two icons with `sizes` `192x192` and `512x512`, but the actual PNGs in `apps/web/public/icons/` are both **2048×2048**. This makes the manifest metadata inaccurate, and user agents may select/validate icons based on the declared `sizes` attribute. Additionally, both icon files are ~4.0MB, which is unusually large for PWA icons and increases bandwidth/cache pressure during install and when revalidated.

**Code:**
```json
// apps/web/public/manifest.webmanifest:9-21
"icons": [
  { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
]
```

```text
# file(1) output
apps/web/public/icons/icon-192.png: PNG image data, 2048 x 2048, 8-bit/color RGB, non-interlaced
apps/web/public/icons/icon-512.png: PNG image data, 2048 x 2048, 8-bit/color RGB, non-interlaced

# du output
4.0M  apps/web/public/icons/icon-192.png
4.0M  apps/web/public/icons/icon-512.png
```

**Why this matters:**
Incorrect icon metadata can lead to wrong icon selection, install-time warnings, or poor rendering across platforms; oversized assets hurt performance and storage, especially on mobile connections and during “Add to Home Screen” flows.

---

### [MEDIUM] Finding #2: Theme/background colors are inconsistent between manifest and document meta

**File:** `apps/web/public/manifest.webmanifest`  
**Lines:** 7-8  
**Category:** slop

**Description:**
The manifest declares `background_color` `#ffffff` and `theme_color` `#000000`, but the document sets `<meta name="theme-color" content="#1a1a1a" />`. This creates inconsistent theming signals between install-time metadata and runtime UI theming.

**Code:**
```json
// apps/web/public/manifest.webmanifest:7-8
"background_color": "#ffffff",
"theme_color": "#000000",
```

```tsx
// apps/web/src/app/layout.tsx:18-20
<head>
  <meta name="theme-color" content="#1a1a1a" />
</head>
```

**Why this matters:**
Inconsistent colors can cause confusing address-bar/OS theming and mismatched splash/background appearance depending on platform and install context.

---

### [MEDIUM] Finding #3: PWA manifest exists, but there is no service worker or offline asset strategy present

**File:** `apps/web/public/`  
**Lines:** N/A (directory contents)  
**Category:** unfinished

**Description:**
A web app manifest is present and referenced, but there is no `sw.js` (or similar) in `apps/web/public/`, and there is no evidence of service worker registration in the app code. As a result, offline capability and runtime caching behavior are not implemented (and not documented in the audited PWA entrypoints).

**Code:**
```text
# apps/web/public contents (no service worker file)
icons/
manifest.webmanifest
```

```text
# ripgrep results across apps/web (no service worker mention/registration)
apps/web/src/app/layout.tsx:8:  manifest: "/manifest.webmanifest",
apps/web/src/app/layout.tsx:19:        <meta name="theme-color" content="#1a1a1a" />
```

**Why this matters:**
Users may be able to “install” the app, but it will not behave like an offline-capable PWA; connectivity loss can lead to broken navigation and a poor installed-app experience.

---

### [MEDIUM] Finding #4: iOS “Add to Home Screen” meta and Apple touch icon assets are absent in the app shell/public assets

**File:** `apps/web/src/app/layout.tsx`  
**Lines:** 17-20  
**Category:** unfinished

**Description:**
The root document `<head>` contains only a `theme-color` meta tag and relies on the web manifest. There are no iOS-oriented meta tags (e.g., “apple-mobile-web-app-*”) and no Apple touch icon assets in `apps/web/public/` (e.g., `apple-touch-icon.png`). In practice, iOS home screen install behavior can be degraded without these.

**Code:**
```tsx
// apps/web/src/app/layout.tsx:17-20
<html lang="en">
  <head>
    <meta name="theme-color" content="#1a1a1a" />
  </head>
```

```text
# apps/web/public contains only:
icons/
manifest.webmanifest
```

**Why this matters:**
On iOS, install UX and home screen icon/splash behavior can be inconsistent or low-quality when Apple-specific metadata and touch icons are missing.

---

### [LOW] Finding #5: No `favicon.ico` (or equivalent shortcut icon) is present in `public`

**File:** `apps/web/public/`  
**Lines:** N/A (directory contents)  
**Category:** slop

**Description:**
`apps/web/public/` contains only `manifest.webmanifest` and the `icons/` directory. Many user agents and crawlers request `/favicon.ico` by default; without an asset, this commonly results in repeated 404s and missing tab/favicon UI.

**Code:**
```text
# apps/web/public contents
icons/
manifest.webmanifest
```

**Why this matters:**
Missing favicons are a small but visible polish issue and can cause noisy 404s in logs/monitoring.

---

### [LOW] Finding #6: Manifest omits `scope` and relies on default scoping behavior

**File:** `apps/web/public/manifest.webmanifest`  
**Lines:** 1-23  
**Category:** will-break

**Description:**
The manifest defines `start_url` but does not define `scope`. This relies on default scoping rules (based on the manifest URL’s directory). This is currently likely fine because the manifest is at the site root, but it is a latent footgun if hosting paths change (especially because icon `src` and `start_url` are absolute-root paths).

**Code:**
```json
// apps/web/public/manifest.webmanifest:1-6
{
  "name": "Setlist to Playlist",
  "short_name": "Setlist2Playlist",
  "description": "Import a setlist from setlist.fm and create an Apple Music playlist.",
  "start_url": "/",
  "display": "standalone",
```

**Why this matters:**
Unexpected scope/start URL interactions can cause installed PWAs to open outside the intended navigation context if the app is later served under a different path structure.

---

### [LOW] Finding #7: No maskable icon is provided (`purpose` is only `"any"`)

**File:** `apps/web/public/manifest.webmanifest`  
**Lines:** 9-21  
**Category:** slop

**Description:**
Both manifest icons specify `purpose: "any"` and there is no `maskable` (or combined) icon entry. Some platforms use maskable icons to avoid awkward cropping and to better match OS icon shapes.

**Code:**
```json
// apps/web/public/manifest.webmanifest:10-21
{
  "src": "/icons/icon-192.png",
  "sizes": "192x192",
  "type": "image/png",
  "purpose": "any"
}
```

**Why this matters:**
Installed app icons may appear improperly cropped or visually inconsistent on platforms that prefer maskable icons.

---

### [LOW] Finding #8: `short_name` is likely to be truncated in install/UI contexts

**File:** `apps/web/public/manifest.webmanifest`  
**Lines:** 2-4  
**Category:** slop

**Description:**
The `short_name` value is relatively long (`Setlist2Playlist`). Many OS/UI surfaces have limited space for app names and will truncate longer short names.

**Code:**
```json
// apps/web/public/manifest.webmanifest:2-4
"name": "Setlist to Playlist",
"short_name": "Setlist2Playlist",
"description": "Import a setlist from setlist.fm and create an Apple Music playlist.",
```

**Why this matters:**
Truncation can reduce recognizability on the home screen/app launcher and makes the installed app feel less polished.