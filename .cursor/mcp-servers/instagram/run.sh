#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV_PY="$ROOT/.venv/bin/python"
SERVER="$ROOT/server.py"
ENV_FILE="$ROOT/.env"

if [[ ! -x "$VENV_PY" ]]; then
  python3 -m venv "$ROOT/.venv"
  "$ROOT/.venv/bin/pip" install -q -r "$ROOT/requirements.txt"
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ "${1:-}" == "run-due" ]]; then
  shift
  exec "$VENV_PY" "$SERVER" --run-due "$@"
fi

if [[ -z "${INSTAGRAM_USERNAME:-}" || -z "${INSTAGRAM_PASSWORD:-}" ]]; then
  echo "instagram-mcp: set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD in .cursor/mcp-servers/instagram/.env" >&2
  exit 1
fi

exec "$VENV_PY" "$SERVER"
