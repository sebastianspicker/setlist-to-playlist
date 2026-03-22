# R2: Testing Infrastructure Setup

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

YAML path: `phases.r2-01-test-infra.sub_phases.01-install-deps.items`

## Items

### Item: install-testing-library

- Run: `pnpm add -D @testing-library/react @testing-library/jest-dom jsdom --filter web`
- Verify packages appear in `apps/web/package.json` devDependencies
- Run `pnpm install` to update lockfile

### Item: configure-vitest-jsdom

- The `vitest.config.ts` at `apps/web/vitest.config.ts` does NOT need a global jsdom environment (some tests run in Node)
- Instead, individual test files that need jsdom should use `// @vitest-environment jsdom` directive
- Create a setup file for `@testing-library/jest-dom` matchers: `apps/web/tests/setup.ts` with `import '@testing-library/jest-dom/vitest'`
- Update `vitest.config.ts` to reference the setup file: `test: { setupFiles: ['./tests/setup.ts'] }`

### Item: verify-setup

- Create `apps/web/tests/components/smoke.test.tsx` with a minimal test:
  - `// @vitest-environment jsdom`
  - Import React and `render`, `screen` from `@testing-library/react`
  - Render a simple `<div>Hello</div>`
  - Assert `screen.getByText('Hello')` is in the document
- Run `pnpm test` and verify this test passes
- Delete the smoke test file after verification (or keep as a reference)

## Files to Read

- `.claude/loops/state.yaml` — current loop state
- `apps/web/package.json` — current dependencies
- `apps/web/vitest.config.ts` — current vitest configuration
- `apps/web/tsconfig.json` — TypeScript config for JSX support

## Rules

- Work on ONLY ONE item per invocation
- Items must be completed in order (install-testing-library -> configure-vitest-jsdom -> verify-setup)
- Always verify the result of each step before marking complete
- Always run CI before committing

## Max Iterations

4

## Completion

<promise>R2 TEST INFRA SETUP COMPLETE</promise>
