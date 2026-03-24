# E2E Tests

End-to-end tests for critical user flows should be added here using Playwright or Cypress.

## Planned test coverage

- **Import flow** — paste a setlist.fm URL, verify the setlist preview renders correctly.
- **Match flow** — confirm tracks are matched against the music catalog and results are displayed.
- **Export flow** — create a playlist on Apple Music and verify success feedback.

## Getting started

Choose a framework (Playwright recommended), install it, and add test scripts to the
`apps/web` package.json. See the project root `.gitignore` for patterns that already
exclude common test-runner artifacts (`playwright-report/`, `test-results/`, etc.).
