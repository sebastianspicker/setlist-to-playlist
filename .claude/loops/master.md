# Ralph Loop Master Orchestrator

You are orchestrating a multi-phase improvement of the **setlist-to-playlist** repository.
This is a TypeScript monorepo (pnpm + Turbo): Next.js 16 PWA (React 19), shared API logic
in `apps/api`, pure domain logic in `packages/core`, shared types in `packages/shared`.

## Ralph Loop Protocol

You are inside a Ralph Loop. The same prompt is fed every iteration via stop hook.
Your work persists in files and git history.

Every iteration:

1. Read `.claude/loops/state.yaml` — find next incomplete item across ALL phases
2. Do exactly ONE item of work
3. Run CI verification (if code was changed)
4. Update `state.yaml` (mark item complete, add notes)
5. Commit changes: `git add -A && git commit -m "<type>(<scope>): <desc>"`
6. Exit — stop hook re-invokes you

Emit `<promise>ALL PHASES COMPLETE</promise>` ONLY when every phase is complete.

## Iteration Logic

### Step 1: Read State

Read `.claude/loops/state.yaml`. Parse the YAML to determine:

- Which phase is current (first phase with `status != complete`)
- Which sub-phase within that phase is current (first with `status != complete`)
- Which item within that sub-phase is current (first with `status` = `not-started` or `in-progress`)

### Step 2: Determine Action

**IF no incomplete items remain across all phases:**
→ Run final CI verification
→ Emit `<promise>ALL PHASES COMPLETE</promise>`

**IF a phase just completed** (all sub-phases complete, `ci_verified` is `false`):
→ Run Tier 3 CI:

```bash
pnpm install --frozen-lockfile
pnpm format:check && pnpm lint && pnpm build && pnpm test
pnpm audit --audit-level=high --prod
```

→ Mark phase `ci_verified: true` in state.yaml
→ Exit (next iteration starts next phase)

**IF a sub-phase just completed** (all items complete/blocked/skipped):
→ Run Tier 2 CI:

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
pnpm audit --audit-level=high --prod
```

→ Mark sub-phase `status: complete` in state.yaml
→ Exit (next iteration checks phase completion)

**IF an item is `in-progress`:**
→ Resume that item (re-read the sub-phase prompt for instructions)

**IF next item is `not-started`:**
→ Read the sub-phase prompt file for detailed instructions
→ Mark item `status: in-progress` in state.yaml
→ Do the work described for that specific item

### Step 3: Find the Sub-Phase Prompt

The sub-phase prompt file is located at:

```
.claude/loops/{phase_dir}/{sub_phase_file}.md
```

Phase key → disk directory mapping (state.yaml key → actual directory):

Round 1 (completed):

- `01-analysis` → `01-analysis/`
- `02-bugs` → `02-bugs/`
- `03-refactoring` → `02-refactoring/`
- `04-security` → `03-security/`
- `05-testing` → `04-testing/`
- `06-ux-a11y-perf` → `05-ux-a11y-perf/`
- `07-docs-devex` → `06-docs-devex/`
- `08-ship-review` → `07-final-review/`

Round 2:

- `r2-01-test-infra` → `r2-01-test-infra/`
- `r2-02-component-tests` → `r2-02-component-tests/`
- `r2-03-quality-fixes` → `r2-03-quality-fixes/`
- `r2-04-verification` → `r2-04-verification/`

Within each phase directory, sub-phase files are named `01-*.md`, `02-*.md`, etc.
Read the prompt file and find the section matching `### Item: {item_id}`.

### Step 4: Do ONE Item

Execute the work described in the sub-phase prompt for the current item.
Do NOT work on more than one item per iteration.

For read-only phases (Phase 1): only update state.yaml and progress.md.
For code-modifying phases: make the minimal change, then verify.

### Step 5: Verify

After changing code, run Tier 1 CI:

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
```

If any command fails:

1. Fix the failure
2. Re-run CI
3. Only then mark the item complete

### Step 6: Update State

Update `.claude/loops/state.yaml`:

- Mark item `status: complete` with `notes` about what was done
- Update `current.phase`, `current.sub_phase`, `current.item` to reflect next work
- Update `current.test_count` if tests were added
- Increment `iterations_used` on the sub-phase

### Step 7: Commit

If code was changed (not just state.yaml):

```bash
git add -A
git commit -m "<type>(<scope>): <description>"
```

Commit types: `fix`, `feat`, `refactor`, `test`, `docs`, `chore`, `perf`, `security`

## Phase Transitions

When starting a NEW phase (first item of first sub-phase):

1. Check if already on the correct branch: `git branch --show-current`
2. If not, create and switch: `git checkout -b ralph/{phase-dir}`
3. Record branch in state.yaml: `phases.{phase}.branch`
4. Mark phase `status: in-progress` and `started` timestamp

When a phase COMPLETES:

1. Run Tier 3 CI
2. Mark `ci_verified: true` and `completed` timestamp
3. Mark phase `status: complete`

## Phase Sequence

| #    | Phase                  | State Key               | Disk Dir                 | Branch                     |
| ---- | ---------------------- | ----------------------- | ------------------------ | -------------------------- |
| R2-1 | Testing Infrastructure | `r2-01-test-infra`      | `r2-01-test-infra/`      | `ralph/r2-test-infra`      |
| R2-2 | Component & Hook Tests | `r2-02-component-tests` | `r2-02-component-tests/` | `ralph/r2-component-tests` |
| R2-3 | Quality Fixes          | `r2-03-quality-fixes`   | `r2-03-quality-fixes/`   | `ralph/r2-quality-fixes`   |
| R2-4 | Final Verification     | `r2-04-verification`    | `r2-04-verification/`    | `ralph/r2-verification`    |

## Safety Rules

- **One item per iteration.** Do NOT work on more than one item.
- **Max iterations per sub-phase.** Check `max_iterations` in state.yaml. If `iterations_used >= max_iterations`, mark remaining items as `blocked` with notes and move on.
- **Stuck detection.** If you have been working on the same item for 3+ iterations without completing it, mark it `blocked` with explanation and move on.
- **CI failure.** If CI fails and you cannot fix it in 2 attempts, mark the item `blocked` with "CI failure" notes.

## Rollback

If a change breaks something irreparably:

1. `git stash` the changes
2. Mark item `status: blocked` in state.yaml with explanation
3. Move to next item

## Completion

When all 8 phases are complete, all CI gates passed, and all items are resolved:

<promise>ALL PHASES COMPLETE</promise>
