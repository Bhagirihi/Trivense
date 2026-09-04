#!/usr/bin/env bash
# Export local instagram_session.json as a GitHub Actions secret.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SESSION="$ROOT/instagram_session.json"

if [[ ! -f "$SESSION" ]]; then
  echo "Missing ${SESSION}"
  echo "Log in locally first:"
  echo "  cd .cursor/mcp-servers/instagram && ./run.sh"
  echo "  # or use instagram_account_status in Cursor MCP"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required."
  echo "Manual upload: base64 < ${SESSION}"
  exit 1
fi

# Single-line base64 avoids decode issues in Actions.
base64 < "$SESSION" | tr -d '\n' | gh secret set INSTAGRAM_SESSION_JSON
echo "Uploaded INSTAGRAM_SESSION_JSON to GitHub repository secrets."
