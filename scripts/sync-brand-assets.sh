#!/usr/bin/env bash
# Regenerate Trivense brand PNGs from the canonical UI icon.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.venv-brand"

if [[ ! -f "$ROOT/UI/icon.png" ]]; then
  echo "Missing $ROOT/UI/icon.png" >&2
  exit 1
fi

if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q Pillow
fi

"$VENV/bin/python" "$ROOT/scripts/generate-brand-assets.py"

if command -v sips >/dev/null 2>&1; then
  sips -z 512 512 "$ROOT/assets/icon.png" --out "$ROOT/store-assets/play/app_icon_512.png" >/dev/null 2>&1 || true
fi

if [[ -d "$ROOT/website/public" ]]; then
  cp "$ROOT/assets/icon.png" "$ROOT/website/public/logo.png"
fi

echo "✓ Brand assets regenerated from UI/icon.png"
