# UX: PWA Audit

## Ralph Loop Protocol

You are inside a Ralph Loop. The same prompt is fed every iteration via stop hook.
Your work persists in files and git history.

Every iteration:

1. Read `.claude/loops/state.yaml` — find next incomplete item in your scope
2. Do exactly ONE item of work
3. Run CI: `pnpm format:check && pnpm lint && pnpm build && pnpm test`
4. Update state.yaml (mark item complete, add notes)
5. Commit: `git add -A && git commit -m "<type>(<scope>): <desc>"`
6. Exit — stop hook re-invokes you

Emit the completion promise ONLY when your entire scope is complete.

## State

`phases.06-ux-a11y-perf.sub_phases.03-pwa-audit.items`

You are auditing PWA compliance and offline support.
Work through items ONE AT A TIME.

## Audit Checklist

### Item: web-app-manifest

**Web App Manifest**

- Check `public/manifest.webmanifest` exists and is valid
- Verify: name, short_name, start_url, display, background_color,
  theme_color, icons (multiple sizes: 192x192, 512x512 minimum)
- Check that the manifest is linked in layout.tsx metadata

### Item: service-worker

**Service Worker**

- Check if Next.js PWA plugin is installed (next-pwa or @serwist/next)
- If no service worker exists, document what it should do:
  - Cache static assets (CSS, JS, images)
  - Cache API responses for offline viewing of loaded setlists
  - Network-first strategy for API calls
  - Cache-first for static assets

### Item: installability

**Installability**

- Verify the app meets Chrome's installability criteria:
  - Valid manifest with required fields
  - Service worker (or at least the manifest)
  - Served over HTTPS (production only)

### Item: offline-behavior

**Offline Behavior**

- What happens when the user loses network?
  - During initial load
  - After loading a setlist (can they still view it?)
  - During matching (search requires network)
  - During playlist creation (requires network)

### Item: meta-tags

**Meta Tags**

File: `apps/web/src/app/layout.tsx`
Check for:

- `<meta name="theme-color">`
- `<meta name="apple-mobile-web-app-capable">`
- `<meta name="apple-mobile-web-app-status-bar-style">`
- `<link rel="apple-touch-icon">`
- `<meta name="viewport">` (Next.js adds by default)

## Files to Read

- `apps/web/public/` directory listing
- `apps/web/src/app/layout.tsx`
- `apps/web/next.config.ts`
- `apps/web/package.json`

## Rules

- PWA improvements should enhance, not require, the experience
- Offline caching should be appropriate (no excessive storage)
- Service worker registration must not block initial render
- Run full CI after changes
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE audit item per invocation

## Max Iterations

8

## Completion

When PWA audit complete:

<promise>PWA AUDIT COMPLETE</promise>
