# PWA & Static Assets Findings

Audit Date: 2026-02-15T08:15:35Z  
Files Examined: 8  
Total Findings: 8  

## Summary by Severity
- Critical: 0
- High: 2
- Medium: 3
- Low: 3

---

## Findings

### [HIGH] Finding #1: Manifest icon `sizes` do not match the actual PNG dimensions (and both icon files are identical)

**File:** `apps/web/public/manifest.webmanifest`  
**Lines:** 9-21  
**Category:** will-break  

**Description:**  
The manifest declares two icons with `sizes` `192x192` and `512x512`, but both referenced files are actually **2048×2048** PNGs. Additionally, `icon-192.png` and `icon-512.png` are byte-for-byte identical (same hash), so the app is not providing distinct size variants at all. This directly contradicts the intent implied by the filenames and by `apps/web/public/icons/.gitkeep`.

**Code:**
```json
// apps/web/public/manifest.webmanifest:9-21
"icons": [
  { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
]
```

```bash
$ file apps/web/public/icons/icon-192.png apps/web/public/icons/icon-512.png
...icon-192.png: PNG image data, 2048 x 2048...
...icon-512.png: PNG image data, 2048 x 2048...

$ shasum -a 256 apps/web/public/icons/icon-192.png apps/web/public/icons/icon-512.png
3ae7e6e3...  apps/web/public/icons/icon-192.png
3ae7e6e3...  apps/web/public/icons/icon-512.png

$ nl -ba apps/web/public/icons/.gitkeep
1  # Place icon-192.png and icon-512.png here for PWA icons.
```

**Why this matters:**  
Installers/launchers select icons by declared size; mismatches can lead to wrong selection, unexpected scaling, or icons being ignored, causing broken/low-quality installed-app branding.

---

### [MEDIUM] Finding #2: PWA icons are extremely large for their intended roles (multi-megabyte PNGs)

**File:** `apps/web/public/icons/icon-192.png`  
**Lines:** N/A (binary asset)  
**Category:** will-break  

**Description:**  
Both PWA icon files are ~4.2 MB each despite being declared (and named) as small app icons. This is disproportionate for icons and suggests the assets are not optimized for typical PWA usage.

**Code:**
```bash
$ wc -c apps/web/public/icons/icon-192.png apps/web/public/icons/icon-512.png
4205048 apps/web/public/icons/icon-192.png
4205048 apps/web/public/icons/icon-512.png
8410096 total
```

**Why this matters:**  
Large icon payloads increase storage/bandwidth costs and can degrade perceived performance during install flows and on devices that fetch these assets eagerly.

---

### [MEDIUM] Finding #3: PWA icons embed XMP/C2PA/IPTC metadata (including provenance strings), increasing size and potentially leaking generation/tooling details

**File:** `apps/web/public/icons/icon-192.png`  
**Lines:** N/A (binary asset)  
**Category:** slop  

**Description:**  
The icon PNG contains embedded metadata chunks (XMP/IPTC/C2PA). The extracted strings include `iTXtXML:com.adobe.xmp` and `photoshop:Credit="Made with Google AI"`, along with C2PA-related certificate/signature material. This kind of embedded metadata is atypical for small app icons and contributes to bloat and unintended disclosure of tooling/provenance.

**Code:**
```bash
$ xxd -l 64 apps/web/public/icons/icon-192.png
... IHDR .... zTXtRaw profile type iptc ...

$ strings -n 8 apps/web/public/icons/icon-192.png | sed -n '1,20p'
zTXtRaw profile type iptc
iTXtXML:com.adobe.xmp
... photoshop:Credit="Made with Google AI" ...
... c2pa.signature ...
... Google LLC ...
```

**Why this matters:**  
Metadata increases asset size and can expose provenance or toolchain details in shipped static assets (even when the app otherwise intends to be minimal/public-only).

---

### [HIGH] Finding #4: No service worker present; manifest implies an “app-like” install but there is no offline/runtime caching implementation

**File:** `apps/web/next.config.ts`  
**Lines:** 1-6  
**Category:** unfinished  

**Description:**  
The web app includes a manifest and sets `display: "standalone"` (manifest line 6), but there is no service worker file and no service worker registration/configuration anywhere in `apps/web`. `apps/web/next.config.ts` contains no PWA-related configuration, and searches for service worker usage return no matches. As-is, this is not an offline-capable PWA; installability prompts on some platforms/browsers may not appear without a service worker.

**Code:**
```ts
// apps/web/next.config.ts:1-6
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/core', '@repo/shared', 'api'],
};

export default nextConfig;
```

```json
// apps/web/public/manifest.webmanifest:5-6
"start_url": "/",
"display": "standalone",
```

