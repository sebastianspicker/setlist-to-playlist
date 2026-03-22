# Final: "Would I Ship This?" Review

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

`phases.08-ship-review.sub_phases.03-ship-review.items`

You are performing a final subjective quality review.
Work through items ONE AT A TIME.

## For Every Source File, Ask:

1. Would I be comfortable putting my name on this code?
2. Would a new contributor understand this without asking questions?
3. Is there anything clever that should be simple instead?
4. Is there anything that will break in 6 months when a dependency updates?
5. Is there dead code that should be deleted?
6. Are there TODO/DCI comments that should be resolved?

## Specific Checks

### Item: review-core-src

**Read Every File in packages/core/src/**

### Item: review-shared-src

**Read Every File in packages/shared/src/**

### Item: review-api-src

**Read Every File in apps/api/src/**

### Item: review-web-lib

**Read Every File in apps/web/src/lib/**

### Item: review-web-components

**Read Every File in apps/web/src/components/**

### Item: review-web-features

**Read Every File in apps/web/src/features/**

### Item: review-web-app

**Read Every File in apps/web/src/app/**

### Item: review-config-files

**Read Every Config File (package.json, tsconfig, etc.)**

## Authority

- You may revert, rewrite, or delete changes from previous phases
  if they made things worse.
- Prefer deleting code over adding code.
- Be opinionated. This is the final call.

## Rules

- Read the actual file before making any judgment
- Fix issues directly when the fix is clear and safe
- Document but do not fix risky changes
- Run full CI after any change
- Update `.claude/loops/progress.md`
- Work on ONLY ONE file group per invocation

## Max Iterations

12

## Completion

When you have reviewed every file and are confident this is ship-ready:

<promise>SHIP REVIEW COMPLETE</promise>
