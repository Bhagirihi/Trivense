#!/usr/bin/env bash
# Trivense → Google Play Open Testing (beta track).
# Requires: Play Console app + API credentials + EAS account.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLAY_DIR="$ROOT/.cursor/mcp-servers/google-play"
SA_SRC="$PLAY_DIR/credentials/service_account.json"
SA_EAS="$ROOT/google-play-service-account.json"

cd "$ROOT"

echo ""
echo "Trivense → Play Open Testing"
echo "============================"

# ── 1. Credentials ──────────────────────────────────────────────────────────
if [[ ! -f "$SA_SRC" ]]; then
  echo "✗ Missing Play API credentials: $SA_SRC"
  echo "  Run: bash scripts/setup-google-play-api.sh"
  exit 1
fi

cp "$SA_SRC" "$SA_EAS"
echo "✓ Service account linked for EAS submit"

# ── 2. Sync production env to EAS (Sentry, AdMob, Firebase, etc.) ───────────
if [[ -f "$ROOT/.env" ]]; then
  echo ""
  echo "→ Pushing .env → EAS production environment…"
  node scripts/sync-eas-production-env.js
  echo "✓ EAS production env synced"
else
  echo "○ No .env — ensure EAS production has all EXPO_PUBLIC_* vars"
fi

# ── 3. Pre-release QA ───────────────────────────────────────────────────────
echo ""
echo "→ Running pre-release QA…"
npm run qa:preflight || {
  echo "○ QA reported issues — review above; continuing with build"
}

# ── 4. Play API: listing + subscriptions ────────────────────────────────────
echo ""
echo "→ Pushing store listing + subscriptions…"
(
  cd "$PLAY_DIR"
  if [[ -d .venv ]]; then source .venv/bin/activate; fi
  export $(grep -v '^#' .env 2>/dev/null | xargs)
  python3 - <<'PY'
import json
from play_client import full_trivense_setup

result = full_trivense_setup(activate_subscriptions=True)
print(json.dumps(result, indent=2))
if result.get("status") == "blocked":
    raise SystemExit(1)
PY
)

# ── 5. EAS production AAB build ─────────────────────────────────────────────
echo ""
echo "→ Starting EAS production AAB build…"
npx eas-cli build --platform android --profile production --non-interactive

# ── 6. Submit to Open Testing (beta track) ──────────────────────────────────
echo ""
echo "→ Submitting latest build to Open Testing (beta)…"
if [[ -n "${1:-}" && -f "$1" ]]; then
  npx eas-cli submit --platform android --profile production --path "$1" --non-interactive
else
  npx eas-cli submit --platform android --profile production --latest --non-interactive
fi

echo ""
echo "Done. Review rollout in Play Console → Open testing."
echo "https://play.google.com/console/u/3/developers/5766759369200444867/app/4976093803059142709/tracks/open-testing"
