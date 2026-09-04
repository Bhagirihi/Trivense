#!/usr/bin/env bash
# Run Maestro UI tests on a connected Android device (Trivense).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SUITE="${1:-smoke}"
MAESTRO_BIN="${MAESTRO_BIN:-maestro}"
EVIDENCE_DIR="${ROOT}/.qa/maestro-$(date +%Y%m%d-%H%M%S)"

# Maestro inherits broken jenv JAVA_HOME from the shell; resolve JDK 17 explicitly.
if [[ -d "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]]; then
  export JAVA_HOME="/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
elif [[ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
elif command -v /usr/libexec/java_home >/dev/null 2>&1; then
  export JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home 2>/dev/null || true)"
fi

export QA_EMAIL="${QA_EMAIL:-alice@trivense-demo.local}"
export QA_PASSWORD="${QA_PASSWORD:-TrivenseDemo123!}"

bash scripts/qa-maestro-preflight.sh
mkdir -p "$EVIDENCE_DIR"

run_flow() {
  local flow="$1"
  local name
  name="$(basename "$flow" .yaml)"
  echo ""
  echo "▶ Running $name …"
  if ! "$MAESTRO_BIN" test \
    --format NOOP \
    --flatten-debug-output \
    --debug-output "${EVIDENCE_DIR}/debug" \
    -e "QA_EMAIL=${QA_EMAIL}" \
    -e "QA_PASSWORD=${QA_PASSWORD}" \
    "$flow"; then
    echo "✗ $name"
    return 1
  fi
  echo "✓ $name"
}

GUEST_FLOWS=(
  e2e/maestro/01-login-smoke.yaml
  e2e/maestro/02-login-register-nav.yaml
  e2e/maestro/03-register-login-nav.yaml
  e2e/maestro/04-register-validation.yaml
  e2e/maestro/05-forgot-password-nav.yaml
)

AUTH_FLOWS=(
  e2e/maestro/06-login-session.yaml
  e2e/maestro/07-dashboard.yaml
  e2e/maestro/08-analytics-tab.yaml
  e2e/maestro/09-settings-tab.yaml
  e2e/maestro/10-footer-navigation.yaml
  e2e/maestro/11-logout.yaml
  e2e/maestro/12-visual-regression.yaml
  e2e/maestro/13-expense-search-and-validation.yaml
)

ALL_FLOWS=("${GUEST_FLOWS[@]}" "${AUTH_FLOWS[@]}")

FAIL=0

case "$SUITE" in
  smoke)
    run_flow e2e/maestro/01-login-smoke.yaml || FAIL=$((FAIL + 1))
    ;;
  guest)
    for flow in "${GUEST_FLOWS[@]}"; do
      run_flow "$flow" || FAIL=$((FAIL + 1))
    done
    ;;
  auth)
    for flow in "${AUTH_FLOWS[@]}"; do
      run_flow "$flow" || FAIL=$((FAIL + 1))
    done
    ;;
  all)
    for flow in "${ALL_FLOWS[@]}"; do
      run_flow "$flow" || FAIL=$((FAIL + 1))
    done
    ;;
  full)
    bash scripts/run-maestro-stability.sh 1
    exit 0
    ;;
  *)
    if [[ -f "$SUITE" ]]; then
      run_flow "$SUITE" || FAIL=$((FAIL + 1))
    else
      echo "Usage: $0 [smoke|guest|auth|all|full|<flow.yaml>]" >&2
      exit 1
    fi
    ;;
esac

echo ""
echo "Evidence: $EVIDENCE_DIR"
if [[ "$FAIL" -gt 0 ]]; then
  echo "✗ Device QA suite '$SUITE' finished with $FAIL failure(s)"
  exit 1
fi
echo "✓ Device QA suite '$SUITE' finished"
