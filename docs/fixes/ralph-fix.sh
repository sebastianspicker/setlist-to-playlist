#!/bin/bash
# Ralph Fix Loop (OpenAI Codex) – Apply fixes from ralph-audit findings.
# Usage: ./ralph-fix.sh [max_iterations] [--skip-security-check] [--no-search] [--skip-verify]
#
# 1. Run md-to-json if needed (audit MD -> ralph-fix/findings/*.json).
# 2. Loop over fix stories (passes == false), load findings JSON, run Codex to fix (no read-only).
# 3. After each run, execute pnpm lint and pnpm test; mark story passed only if both pass.

set -euo pipefail

MAX_ITERATIONS=20
MAX_ATTEMPTS_PER_STORY="${MAX_ATTEMPTS_PER_STORY:-5}"
SKIP_SECURITY="${SKIP_SECURITY_CHECK:-false}"
ENABLE_SEARCH="true"
SKIP_VERIFY="false"
WRITE_FIX_REPORTS_ONLY="false"
TAIL_N="${TAIL_N:-200}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --write-fix-reports-only)
      WRITE_FIX_REPORTS_ONLY="true"
      shift
      ;;
    --skip-security-check)
      SKIP_SECURITY="true"
      shift
      ;;
    --skip-verify)
      SKIP_VERIFY="true"
      shift
      ;;
    --search)
      ENABLE_SEARCH="true"
      shift
      ;;
    --no-search)
      ENABLE_SEARCH="false"
      shift
      ;;
    *)
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

