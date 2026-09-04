#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

resolve_java_home() {
  if [[ -n "${JAVA_HOME:-}" && -d "$JAVA_HOME" && -x "$JAVA_HOME/bin/java" ]]; then
    echo "$JAVA_HOME"
    return
  fi

  if command -v jenv >/dev/null 2>&1; then
    local jenv_home
    jenv_home="$(jenv prefix 2>/dev/null || true)"
    if [[ -n "$jenv_home" && -d "$jenv_home" ]]; then
      echo "$jenv_home"
      return
    fi
  fi

  if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    /usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home 2>/dev/null
    return
  fi

  for candidate in \
    "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" \
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"; do
    if [[ -d "$candidate" ]]; then
      echo "$candidate"
      return
    fi
  done

  echo "Could not resolve JAVA_HOME. Install JDK 17 (brew install openjdk@17)." >&2
  exit 1
}

resolve_android_home() {
  if [[ -n "${ANDROID_HOME:-}" && -d "$ANDROID_HOME/platform-tools" ]]; then
    echo "$ANDROID_HOME"
    return
  fi

  for candidate in \
    "/usr/local/share/android-commandlinetools" \
    "/opt/homebrew/share/android-commandlinetools" \
    "$HOME/Library/Android/sdk"; do
    if [[ -d "$candidate/platform-tools" || -d "$candidate/cmdline-tools" ]]; then
      echo "$candidate"
      return
    fi
  done

  echo "Could not resolve ANDROID_HOME. Install Android command-line tools." >&2
  exit 1
}

export JAVA_HOME="$(resolve_java_home)"
export ANDROID_HOME="$(resolve_android_home)"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

LOCAL_PROPS="$ROOT/android/local.properties"
mkdir -p "$(dirname "$LOCAL_PROPS")"
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > "$LOCAL_PROPS"

if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  return 0 2>/dev/null || exit 0
fi

cd "$ROOT"
exec npx expo run:android "$@"
