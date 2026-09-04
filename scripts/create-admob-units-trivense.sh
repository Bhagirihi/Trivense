#!/usr/bin/env bash
# Create Trivense AdMob ad units (Banner, Interstitial, App open) via API or guide manual setup.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMOB_DIR="$ROOT/.cursor/mcp-servers/admob"
RUN_SH="$ADMOB_DIR/run.sh"

echo ""
echo "Trivense AdMob — create ad units"
echo "================================="
echo ""

if [[ ! -x "$RUN_SH" ]]; then
  chmod +x "$RUN_SH"
fi

if [[ ! -f "$ADMOB_DIR/credentials/client_secret.json" ]]; then
  echo "Missing OAuth credentials."
  echo "  1. Enable AdMob API on Google Cloud (trivense-app-prod)"
  echo "  2. Create OAuth Desktop client → download JSON"
  echo "  3. Save as: $ADMOB_DIR/credentials/client_secret.json"
  echo ""
  mkdir -p "$ADMOB_DIR/credentials"
  open "https://console.cloud.google.com/apis/credentials?project=trivense-app-prod" 2>/dev/null || true
  open "https://admob.google.com/v2/apps/5149530682/adunits/list" 2>/dev/null || true
  exit 1
fi

if [[ ! -f "$ADMOB_DIR/credentials/token.json" ]]; then
  echo "→ Running OAuth (browser will open)..."
  "$RUN_SH" auth
fi

echo "→ Creating Trivense ad units..."
"$RUN_SH" --create-trivense-units 2>/dev/null || "$ADMOB_DIR/.venv/bin/python" "$ADMOB_DIR/server.py" --create-trivense-units

echo ""
echo "Done. Verify: npm run admob:check"
echo ""
