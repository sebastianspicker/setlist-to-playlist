# Analysis: Bug Discovery

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

Read state.yaml at `phases.01-analysis.sub_phases.05-bug-discovery.items`

**IMPORTANT: This is a READ-ONLY phase. Do NOT modify source files. Only update state.yaml and progress.md.**

## Items

### Item: trace-happy-paths

- Walk through the complete user flow: import setlist -> preview -> match tracks -> export playlist
- For each step, read the source files that handle that step
- Look for: unhandled edge cases, missing null checks, silent failures, wrong assumptions
- Document any bugs found in state.yaml notes

### Item: trace-error-paths

- Walk through each error scenario in the app:
  - What if setlist.fm API returns 404? 500? Rate limit?
  - What if Apple Music API returns errors during search?
  - What if MusicKit authorization is revoked mid-session?
  - What if the user's Apple Music subscription expires?
- For each, trace from error source -> through layers -> to UI feedback
- Document gaps where errors are swallowed or shown poorly

### Item: concurrent-scenarios

- Check for race conditions in async operations:
  - Multiple rapid setlist imports (does previous abort?)
  - Rapid search typing (are stale results shown?)
  - Token refresh during API calls (does the call retry with new token?)
  - Multiple playlist creation attempts (double-create possible?)
- Read the hooks (useMatchingSuggestions, useTrackSearch, useCreatePlaylistState) and look for run ID guards or AbortController usage

### Item: browser-edge-cases

- Check: What happens with JavaScript disabled? (Does SSR provide fallback content?)
- Check: What happens with cookies/storage blocked? (MusicKit needs cookies)
- Check: What happens on slow 3G? (Are there loading indicators everywhere needed?)
- Check: What happens if MusicKit CDN is blocked by ad blocker?

## Files to Read

- All feature views, hooks, lib files, and layout.tsx

## Rules

- READ ONLY. Do not modify any source file.
- Only update state.yaml and progress.md.
- Work on ONE item per invocation.

## Max Iterations

8

## Completion

When all bug discovery items are complete:

<promise>BUG DISCOVERY COMPLETE</promise>