if [[ "$SKIP_SECURITY" != "true" ]]; then
  echo ""
  echo "==============================================================="
  echo "  Security Pre-Flight Check"
  echo "==============================================================="
  echo ""

  SECURITY_WARNINGS=()

  if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
    SECURITY_WARNINGS+=("AWS_ACCESS_KEY_ID is set - production credentials may be exposed")
  fi

  if [[ -n "${DATABASE_URL:-}" ]]; then
    SECURITY_WARNINGS+=("DATABASE_URL is set - database credentials may be exposed")
  fi

  if [[ -n "${APPLE_PRIVATE_KEY:-}" ]]; then
    SECURITY_WARNINGS+=("APPLE_PRIVATE_KEY is set - Apple Music JWT key may be exposed in logs/API calls")
  fi

  if [[ -n "${SETLISTFM_API_KEY:-}" ]]; then
    SECURITY_WARNINGS+=("SETLISTFM_API_KEY is set - setlist.fm API key may be exposed in logs/API calls")
  fi

  if [[ ${#SECURITY_WARNINGS[@]} -gt 0 ]]; then
    echo "WARNING: Potential credential exposure detected:"
    echo ""
    for warning in "${SECURITY_WARNINGS[@]}"; do
      echo "  - $warning"
    done
    echo ""
    echo "Running an autonomous agent with these credentials set could expose"
    echo "them in logs, commit messages, or API calls."
    echo ""
    echo "See your repo's security docs for sandboxing guidance."
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted. Unset credentials or use --skip-security-check to bypass."
      exit 1
    fi
  else
    echo "No credential exposure risks detected."
  fi
  echo ""
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANDIDATE="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ -f "$CANDIDATE/package.json" || -d "$CANDIDATE/.git" ]]; then
  REPO_ROOT="$CANDIDATE"
else
  REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

PRD_FILE="$SCRIPT_DIR/prd.json"
RUN_LOG="$SCRIPT_DIR/run.log"
EVENT_LOG="$SCRIPT_DIR/events.log"
MODEL_CHECK_LOG="$SCRIPT_DIR/.model-check.log"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
FINDINGS_DIR="$SCRIPT_DIR/findings"
FIXES_DIR="$SCRIPT_DIR/fixes"
AUDIT_DIR="$REPO_ROOT/ralph-audit/audit"
ATTEMPTS_FILE="$SCRIPT_DIR/.story-attempts"
LAST_STORY_FILE="$SCRIPT_DIR/.last-story"

mkdir -p "$FIXES_DIR"
if [ ! -f "$ATTEMPTS_FILE" ]; then
  echo "{}" > "$ATTEMPTS_FILE"
fi

get_current_story() {
  if [ -f "$PRD_FILE" ]; then
    jq -r '.userStories[] | select(.passes == false) | .id' "$PRD_FILE" 2>/dev/null | head -1
  fi
}

get_story_attempts() {
  local story_id="$1"
  jq -r --arg id "$story_id" '.[$id] // 0' "$ATTEMPTS_FILE" 2>/dev/null || echo "0"
}

increment_story_attempts() {
  local story_id="$1"
  local current
  current=$(get_story_attempts "$story_id")
  local new_count=$((current + 1))
  jq --arg id "$story_id" --argjson count "$new_count" '.[$id] = $count' "$ATTEMPTS_FILE" > "$ATTEMPTS_FILE.tmp" \
    && mv "$ATTEMPTS_FILE.tmp" "$ATTEMPTS_FILE"
  echo "$new_count"
}

mark_story_skipped() {
  local story_id="$1"
  local max_attempts="$2"
  local note="Skipped: exceeded $max_attempts attempts without passing"
  jq --arg id "$story_id" --arg note "$note" '
    .userStories = [
      .userStories[]
      | if .id == $id then
          (.notes = $note) | (.passes = true) | (.skipped = true)
        else
          .
        end
    ]
  ' "$PRD_FILE" > "$PRD_FILE.tmp" && mv "$PRD_FILE.tmp" "$PRD_FILE"
  echo "Circuit breaker: Marked story $story_id as skipped after $max_attempts attempts"
}

check_circuit_breaker() {
  local story_id="$1"
  local attempts
  attempts=$(get_story_attempts "$story_id")

  if [ "$attempts" -ge "$MAX_ATTEMPTS_PER_STORY" ]; then
    echo "Circuit breaker: Story $story_id has reached max attempts ($attempts/$MAX_ATTEMPTS_PER_STORY)"
    mark_story_skipped "$story_id" "$MAX_ATTEMPTS_PER_STORY"
    return 0
  fi
  return 1
}

ts() {
  date '+%Y-%m-%dT%H:%M:%S%z'
}

log_event() {
  echo "[$(ts)] $*" >> "$EVENT_LOG"
}

get_story_title() {
  local story_id="$1"
  jq -r --arg id "$story_id" '.userStories[] | select(.id == $id) | .title' "$PRD_FILE" 2>/dev/null || true
}

get_story_description() {
  local story_id="$1"
  jq -r --arg id "$story_id" '.userStories[] | select(.id == $id) | .description' "$PRD_FILE" 2>/dev/null || true
}

get_story_notes() {
  local story_id="$1"
  jq -r --arg id "$story_id" '.userStories[] | select(.id == $id) | (.notes // "")' "$PRD_FILE" 2>/dev/null || true
}

get_story_findings_file() {
  local story_id="$1"
  jq -r --arg id "$story_id" '.userStories[] | select(.id == $id) | .findingsFile' "$PRD_FILE" 2>/dev/null || true
}

mark_story_passed() {
  local story_id="$1"
  jq --arg id "$story_id" '
    .userStories = [
      .userStories[]
      | if .id == $id then
          (.passes = true)
        else
          .
        end
    ]
  ' "$PRD_FILE" > "$PRD_FILE.tmp" && mv "$PRD_FILE.tmp" "$PRD_FILE"
}

mark_progress_checked() {
  local story_id="$1"
  if [ ! -f "$PROGRESS_FILE" ]; then
    return 0
  fi

  # Replace: - [ ] FIX-001: ...  ->  - [x] FIX-001: ...
  # macOS sed: -i ''; for Linux use: sed -i "s|^- \\[ \\] ${story_id}:|- [x] ${story_id}:|g" "$PROGRESS_FILE"
  sed -i '' "s|^- \\[ \\] ${story_id}:|- [x] ${story_id}:|g" "$PROGRESS_FILE" || true
}

# Write fix report to ralph-fix/fixes/<story_id>.md (audit-style) from findings JSON.
# Called when verification passes so fixes/ always gets a report even if the agent did not write one.
write_fix_report() {
  local story_id="$1"
  local story_title="$2"
  local findings_path="$3"
  local out_path="$4"
  local ts
  ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
  {
    printf '%s\n' "# Fix Report: ${story_id} — ${story_title}"
    printf '\n'
    printf '**Date:** %s\n' "$ts"
    printf '**Verification:** pnpm lint + pnpm test passed\n\n'
    printf '%s\n' '---'
    printf '\n## Findings addressed\n\n'
    if [ -f "$findings_path" ]; then
      jq -r '
        (.findings // [])[] |
        (.description | if type == "string" then (split("\n")[0] // "") else "" end) as $desc |
        "### [\(.severity)] Finding #\(.number): \(.title)\n\n**File:** `\(.file)`\n\n**Lines:** \(.lines)\n\n**Description:** \($desc)\n\n**Fix applied:** Addressed (verification passed).\n\n---\n"
      ' "$findings_path" 2>/dev/null || true
    fi
    printf '\n*Report generated by ralph-fix.sh after verification passed.*\n'
  } > "$out_path"
}

# Option: generate fix reports from findings JSON for all stories that already passed (e.g. after a run where the agent did not write them).
if [ "$WRITE_FIX_REPORTS_ONLY" = "true" ]; then
  mkdir -p "$FIXES_DIR"
  for story_id in $(jq -r '.userStories[] | select(.passes == true) | .id' "$PRD_FILE" 2>/dev/null); do
    story_title=$(jq -r --arg id "$story_id" '.userStories[] | select(.id == $id) | .title' "$PRD_FILE" 2>/dev/null)
    findings_file=$(jq -r --arg id "$story_id" '.userStories[] | select(.id == $id) | .findingsFile' "$PRD_FILE" 2>/dev/null)
    [ -z "$findings_file" ] || [ "$findings_file" = "null" ] && continue
    findings_path="$FINDINGS_DIR/$findings_file"
    [ ! -f "$findings_path" ] && continue
    write_fix_report "$story_id" "$story_title" "$findings_path" "$FIXES_DIR/${story_id}.md"
    echo "Wrote $FIXES_DIR/${story_id}.md"
  done
  echo "Fix reports written to $FIXES_DIR"
  exit 0
fi

# Pinned by default. Adjust as needed for your Codex access and preference.
REQUESTED_MODEL="gpt-5.2"
REASONING_EFFORT="high"

if [[ -n "${CODEX_MODEL:-}" && "${CODEX_MODEL}" != "$REQUESTED_MODEL" ]]; then
  echo "ERROR: This loop is pinned to CODEX_MODEL=$REQUESTED_MODEL. Unset CODEX_MODEL to continue."
  exit 1
fi

if [[ -n "${CODEX_REASONING_EFFORT:-}" && "${CODEX_REASONING_EFFORT}" != "$REASONING_EFFORT" ]]; then
  echo "ERROR: This loop is pinned to CODEX_REASONING_EFFORT=$REASONING_EFFORT. Unset CODEX_REASONING_EFFORT to continue."
  exit 1
fi

touch "$RUN_LOG" "$EVENT_LOG"

# Ensure findings JSON exist: run md-to-json if findings dir or manifest missing
if [ ! -f "$FINDINGS_DIR/manifest.json" ]; then
  echo "Generating findings JSON from ralph-audit/audit/*.md..."
  (cd "$REPO_ROOT" && node "$SCRIPT_DIR/scripts/md-to-json.js") || { echo "ERROR: md-to-json failed. Run: node ralph-fix/scripts/md-to-json.js"; exit 1; }
  echo ""
fi

echo "Starting Ralph Fix (OpenAI Codex)"
echo "  Max iterations: $MAX_ITERATIONS"
echo "  Max attempts per story: $MAX_ATTEMPTS_PER_STORY"
echo "  Model: $REQUESTED_MODEL (reasoning_effort=$REASONING_EFFORT)"
echo "  Verify after each story: $([ "$SKIP_VERIFY" = true ] && echo "no" || echo "pnpm lint + pnpm test")"
echo "  Logs:"
echo "    - events: $EVENT_LOG"
echo "    - full:   $RUN_LOG"
echo "  Tail:"
echo "    tail -n $TAIL_N -f $EVENT_LOG"
echo "    tail -n $TAIL_N -f $RUN_LOG"

log_event "RUN START max_iterations=$MAX_ITERATIONS max_attempts_per_story=$MAX_ATTEMPTS_PER_STORY model=$REQUESTED_MODEL reasoning_effort=$REASONING_EFFORT skip_verify=$SKIP_VERIFY"

# Preflight: verify the requested model works for current Codex auth.
MODEL_CHECK_CMD=(
  codex
  -a never
  exec
  -C "$REPO_ROOT"
  -m "$REQUESTED_MODEL"
  -c "model_reasoning_effort=\"$REASONING_EFFORT\""
  -s read-only
  "Respond with exactly: OK"
)

if ! "${MODEL_CHECK_CMD[@]}" > "$MODEL_CHECK_LOG" 2>&1; then
  echo "ERROR: Model preflight failed for '$REQUESTED_MODEL'. See: $MODEL_CHECK_LOG"
  echo "Fix options:"
  echo "  1) Re-auth with an API key that has access:"
  echo "     printenv OPENAI_API_KEY | codex login --with-api-key"
  exit 1
fi

CODEX_ARGS=(
  -a never
)

if [[ "$ENABLE_SEARCH" == "true" ]]; then
  CODEX_ARGS+=(--search)
fi

CODEX_ARGS+=(
  exec
  -C "$REPO_ROOT"
  -m "$REQUESTED_MODEL"
  -c "model_reasoning_effort=\"$REASONING_EFFORT\""
)
# Do not pass -s read-only: agent is allowed to edit files

for i in $(seq 1 "$MAX_ITERATIONS"); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Fix Iteration $i of $MAX_ITERATIONS"
  echo "==============================================================="

  echo "" >> "$RUN_LOG"
  echo "===============================================================" >> "$RUN_LOG"
  echo "Ralph Fix Iteration $i of $MAX_ITERATIONS - $(date)" >> "$RUN_LOG"
  echo "===============================================================" >> "$RUN_LOG"

  log_event "ITERATION START $i/$MAX_ITERATIONS"

  CURRENT_STORY=$(get_current_story)

  if [ -z "$CURRENT_STORY" ]; then
    log_event "RUN COMPLETE (no incomplete stories)"
    echo "No incomplete stories found."
    echo ""
    echo "Ralph fix completed all tasks!"
    echo "<promise>COMPLETE</promise>"
    exit 0
  fi

  LAST_STORY=""
  if [ -f "$LAST_STORY_FILE" ]; then
    LAST_STORY=$(cat "$LAST_STORY_FILE" 2>/dev/null || echo "")
  fi

  if [ "$CURRENT_STORY" = "$LAST_STORY" ]; then
    echo "Consecutive attempt on story: $CURRENT_STORY"
    ATTEMPTS=$(increment_story_attempts "$CURRENT_STORY")
    echo "Attempts on $CURRENT_STORY: $ATTEMPTS/$MAX_ATTEMPTS_PER_STORY"

    if check_circuit_breaker "$CURRENT_STORY"; then
      echo "Skipping to next story..."
      echo "$CURRENT_STORY" > "$LAST_STORY_FILE"
      sleep 1
      continue
    fi
  else
    ATTEMPTS=$(increment_story_attempts "$CURRENT_STORY")
    echo "Starting story: $CURRENT_STORY (attempt $ATTEMPTS/$MAX_ATTEMPTS_PER_STORY)"
  fi

  echo "$CURRENT_STORY" > "$LAST_STORY_FILE"

  FINDINGS_FILE=$(get_story_findings_file "$CURRENT_STORY")
  if [ -z "$FINDINGS_FILE" ] || [ "$FINDINGS_FILE" = "null" ]; then
    log_event "ERROR story=$CURRENT_STORY no findingsFile in prd"
    echo "ERROR: No findingsFile for $CURRENT_STORY in prd.json"
    exit 1
  fi
  FINDINGS_PATH="$FINDINGS_DIR/$FINDINGS_FILE"
  if [ ! -f "$FINDINGS_PATH" ]; then
    echo "ERROR: Findings file not found: $FINDINGS_PATH. Run: node ralph-fix/scripts/md-to-json.js"
    exit 1
  fi

  STORY_TITLE="$(get_story_title "$CURRENT_STORY")"
  STORY_DESC="$(get_story_description "$CURRENT_STORY")"
  STORY_NOTES="$(get_story_notes "$CURRENT_STORY")"

  FIX_REPORT_PATH="$FIXES_DIR/${CURRENT_STORY}.md"
  PROMPT_FILE="$SCRIPT_DIR/.prompt.md"
  {
    printf '%s\n\n' "# Ralph Fix (OpenAI Codex)"
    printf 'Today: %s\n\n' "$(date +%Y-%m-%d)"
    printf 'Story: %s — %s\n\n' "$CURRENT_STORY" "$STORY_TITLE"
    printf '%s\n' "Description:"; printf '%s\n\n' "$STORY_DESC"
    printf '%s\n' "Notes:"; printf '%s\n\n' "$STORY_NOTES"
    printf '%s\n\n' '---'
    printf '%s\n' "## Findings JSON (fix each finding in the listed files)"
    cat "$FINDINGS_PATH"
    printf '\n\n'
    printf '%s\n\n' '---'
    printf '%s\n' "## Fix report (required)"
    printf '\n\n'
    printf 'After applying fixes and before replying, write a markdown report to:\n\n'
    printf '  **%s**\n\n' "$FIX_REPORT_PATH"
    printf '%s\n\n' 'Use the same structure as the audit reports (ralph-audit/audit/*.md): for each finding you fixed, include a heading with severity and finding number, then **File**, **Lines**, **Description** (brief), and **Fix applied:** with a short summary or code snippet. This documents the implemented fixes for this story.'
    printf '%s\n\n' '---'
    cat "$SCRIPT_DIR/CODEX.md"
  } > "$PROMPT_FILE"

  log_event "STORY START id=$CURRENT_STORY attempt=$ATTEMPTS findings=$FINDINGS_FILE"

  codex "${CODEX_ARGS[@]}" < "$PROMPT_FILE" 2>&1 | tee -a "$RUN_LOG" || true

  VERIFY_OK="true"
  if [ "$SKIP_VERIFY" != "true" ]; then
    echo ""
    echo "Running verification: pnpm lint && pnpm test..."
    if (cd "$REPO_ROOT" && pnpm lint && pnpm test) >> "$RUN_LOG" 2>&1; then
      echo "Verification passed."
    else
      echo "Verification failed (lint or test). See run.log. Story not marked passed."
      VERIFY_OK="false"
      log_event "STORY VERIFY FAILED id=$CURRENT_STORY"
    fi
  fi

  if [ "$VERIFY_OK" = "true" ]; then
    mark_story_passed "$CURRENT_STORY"
    mark_progress_checked "$CURRENT_STORY"
    write_fix_report "$CURRENT_STORY" "$STORY_TITLE" "$FINDINGS_PATH" "$FIX_REPORT_PATH"
    log_event "STORY COMPLETE id=$CURRENT_STORY"
  fi

  REMAINING=$(jq -r '.userStories[] | select(.passes == false) | .id' "$PRD_FILE" 2>/dev/null | head -n 1 || true)
  if [ -z "$REMAINING" ]; then
    log_event "RUN COMPLETE (all stories passed)"
    echo ""
    echo "All fix tasks are marked passes:true."
    echo "Ralph fix completed all tasks!"
    echo "<promise>COMPLETE</promise>"
    exit 0
  fi

  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph fix reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Tail log: tail -f $RUN_LOG"
log_event "RUN STOPPED (reached max iterations without completing all tasks)"
exit 1
