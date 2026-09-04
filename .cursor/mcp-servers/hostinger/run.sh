#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$ROOT/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${HOSTINGER_API_TOKEN:-}" && -z "${API_TOKEN:-}" ]]; then
  echo "hostinger-mcp: set HOSTINGER_API_TOKEN in .cursor/mcp-servers/hostinger/.env" >&2
  echo "hostinger-mcp: or run 'npx hostinger-api-mcp --login' once for OAuth" >&2
  exit 1
fi

exec npx -y hostinger-api-mcp@0.2.14
