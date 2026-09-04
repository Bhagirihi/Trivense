#!/usr/bin/env bash
# Full Trivense QA — static + API + UI (3×) + device Maestro (3× per flow).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Ensure Maestro inherits a real JDK (jenv "system" is often broken).
if [[ -z "${JAVA_HOME:-}" || ! -x "${JAVA_HOME}/bin/java" || "${JAVA_HOME}" == *jenv*versions/system* ]]; then
  for candidate in \
    "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" \
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"; do
    if [[ -x "${candidate}/bin/java" ]]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="${JAVA_HOME}/bin:${PATH}"
fi

RUNS="${1:-3}"
FAIL=0

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; FAIL=$((FAIL + 1)); }

echo ""
echo "Trivense full QA — ${RUNS}× stability where applicable"
echo "══════════════════════════════════════════════════════"

echo ""
echo "── Static / unit ──"
if npm run qa:native-imports; then pass "Native import guard"; else fail "Native import guard"; fi
if npm test -- --runInBand --forceExit; then pass "Jest unit/UI suite"; else fail "Jest unit/UI suite"; fi

echo ""
echo "── UI modules (${RUNS}× each) ──"
if node scripts/run-ui-qa.js; then pass "UI module stability (3×)"; else fail "UI module stability (3×)"; fi

echo ""
echo "── Board sharing API (${RUNS}×) ──"
BS_OK=0
for i in $(seq 1 "$RUNS"); do
  if node scripts/qa-board-sharing.js >/dev/null 2>&1; then
    BS_OK=$((BS_OK + 1))
    echo "  ✓ board-sharing run ${i}/${RUNS}"
  else
    echo "  ✗ board-sharing run ${i}/${RUNS}"
  fi
done
if [[ "$BS_OK" -eq "$RUNS" ]]; then pass "Board sharing API ${RUNS}/${RUNS}"; else fail "Board sharing API ${BS_OK}/${RUNS}"; fi

echo ""
echo "── Preflight ──"
if node scripts/qa-preflight.js; then pass "Release preflight"; else fail "Release preflight (check expo-doctor / config)"; fi

echo ""
echo "── Device Maestro (${RUNS}× per flow) ──"
if command -v adb >/dev/null 2>&1 && [[ "$(adb devices 2>/dev/null | awk 'NR>1 && $2=="device" { c++ } END { print c+0 }')" -ge 1 ]]; then
  if bash scripts/run-maestro-stability.sh "$RUNS"; then
    pass "Maestro device flows ${RUNS}×"
  else
    fail "Maestro device flows ${RUNS}×"
  fi
else
  echo "○ Skipped — no Android device (adb devices empty)"
  echo "  Reconnect device, start Metro, then: npm run qa:stability"
fi

echo ""
echo "══════════════════════════════════════════════════════"
if [[ "$FAIL" -eq 0 ]]; then
  echo "✅ Full QA passed"
  exit 0
fi
echo "❌ Full QA finished with ${FAIL} failure(s)"
exit 1
