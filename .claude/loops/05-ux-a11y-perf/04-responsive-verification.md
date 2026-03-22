# UX: Responsive Design Verification

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

`phases.06-ux-a11y-perf.sub_phases.04-responsive.items`

You are verifying the application works across viewport sizes.
Work through items ONE AT A TIME.

## Audit Checklist

### Item: css-breakpoint-analysis

**CSS Breakpoint Analysis**

File: `apps/web/src/styles/globals.css`

- Currently only one breakpoint: `@media (max-width: 480px)`
- Check if intermediate breakpoints are needed (768px, 1024px)
- Verify the 480px breakpoint covers all necessary adjustments

### Item: component-responsive-review

**Component-Level Responsive Review**

For each component, check:

- Import form: input + button layout at 320px, 480px, 768px, 1440px
- Matching list: row layout at narrow widths (flex-wrap behavior)
- Track search panel: search input width at mobile
- Create playlist view: success message and buttons at mobile
- History panel: item buttons at narrow widths

### Item: typography-scaling

**Typography Scaling**

- Body font-size is 16px — appropriate for mobile
- Check heading sizes at mobile (h1 may be too large)
- Check that no text is clipped or overflows at 320px
- Verify code/monospace elements wrap properly

### Item: touch-target-sizes

**Touch Target Sizes**

- CSS has `button { min-height: 44px }` (WCAG 2.5.5) — verify
- Check inline buttons (history items, search result buttons)
  for adequate touch area
- Verify spacing between adjacent touch targets

### Item: container-width

**Container Width**

File: `apps/web/src/lib/styles.ts`

- Check mainContainerStyle — does it use max-width with auto margins?
- At 2560px, is the content centered with reasonable max-width?
- At 320px, is there adequate padding?

## Files to Read

- `apps/web/src/styles/globals.css` (all media queries)
- `apps/web/src/lib/styles.ts`
- All component and feature files (inline styles)

## Rules

- Test responsive behavior by reading CSS and computing layouts
- If Playwright E2E exists from Phase 4, add viewport-size tests
- Focus on usability, not pixel-perfection
- Run `pnpm build` after CSS changes
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE audit area per invocation

## Max Iterations

6

## Completion

When responsive verification complete:

<promise>RESPONSIVE VERIFICATION COMPLETE</promise>
