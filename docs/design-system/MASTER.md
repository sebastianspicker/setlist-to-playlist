# Design System: Setlist to Playlist

Source: UI/UX Pro Max (design-system search). Use for UI work and consistency.

## Pattern

- **Name:** Minimal Single Column
- **Conversion Focus:** Single CTA focus. Large typography. Lots of whitespace. No nav clutter. Mobile-first.
- **CTA Placement:** Center, large CTA button
- **Color Strategy:** Minimalist: brand + white + accent. Buttons: high contrast 7:1+. Text: black/dark grey
- **Sections:** Hero headline → Short description → Benefit bullets (3 max) → CTA → Footer

## Style

- **Name:** Vibrant & Block-based (optional; current app is minimal/functional)
- **Keywords:** Bold, energetic, block layout, high contrast, modern
- **Best For:** Music platforms, entertainment, conversion tools

## Colors (reference; current app uses light theme)

| Role       | Hex       | Notes              |
|-----------|-----------|--------------------|
| Primary   | #1E1B4B   | Dark accent        |
| Secondary | #4338CA   | Focus ring in app  |
| CTA       | #22C55E   | Success / go       |
| Background| #fff      | Current            |
| Text      | #1a1a1a   | Current body       |
| Muted     | #666      | Secondary text     |
| Error     | #b91c1c   | ErrorAlert         |

## Typography

- **Current:** system-ui, -apple-system, sans-serif; 16px body; line-height 1.5
- **Optional:** Righteous (headings) + Poppins (body) for music/entertainment mood

## Implemented (globals.css)

- **Focus:** `:focus-visible` outline 2px #2563eb, offset 2px on button, a, input
- **Touch targets:** `button { min-height: 44px }`
- **Transitions:** 200ms ease on button/link color and background
- **Reduced motion:** `prefers-reduced-motion: reduce` short-circuits animations/transitions

## Pre-Delivery Checklist

- [x] No emojis as icons (use SVG: Heroicons/Lucide)
- [x] cursor-pointer on all clickable elements
- [x] Hover states with smooth transitions (150–300ms)
- [x] Light mode: text contrast 4.5:1 minimum
- [x] Focus states visible for keyboard nav
- [x] prefers-reduced-motion respected
- [x] Responsive: 375px, 768px, 1024px, 1440px

## Avoid (anti-patterns)

- Flat design without depth (use subtle borders/shadows where needed)
- Text-heavy pages (keep steps and copy short)
