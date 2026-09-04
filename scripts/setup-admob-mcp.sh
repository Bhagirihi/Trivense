#!/usr/bin/env bash
# Install & authorize AdMob MCP for Cursor (Trivense)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMOB_DIR="$ROOT/.cursor/mcp-servers/admob"
RUN_SH="$ADMOB_DIR/run.sh"

echo ""
echo "Trivense AdMob MCP setup"
echo "========================"
echo ""

mkdir -p "$ADMOB_DIR/credentials"
chmod +x "$RUN_SH"

if [[ ! -x "$ADMOB_DIR/.venv/bin/python" ]]; then
  python3 -m venv "$ADMOB_DIR/.venv"
  "$ADMOB_DIR/.venv/bin/pip" install -q -r "$ADMOB_DIR/requirements.txt"
fi

if [[ ! -f "$ADMOB_DIR/.env" ]]; then
  cp "$ADMOB_DIR/.env.example" "$ADMOB_DIR/.env"
fi

if [[ ! -f "$ADMOB_DIR/credentials/client_secret.json" ]]; then
  echo "Download OAuth Desktop JSON → $ADMOB_DIR/credentials/client_secret.json"
  open "https://console.cloud.google.com/apis/library/admob.googleapis.com?project=trivense-app-prod" 2>/dev/null || true
  open "https://console.cloud.google.com/apis/credentials?project=trivense-app-prod" 2>/dev/null || true
  read -r -p "Press Enter after client_secret.json is saved..."
fi

if [[ ! -f "$ADMOB_DIR/credentials/token.json" ]]; then
  "$RUN_SH" auth
fi

echo ""
echo "✓ AdMob MCP ready. Create units: npm run create:admob-units"
echo "✓ Restart Cursor to load new MCP tools"
echo ""
