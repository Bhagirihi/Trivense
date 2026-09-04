#!/usr/bin/env bash
# Preflight checks before Maestro device QA.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "❌ $1" >&2
  exit 1
}

# jenv often points at an invalid JAVA_HOME; Maestro needs Java 17+
resolve_java_home() {
  if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" && -d "${JAVA_HOME}" ]]; then
    case "${JAVA_HOME}" in
      *jenv*versions/system*) ;;
      *) echo "$JAVA_HOME"; return ;;
    esac
  fi
  for candidate in \
    "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" \
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"; do
    if [[ -x "${candidate}/bin/java" ]]; then
      echo "$candidate"
      return
    fi
  done
  if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    /usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home 2>/dev/null || true
  fi
}
export JAVA_HOME="$(resolve_java_home)"
export PATH="${JAVA_HOME}/bin:${PATH}"

if [[ -z "${MAESTRO_BIN:-}" && -x "${HOME}/.maestro/bin/maestro" ]]; then
  export MAESTRO_BIN="${HOME}/.maestro/bin/maestro"
fi

ok() {
  echo "✓ $1"
}

command -v adb >/dev/null 2>&1 || fail "adb not found. Install Android platform-tools."

DEVICE_COUNT="$(adb devices 2>/dev/null | awk 'NR>1 && $2=="device" { c++ } END { print c+0 }')"
[[ "$DEVICE_COUNT" -ge 1 ]] || fail "No Android device connected. Run: adb devices"
ok "Android device connected ($DEVICE_COUNT)"

MAESTRO_BIN="${MAESTRO_BIN:-maestro}"
command -v "$MAESTRO_BIN" >/dev/null 2>&1 || fail "Maestro CLI not found. Install: curl -Ls https://get.maestro.mobile.dev | bash"
ok "Maestro CLI ($("$MAESTRO_BIN" --version 2>/dev/null | head -1))"

APP_ID="${TRIVENSE_APP_ID:-com.trivense.app}"
adb shell pm path "$APP_ID" >/dev/null 2>&1 || fail "App $APP_ID not installed. Run: npm run android"
ok "App installed ($APP_ID)"

if curl -sf --max-time 3 "http://localhost:8081/status" >/dev/null 2>&1; then
  adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
  ok "Metro running (adb reverse tcp:8081)"
else
  echo "⚠ Metro not running — start: npm start"
fi

export QA_EMAIL="${QA_EMAIL:-alice@trivense-demo.local}"
export QA_PASSWORD="${QA_PASSWORD:-TrivenseDemo123!}"
ok "QA credentials configured (${QA_EMAIL})"

echo ""
echo "Preflight passed."
