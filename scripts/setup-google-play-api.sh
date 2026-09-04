#!/usr/bin/env bash
# One-time Google Play API credential setup for Trivense.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRED_DIR="$ROOT/.cursor/mcp-servers/google-play/credentials"
SA_FILE="$CRED_DIR/service_account.json"

echo ""
echo "Google Play API — one-time setup"
echo "================================="
echo ""
echo "Account: my.website.email2@gmail.com"
echo "Developer: Bhagihiri Applications"
echo "App: Trivense (com.trivense.app)"
echo ""

mkdir -p "$CRED_DIR"

if [[ -f "$SA_FILE" ]]; then
  echo "✓ Service account already exists: $SA_FILE"
  exit 0
fi

cat <<'STEPS'

Follow these steps (≈10 minutes):

1. Google Cloud Console
   https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com
   → Enable "Google Play Android Developer API"

2. Create service account
   https://console.cloud.google.com/iam-admin/serviceaccounts
   → Create service account (name: play-console-trivense)
   → Keys → Add key → JSON → download

3. Save the JSON file as:
   .cursor/mcp-servers/google-play/credentials/service_account.json

4. Play Console → Users and permissions → Invite new users
   https://play.google.com/console/u/3/developers/5766759369200444867/users-and-permissions
   → Paste service account email (from JSON: client_email)
   → Permissions (minimum):
     • View app information and download bulk reports
     • Manage store presence
     • Manage orders and subscriptions
     • Release apps to testing tracks
     • View financial data

5. RevenueCat → Project Settings → Google Play
   https://app.revenuecat.com/projects/proj2d578859
   → Upload the same JSON (Service credentials)

6. Run full internal testing setup:
   npm run setup:play

OAuth alternative (no service account file):
   • Create OAuth Desktop client in Google Cloud Console
   • Save as .cursor/mcp-servers/google-play/credentials/client_secret.json
   • Set PLAY_AUTH_MODE=oauth in .cursor/mcp-servers/google-play/.env
   • Run: .cursor/mcp-servers/google-play/run.sh auth

STEPS

# Open helpful URLs
open "https://console.cloud.google.com/iam-admin/serviceaccounts" 2>/dev/null || true
open "https://play.google.com/console/u/3/developers/5766759369200444867/users-and-permissions" 2>/dev/null || true