```bash
$ find apps/web -maxdepth 4 -type f \( -iname 'sw.*' -o -iname '*service-worker*' -o -iname '*workbox*' \) -print
# (no output)

$ rg -n "navigator\\.serviceWorker|serviceWorker\\.register|workbox|next-pwa|registerSW|sw\\.js" apps/web
# (no output)
```

**Why this matters:**  
Users may expect offline resilience and installability from a “standalone” manifest-driven app experience; without a service worker, those expectations will not be met and some PWA checks will fail.

---

### [MEDIUM] Finding #5: Theme color signals are inconsistent across manifest, HTML meta, and actual page styling

**File:** `apps/web/src/app/layout.tsx`  
**Lines:** 17-20  
**Category:** will-break  

**Description:**  
There are three different “theme” signals:
- HTML meta theme-color is `#1a1a1a` (dark).
- Manifest `theme_color` is `#000000` (different dark).
- Global CSS sets `body` background to `#fff` with text color `#1a1a1a` (light page).

This inconsistency can cause browser UI (address bar/task switcher) and splash/launch surfaces to use colors that do not match the rendered app, creating visible flashes or mismatched framing around the app.

**Code:**
```tsx
// apps/web/src/app/layout.tsx:17-20
<html lang="en">
  <head>
    <meta name="theme-color" content="#1a1a1a" />
  </head>
```

```json
// apps/web/public/manifest.webmanifest:7-8
"background_color": "#ffffff",
"theme_color": "#000000",
```

```css
/* apps/web/src/styles/globals.css:7-13 */
body {
  margin: 0;
  /* ... */
  color: #1a1a1a;
  background: #fff;
}
```

**Why this matters:**  
Theme/splash colors are used outside the page render (OS UI, launch surfaces). Mismatches produce inconsistent branding and noticeable visual artifacts.

---

### [MEDIUM] Finding #6: No favicon / app icon links provided via App Router conventions or `<link>` tags; browsers and iOS home-screen flows likely lack proper icons

**File:** `apps/web/src/app/layout.tsx`  
**Lines:** 17-21  
**Category:** unfinished  

**Description:**  
`layout.tsx` defines only a `theme-color` meta tag in `<head>` and does not provide any icon link tags (e.g., `rel="icon"`, `rel="apple-touch-icon"`). Additionally, `apps/web/public` does not contain `favicon.ico` (only `manifest.webmanifest`), and `apps/web/src/app` contains no App Router icon routes (e.g., `icon.png`, `apple-icon.png`). This commonly results in:
- `/favicon.ico` requests returning 404 (browser tab icon missing/default).
- iOS “Add to Home Screen” using a suboptimal icon or a screenshot-like tile rather than a curated app icon.

**Code:**
```tsx
// apps/web/src/app/layout.tsx:17-21
<head>
  <meta name="theme-color" content="#1a1a1a" />
</head>
```

```bash
$ find apps/web/public -maxdepth 1 -type f -print | sort
apps/web/public/manifest.webmanifest

$ find apps/web/src/app -maxdepth 2 -type f -print | sort
apps/web/src/app/error.tsx
apps/web/src/app/global-error.tsx
apps/web/src/app/layout.tsx
apps/web/src/app/page.tsx
```

**Why this matters:**  
Missing icon assets degrade UX/branding, generate noisy 404s in logs/DevTools, and reduce the quality of installation/add-to-home-screen experiences.

---

### [LOW] Finding #7: Manifest omits explicit `scope` and uses root-absolute URLs, making behavior sensitive to non-root deployments

**File:** `apps/web/public/manifest.webmanifest`  
**Lines:** 5, 11, 17  
**Category:** will-break  

**Description:**  
The manifest does not define `scope` and uses root-absolute paths for `start_url` and icon `src` values. This works when the app is deployed at the domain root, but it makes the manifest’s navigation and asset resolution sensitive to deployments under a subpath (where `start_url: "/"` and `src: "/icons/..."` target the domain root, not the app subpath).

**Code:**
```json
// apps/web/public/manifest.webmanifest:5, 11, 17
"start_url": "/",
"src": "/icons/icon-192.png",
"src": "/icons/icon-512.png",
```

**Why this matters:**  
Subpath deployments can produce broken icons and unexpected launch URLs if the manifest assumes a root deployment context.

---

### [LOW] Finding #8: Manifest provides only `purpose: "any"` icons; no `maskable` variant for adaptive icon rendering

**File:** `apps/web/public/manifest.webmanifest`  
**Lines:** 9-21  
**Category:** slop  

**Description:**  
Both manifest icons declare `purpose: "any"` and there is no `maskable` icon variant. On platforms that render adaptive icons, non-maskable artwork can be cropped in undesirable ways.

**Code:**
```json
// apps/web/public/manifest.webmanifest:14, 20
"purpose": "any"
```

**Why this matters:**  
Installed-app icons may appear inconsistently cropped across Android launchers and device manufacturers.