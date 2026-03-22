# Testing: Edge Case & Error Scenario Tests

## Ralph Loop Protocol

You are inside a Ralph Loop. The same prompt is fed every iteration via stop hook.
Your work persists in files and git history.

Every iteration:

1. Read `.claude/loops/state.yaml` — find next incomplete item in your scope
2. Do exactly ONE item of work
3. Run CI: `pnpm format:check && pnpm lint && pnpm build && pnpm test`
4. Update state.yaml (mark item complete, add notes)
5. Commit: `git add -A && git commit -m "test(<scope>): <desc>"`
6. Exit — stop hook re-invokes you

Emit the completion promise ONLY when your entire scope is complete.

## State

`phases.05-testing.sub_phases.04-edge-cases.items`

## Audit Checklist

### Item: empty-setlist

- mapSetlistFmToSetlist with no sets, empty sets, sets with no songs
- flattenSetlistToEntries with empty setlist
- buildPlaylistName with missing venue/date
- CreatePlaylistView with 0 matched tracks

### Item: huge-setlist

- Setlist with 100+ tracks (festival set)
- Does autoMatchAll handle this efficiently?
- Does the UI render 100+ MatchRowItems without freezing?
- dedupeTrackIdsOrdered with 100+ IDs

### Item: unicode-special-chars

- Artist names with diacritics (Bjork, Motley Crue, etc.)
- Venue names with non-Latin characters
- Track names with emoji, CJK characters
- normalizeTrackName with unicode input
- buildSearchQuery with special characters

### Item: network-failure-scenarios

- fetchJson when network is down (fetch throws TypeError)
- fetchDeveloperToken when API is unreachable
- searchCatalog when MusicKit API returns error
- addTracksToLibraryPlaylist when connection drops mid-request
- AbortController cancellation in useSetlistImportState

### Item: concurrent-request-handling

- Two rapid loadSetlist calls — does the abort controller work?
- Two rapid searchCatalog calls — does the runId guard work?
- Token refresh during active search — does it queue or race?

### Item: storage-edge-cases

- localStorage quota exceeded during writeHistory
- sessionStorage unavailable (private browsing in some browsers)
- Corrupted JSON in storage (readResume/readHistory)
- Storage with very old format version

### Item: rate-limiter-edge-cases

- Exactly at the limit boundary (request N vs N+1)
- Window reset timing
- Many unique IPs (bucket memory)
- Empty or malicious x-forwarded-for headers

## Files to Read

- All test files to avoid duplicating existing tests
- Source files being tested

## Rules

- Each test should test one specific edge case
- Use descriptive test names: `it('handles setlist with 0 tracks...')`
- Group related edge cases in one test file
- Prioritize: network failures > malformed data > boundary conditions
- Run `pnpm test` after each new test file
- Update `.claude/loops/progress.md` after each item
- Work on ONLY ONE category per invocation

## Max Iterations

10

## Completion

When edge case tests added and all tests passing:

<promise>EDGE CASE TESTS COMPLETE</promise>
