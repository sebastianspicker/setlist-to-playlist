#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Cleaning local artifacts in $ROOT_DIR"

# OS/editor artifacts
find . -name ".DS_Store" -type f -delete || true
find . -name "Thumbs.db" -type f -delete || true

# Known local runtime logs
rm -f docs/audit/run.log docs/audit/events.log docs/fixes/run.log docs/fixes/events.log || true

# Build/test caches (safe to regenerate)
rm -rf apps/web/.next apps/api/dist packages/core/dist packages/shared/dist coverage .turbo || true

echo "Cleanup complete."
