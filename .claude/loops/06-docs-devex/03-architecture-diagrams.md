# Docs: Architecture Diagram Updates

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

`phases.07-docs-devex.sub_phases.03-architecture.items`

You are updating architecture documentation to reflect changes.
Work through items ONE AT A TIME.

## Audit Checklist

### Item: architecture-md

**ARCHITECTURE.md**

- Update the ASCII diagram if any data flow changed
- Verify the component list and deployment model
- Update the "Flows" section if any flow changed
- Update "Token Handling" if Phase 3 changed anything
- Update "Caching" if any cache strategy changed

### Item: package-dependency-diagram

**Package Dependency Diagram**

Using Phase 1's dependency graph findings, create or update
an ASCII diagram showing:

- Package dependencies and direction
- Which packages can import from which
- External service boundaries

### Item: feature-directory-map

**Feature Directory Map**

Create a map of the features/ directory structure:

- Which components belong to which feature
- Which hooks serve which features
- Shared components vs feature-specific

### Item: data-flow-diagram

**Data Flow Diagram**

Verify docs/tech/data-flow.md accurately shows:

- Import flow: URL input -> proxy -> setlist.fm -> preview
- Matching flow: setlist entries -> search -> Apple Music catalog
- Export flow: matched tracks -> create playlist -> add tracks

## Files to Read

- `ARCHITECTURE.md`
- `docs/tech/data-flow.md`
- Phase 1 analysis findings
- Current source structure

## Rules

- Use ASCII diagrams for consistency with existing docs
- Keep diagrams accurate but not overly detailed
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE document per invocation

## Max Iterations

6

## Completion

<promise>ARCHITECTURE DIAGRAMS COMPLETE</promise>
