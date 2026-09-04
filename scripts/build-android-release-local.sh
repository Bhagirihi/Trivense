#!/usr/bin/env bash
# Local EAS production AAB — bypasses EAS cloud quota.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for candidate in \
  "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" \
  "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"; do
  if [[ -x "$candidate/bin/java" ]]; then
    export JAVA_HOME="$candidate"
    break
  fi
done

for candidate in \
  "/usr/local/share/android-commandlinetools" \
  "/opt/homebrew/share/android-commandlinetools" \
  "$HOME/Library/Android/sdk"; do
  if [[ -d "$candidate/platform-tools" ]]; then
    export ANDROID_HOME="$candidate"
    break
  fi
done

if [[ -z "${JAVA_HOME:-}" || ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "✗ JDK 17 required: brew install openjdk@17" >&2
  exit 1
fi

if [[ -z "${ANDROID_HOME:-}" ]]; then
  echo "✗ Android SDK required: brew install --cask android-commandlinetools" >&2
  exit 1
fi

export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > "$ROOT/android/local.properties"

# Load local secrets for the bundle step.
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [[ -z "${SENTRY_AUTH_TOKEN:-}" ]]; then
  export SENTRY_DISABLE_AUTO_UPLOAD=true
fi

echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"
echo ""
echo "→ Building production AAB locally…"
npx eas-cli build --platform android --profile production --local --non-interactive "$@"
