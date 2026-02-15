# Ralph Fix Loop (OpenAI Codex)

Apply **code fixes** from the [Ralph audit](https://gist.github.com/DMontgomery40/08c1bdede08ca1cee8800db7da1cda25) findings. Same procedure as `ralph-audit` (PRD, Codex loop, one story per iteration), but the agent **edits** the repo to fix issues instead of only documenting them.

## Flow

1. **Findings JSON** – Transform audit markdown reports to JSON:
   ```bash
   node ralph-fix/scripts/md-to-json.js
   ```
   Reads `ralph-audit/audit/*.md` (excluding `00-INDEX.md`) and writes `ralph-fix/findings/<audit-id>.json` (e.g. `01-api-routes.json`). Run this after (re-)running the audit or when audit files change.

2. **Fix loop** – For each fix story with `passes: false`, the script:
   - Loads the story’s findings from `ralph-fix/findings/<findingsFile>.json`
   - Builds a prompt (story + findings JSON + CODEX.md, including instruction to write a fix report)
   - Runs **Codex without read-only** so it can edit source files (full debug: fix, lint, test, iterate)
   - Runs **pnpm lint** and **pnpm test**; marks the story passed only if both succeed
   - Implemented fixes are documented by the agent in **ralph-fix/fixes/<FIX-XXX>.md** (audit-style: File, Lines, Severity, Description, Fix applied)

## Prereqs

- **codex** CLI on PATH and authenticated
- **jq**
- **Node** (for md-to-json)
- Ralph audit already run (so `ralph-audit/audit/*.md` exist)

## Usage

```bash
# 1. Generate findings JSON from audit reports (if not already done)
cd /path/to/setlist-to-playlist
node ralph-fix/scripts/md-to-json.js

# 2. Run the fix loop (from repo root or from ralph-fix)
cd ralph-fix
chmod +x ralph-fix.sh
./ralph-fix.sh 15
```

Options:

- `./ralph-fix.sh --write-fix-reports-only` – do not run Codex; generate `ralph-fix/fixes/FIX-XXX.md` from findings JSON for every story that already has `passes: true`. Use this to backfill the fixes folder after a run where the agent did not write the reports.
- `./ralph-fix.sh 15 --skip-verify` – do not run lint/test after each story (still mark passed when Codex finishes)
- `./ralph-fix.sh 15 --no-search` – disable web search
- `./ralph-fix.sh 15 --skip-security-check` – skip credential warning

## Logs

- `ralph-fix/events.log` – high-level progress
- `ralph-fix/run.log` – full Codex output and verification output

## Output

- **ralph-fix/fixes/** – After each story passes, the agent writes a markdown report here (e.g. `FIX-001.md`) in the same style as the audit reports: for each finding fixed, File, Lines, Severity, Description, and Fix applied.

## Customize

- **prd.json** – Fix stories and `findingsFile` per story; verification commands. Set `passes: false` for all stories to run a full pass from scratch.
- **CODEX.md** – Fixer instructions (full debug, priority Critical → High → Medium, run lint/test, write fix report).
- **ralph-fix.sh** – Model (`REQUESTED_MODEL`), creates `fixes/` dir, injects fix-report path into prompt; optional verification skip.

## Relation to ralph-audit

- **ralph-audit**: read-only; produces `ralph-audit/audit/*.md`.
- **ralph-fix**: reads those MDs (via JSON), runs Codex in **write** mode to fix findings, then runs lint/test. Use ralph-fix only after you have audit reports and have reviewed them.
