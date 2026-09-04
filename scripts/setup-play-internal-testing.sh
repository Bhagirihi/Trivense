#!/usr/bin/env bash
# Full Google Play internal-testing setup for Trivense.
# Requires: Play Console app exists + API credentials (see step 1).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLAY_DIR="$ROOT/.cursor/mcp-servers/google-play"
SA_SRC="$PLAY_DIR/credentials/service_account.json"
SA_EAS="$ROOT/google-play-service-account.json"

cd "$ROOT"

echo ""
echo "Trivense → Play Internal Testing"
echo "================================="

# ── 1. Credentials ──────────────────────────────────────────────────────────
if [[ ! -f "$SA_SRC" ]]; then
  echo ""
  echo "✗ Missing Play API credentials: $SA_SRC"
  echo ""
  echo "One-time setup (5 min):"
  echo "  1. Google Cloud Console → enable 'Google Play Android Developer API'"
  echo "  2. IAM → Service Accounts → Create → download JSON key"
  echo "  3. Play Console → Users and permissions → Invite service account email"
  echo "     Permissions: Manage store presence, Manage orders and subscriptions,"
  echo "                 View financial data, Release to testing tracks"
  echo "  4. Save JSON as: $SA_SRC"
  echo ""
  echo "OAuth alternative:"
  echo "  Save OAuth desktop client as $PLAY_DIR/credentials/client_secret.json"
  echo "  Set PLAY_AUTH_MODE=oauth in $PLAY_DIR/.env"
  echo "  Run: $PLAY_DIR/run.sh auth"
  echo ""
  exit 1
fi

cp "$SA_SRC" "$SA_EAS"
echo "✓ Service account linked for EAS submit → google-play-service-account.json"

# ── 2. Play API: listing + worldwide subscriptions ────────────────────────
echo ""
echo "→ Pushing store listing + creating subscriptions (worldwide pricing)…"
(
  cd "$PLAY_DIR"
  if [[ -d .venv ]]; then source .venv/bin/activate; fi
  export $(grep -v '^#' .env | xargs)
  python3 - <<'PY'
import json
import os
from play_client import full_trivense_setup

result = full_trivense_setup(activate_subscriptions=True)
print(json.dumps(result, indent=2))
if result.get("status") == "blocked":
    raise SystemExit(1)
PY
)

# ── 3. EAS production build ─────────────────────────────────────────────────
echo ""
echo "→ Starting EAS production AAB build…"
npx eas-cli build --platform android --profile production --non-interactive

echo ""
echo "→ Submitting latest build to internal testing track…"
if [[ -n "${1:-}" && -f "$1" ]]; then
  npx eas-cli submit --platform android --profile production --path "$1" --non-interactive
else
  npx eas-cli submit --platform android --profile production --latest --non-interactive
fi

echo ""
echo "Done. Open Play Console → Internal testing to add testers and review."
echo "https://play.google.com/console/u/3/developers/5766759369200444867/app/4976093803059142709/tracks/internal-testing"
