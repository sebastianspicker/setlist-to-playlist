# Implemented Fixes (audit-style)

This directory holds one markdown report per fix story after it passes verification. The agent writes `FIX-001.md`, `FIX-002.md`, … in the **same structure as the audit reports** (`ralph-audit/audit/*.md`):

- For each finding fixed: heading with severity and finding number
- **File**, **Lines**, **Description** (brief), **Fix applied:** (summary or code snippet)

Reports are created by the Ralph fix loop when Codex completes a story and before the story is marked passed.
