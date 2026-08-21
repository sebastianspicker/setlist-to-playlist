#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Cleaning local artifacts in $ROOT_DIR"

# OS/editor artifacts
find . -name ".DS_Store" -type f -delete || true
find . -name "Thumbs.db" -type f -delete || true

# Known local runtime logs
rm -rf docs/audit docs/fixes reports || true
rm -f report.json diagnostics*.json support-report*.json || true

# Build/test caches (safe to regenerate)
rm -rf \
  apps/web/.next \
  apps/web/tsconfig.tsbuildinfo \
  apps/web/coverage \
  packages/api/dist \
  packages/api/coverage \
  packages/core/dist \
  packages/core/coverage \
  packages/shared/dist \
  packages/shared/coverage \
  packages/ui/coverage \
  coverage \
  test-results \
  blob-report || true

echo "Cleanup complete."
