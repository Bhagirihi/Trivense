#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$ROOT/../../.." && pwd)"
RASOI_MOBILE="$REPO_ROOT/rasoi_mobile"

# Avoid pglite log permission errors when Cursor launches MCP without a shell cwd.
export PGLITE_DEBUG_LOG="${PGLITE_DEBUG_LOG:-$ROOT/pglite-debug.log}"

exec npx -y firebase-tools@latest experimental:mcp \
  --dir "$RASOI_MOBILE"
