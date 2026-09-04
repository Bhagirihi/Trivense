#!/usr/bin/env bash
# Submit latest/local AAB to Play Open Testing (beta track).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SA_SRC="$ROOT/.cursor/mcp-servers/google-play/credentials/service_account.json"
SA_EAS="$ROOT/google-play-service-account.json"

if [[ ! -f "$SA_SRC" ]]; then
  echo "✗ Missing Play API credentials: $SA_SRC" >&2
  exit 1
fi
cp -f "$SA_SRC" "$SA_EAS" 2>/dev/null || true

if [[ -n "${1:-}" && -f "$1" ]]; then
  AAB="$1"
  echo "→ Submitting $AAB to Open Testing…"
  npx eas-cli submit --platform android --profile production --path "$AAB" --non-interactive
else
  echo "→ Submitting latest EAS build to Open Testing…"
  npx eas-cli submit --platform android --profile production --latest --non-interactive
fi

echo ""
echo "→ Pushing release notes to Open Testing track…"
if [[ -d "$ROOT/.cursor/mcp-servers/google-play/.venv" ]]; then
  source "$ROOT/.cursor/mcp-servers/google-play/.venv/bin/activate"
fi
python3 "$ROOT/scripts/push-play-release-notes.py" --track beta \
  --en "$ROOT/store-assets/play/RELEASE_NOTES_OPEN_TESTING.md" \
  --hi "$ROOT/store-assets/play/RELEASE_NOTES_OPEN_TESTING_HI.md" || {
  echo "○ Release notes push failed — add them manually in Play Console"
}

echo ""
echo "Open testing: https://play.google.com/console/u/3/developers/5766759369200444867/app/4976093803059142709/tracks/open-testing"
