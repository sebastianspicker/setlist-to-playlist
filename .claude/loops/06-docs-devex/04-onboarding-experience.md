# Docs: Developer Onboarding Experience

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

`phases.07-docs-devex.sub_phases.04-onboarding.items`

You are verifying the first-time developer experience.
Work through items ONE AT A TIME.

## Audit Checklist

### Item: clone-to-running-verification

**Clone-to-Running Verification**

Follow the README from scratch:

- `git clone` the repo
- `pnpm install`
- Copy `.env.example` to `.env`
- `pnpm dev`
  Does the app start? What errors appear without real API keys?

### Item: error-messages-missing-config

**Error Messages for Missing Config**

When API keys are not set:

- Does the dev-token endpoint return a clear error?
- Does the setlist proxy return a clear error?
- Does the UI show a helpful message, or does it crash?

### Item: readme-quickstart

**README Quickstart**

- Is the quickstart path clear and < 5 commands?
- Are prerequisites listed (Node 20+, pnpm)?
- Is the .env setup explained with specific instructions?

### Item: development-workflow

**Development Workflow**

- Is `pnpm dev` the only command needed for development?
- Are hot reload and error overlay working?
- Is there a clear way to run tests during development?

## Files to Read

- `README.md`
- `.env.example`
- `package.json` (scripts)
- Error handling in dev-token and setlist proxy routes

## Rules

- Think like a developer who just cloned this repo
- Document any friction points
- Fix documentation gaps
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE verification per invocation

## Max Iterations

6

## Completion

<promise>ONBOARDING EXPERIENCE COMPLETE</promise>
