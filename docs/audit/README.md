# Ralph Audit Loop (OpenAI Codex) – Setlist to Playlist

This directory contains a **tailored** Ralph audit loop for the **Setlist to Playlist** repo. It runs a long-lived, autonomous, **read-only** code audit via the OpenAI Codex CLI: the agent documents problems in markdown reports and does not modify any code.

This is an adapted version of the [Ralph audit loop (Codex CLI read-only code audit runner)](https://gist.github.com/DMontgomery40/08c1bdede08ca1cee8800db7da1cda25) by DMontgomery40. The PRD, CODEX instructions, and script have been customized for this repository’s stack and audit scope.

## What’s Different Here (The Codex Part)

- Picks the next story in `prd.json` where `passes: false`
- Builds a prompt from that story plus `CODEX.md`
- Runs `codex exec` in **read-only** mode (`-s read-only`)
- Optionally enables web research (`--search`)
- Captures the model’s final message and writes it to the file in the story’s acceptance criteria (e.g. `Created ralph-audit/audit/01-api-routes.md`)
- Marks the story passed and continues

## Prereqs

- **codex** CLI on your PATH and authenticated (`codex login` or `OPENAI_API_KEY`).
- **jq** (used to read/update `prd.json`).
- Bash.

## Setup Instructions

1. **Install Codex CLI** (if needed) and authenticate:
   ```bash
   # Ensure codex is on PATH and logged in, e.g.:
   # printenv OPENAI_API_KEY | codex login --with-api-key
   ```

2. **Install jq** (macOS: `brew install jq`).

3. **Run from this directory** (`ralph-audit/` at repo root):
   ```bash
   cd /path/to/setlist-to-playlist/ralph-audit
   chmod +x ralph.sh
   ./ralph.sh 16
   ```
   Use a max iteration count at least as large as the number of audit stories (16). The script will stop earlier if all stories pass.

4. **Security pre-flight:** The script checks for sensitive env vars. If `APPLE_PRIVATE_KEY` or `SETLISTFM_API_KEY` (or `AWS_ACCESS_KEY_ID`, `DATABASE_URL`) are set, it will warn and ask for confirmation. Unset them in the shell where you run Ralph, or run in a clean env, or use `--skip-security-check` (not recommended with real secrets).

5. **Output location:** Reports are written under the **repo root** at `ralph-audit/audit/*.md`. The script resolves the repo root automatically whether `ralph-audit` lives at repo root or at `.codex/ralph-audit`.

## How to Run

```bash
cd ralph-audit
./ralph.sh 16
```

With web research disabled:

```bash
./ralph.sh 16 --no-search
```

## Logs / Tailing

- `ralph-audit/events.log` – high-level progress.
- `ralph-audit/run.log` – full Codex output.

```bash
tail -n 200 -f ralph-audit/events.log
tail -n 200 -f ralph-audit/run.log
```

## Output

Reports are created at **repo root**: `ralph-audit/audit/00-INDEX.md`, `01-api-routes.md`, … through `15-dead-code.md`, then the final index. Exact filenames are defined in `prd.json` acceptance criteria.

## Customize

- **prd.json** – Audit stories and file paths; already tailored to Setlist to Playlist (API routes, Apple token, setlist proxy, core, import/matching/export UI, config/CORS, types, tests, PWA, dead code, index).
- **CODEX.md** – Safety notice, web research policy (Next.js, MusicKit, setlist.fm, jose), and problem categories; already tailored.
- **ralph.sh** – Model pin (`REQUESTED_MODEL`, `REASONING_EFFORT`), security warnings (including `APPLE_PRIVATE_KEY`, `SETLISTFM_API_KEY`). On **Linux**, change `sed -i ''` to `sed -i` for progress file updates (see comment in script).

## Audit Scope (This Repo)

The PRD covers: Next.js API routes (health, apple/dev-token, setlist/proxy), Apple Developer Token & JWT, setlist.fm proxy, core setlist/matching, setlist import UI, matching UI, playlist export, app pages/layout, config & CORS, error handling, types, tests, lib/utils, PWA/assets, dead code, and a final consolidation index.
