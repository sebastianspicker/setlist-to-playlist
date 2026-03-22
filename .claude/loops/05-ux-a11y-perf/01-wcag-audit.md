# UX: WCAG 2.1 AA Compliance Audit

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

`phases.06-ux-a11y-perf.sub_phases.01-wcag-audit.items`

You are auditing the application for WCAG 2.1 AA compliance.
Work through items ONE AT A TIME.

## Audit Checklist

### Item: color-contrast

**Color Contrast (1.4.3, 1.4.6)**

File: `apps/web/src/styles/globals.css`
Check contrast ratios for:

- `--text-main` (#f8fafc) on `--bg-color` (#0f172a) — likely passes
- `--text-muted` (#94a3b8) on `--bg-color` — check 4.5:1 ratio
- `--accent-primary` (#3b82f6) on `--bg-color` — check ratio
- `--danger` (#ef4444) on glass-panel background
- `--success` (#10b981) on glass-panel background
- ErrorAlert: text on background colors
- Button text (#fff) on `--accent-primary` (#3b82f6)

### Item: keyboard-navigation

**Keyboard Navigation (2.1.1, 2.1.2)**

- Tab order through the import form
- Tab into matching view — can every MatchRowItem be reached?
- Tab into search panel — can search results be selected via keyboard?
- Can the "Back to preview/matching" buttons be reached via Tab?
- Is the skip link (`.skip-link`) working correctly?

### Item: aria-landmarks-roles

**ARIA Landmarks & Roles (1.3.1, 4.1.2)**

- `<main id="main">` exists — verify
- Check `<section aria-label="...">` usage — are labels descriptive?
- `role="alert"` on error messages — correct usage
- `role="status"` on success messages — correct usage
- Are loading states announced to screen readers? (aria-busy, aria-live)

### Item: form-accessibility

**Form Accessibility (1.3.1, 3.3.1, 3.3.2)**

- Input has label (`htmlFor="setlist-input"`) — verify connection
- `aria-invalid` set on error — verify
- `aria-describedby` points to error element — verify ID match
- Error messages are associated with the field they describe
- Required fields have `aria-required` or HTML `required`

### Item: focus-management

**Focus Management (2.4.3, 2.4.7)**

- When step changes (import -> preview -> matching -> export),
  is focus moved to the new content?
- When error appears, is focus moved to the error?
- Focus ring visible on all interactive elements

### Item: motion-animation

**Motion & Animation (2.3.1, 2.3.3)**

- `prefers-reduced-motion` media query exists in CSS — verify
- Check: does it cover all animations? (button hover transform,
  transitions)
- Verify no auto-playing animations exist

### Item: text-alternatives

**Text Alternatives (1.1.1)**

- Check all images for alt text
- Check all icons (if any) for aria-label

## Files to Read

- `apps/web/src/styles/globals.css`
- All component files in `apps/web/src/components/`
- All feature files in `apps/web/src/features/`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`

## Rules

- Use WCAG 2.1 AA as the standard (not AAA)
- Calculate contrast ratios using the WCAG formula
- Fix issues that can be fixed with CSS or ARIA changes
- Document issues that require structural changes
- Run `pnpm build` after changes
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE audit category per invocation

## Max Iterations

10

## Completion

When WCAG audit complete and issues addressed:

<promise>WCAG AUDIT COMPLETE</promise>
