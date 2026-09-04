#!/usr/bin/env bash
# Run every Maestro flow N times (default 3) — all must pass every run.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RUNS="${1:-3}"
EVIDENCE_DIR="${ROOT}/.qa/stability-${RUNS}x-$(date +%Y%m%d-%H%M%S)"

export QA_EMAIL="${QA_EMAIL:-alice@trivense-demo.local}"
export QA_PASSWORD="${QA_PASSWORD:-TrivenseDemo123!}"

# jenv often leaves an invalid JAVA_HOME; Maestro needs a real JDK 17+.
# Preflight runs in a subshell, so resolve + export here so maestro inherits it.
resolve_java_home() {
  if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" && -d "${JAVA_HOME}" ]]; then
    # Reject broken jenv placeholders
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
MAESTRO_BIN="${MAESTRO_BIN:-maestro}"

bash scripts/qa-maestro-preflight.sh
mkdir -p "$EVIDENCE_DIR"

FLOWS=(
  e2e/maestro/01-login-smoke.yaml
  e2e/maestro/02-login-register-nav.yaml
  e2e/maestro/03-register-login-nav.yaml
  e2e/maestro/04-register-validation.yaml
  e2e/maestro/05-forgot-password-nav.yaml
  e2e/maestro/06-login-session.yaml
  e2e/maestro/07-dashboard.yaml
  e2e/maestro/08-analytics-tab.yaml
  e2e/maestro/09-settings-tab.yaml
  e2e/maestro/10-footer-navigation.yaml
  e2e/maestro/11-logout.yaml
)

TOTAL_FAIL=0

echo ""
echo "Trivense Maestro stability — ${RUNS}× per flow"
echo "════════════════════════════════════════════"

for flow in "${FLOWS[@]}"; do
  name="$(basename "$flow" .yaml)"
  passed=0
  echo ""
  echo "── $name ──"
  for run in $(seq 1 "$RUNS"); do
    if "$MAESTRO_BIN" test \
      --format NOOP \
      --flatten-debug-output \
      --debug-output "${EVIDENCE_DIR}/debug" \
      -e "QA_EMAIL=${QA_EMAIL}" \
      -e "QA_PASSWORD=${QA_PASSWORD}" \
      "$flow" >/dev/null 2>&1; then
      passed=$((passed + 1))
      echo "  ✓ run ${run}/${RUNS}"
    else
      TOTAL_FAIL=$((TOTAL_FAIL + 1))
      echo "  ✗ run ${run}/${RUNS} FAILED"
      "$MAESTRO_BIN" test \
        -e "QA_EMAIL=${QA_EMAIL}" \
        -e "QA_PASSWORD=${QA_PASSWORD}" \
        "$flow" 2>&1 | tail -20 || true
    fi
  done
  if [[ "$passed" -eq "$RUNS" ]]; then
    echo "→ ${name}: ${passed}/${RUNS} stable ✅"
  else
    echo "→ ${name}: ${passed}/${RUNS} UNSTABLE ❌"
  fi
done

echo ""
echo "Evidence: $EVIDENCE_DIR"

if [[ "$TOTAL_FAIL" -gt 0 ]]; then
  echo "❌ Stability failed: ${TOTAL_FAIL} run(s) failed"
  exit 1
fi

echo "✅ All flows passed ${RUNS}/${RUNS} runs"
