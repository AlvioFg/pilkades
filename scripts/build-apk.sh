#!/usr/bin/env bash
#
# Build APK Android dengan environment yang benar.
#
# Masalah yang solved oleh script ini:
#  1. JAVA_HOME harus versi Windows (C:\...), bukan POSIX (/c/...),
#     kalau tidak Gradle gagal:
#        "The filename, directory name, or volume label syntax is incorrect"
#  2. Capacitor 8 dikompilasi dengan source release 21 -> butuh JDK 21.
#     JDK 17 gagal dengan "error: invalid source release: 21".
#  3. android/local.properties butuh escaping backslash ganda untuk Windows.
#
# Jalankan:  bash scripts/build-apk.sh [debug|release]

set -euo pipefail

VARIANT="${1:-debug}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ---- Cari JDK 21 -------------------------------------------------------
find_jdk21() {
  local candidates=(
    "${JDK21_HOME:-}"
    "$HOME/AppData/Local/jdk21/jdk-21.0.13+9"
    "$HOME/AppData/Local/jdk21"
    "/c/Program Files/Microsoft/jdk-21.0.13.21-hotspot"
    "/c/Program Files/Microsoft"
  )
  for c in "${candidates[@]}"; do
    [ -n "$c" ] || continue
    # Kalau yang diberi adalah folder induk, cari subfolder jdk-21* di dalamnya.
    if [ -d "$c" ] && [ ! -x "$c/bin/java.exe" ]; then
      for sub in "$c"/jdk-21*; do
        [ -x "$sub/bin/java.exe" ] || continue
        if "$sub/bin/java" -version 2>&1 | head -1 | grep -qE '"(2[1-9]|[3-9][0-9])'; then
          echo "$sub"
          return 0
        fi
      done
      continue
    fi
    if [ -x "$c/bin/java.exe" ] || [ -x "$c/bin/java" ]; then
      # pastikan benar-benar 21+
      if "$c/bin/java" -version 2>&1 | head -1 | grep -qE '"(2[1-9]|[3-9][0-9])'; then
        echo "$c"
        return 0
      fi
    fi
  done
  return 1
}

JDK="$(find_jdk21 || true)"
if [ -z "$JDK" ]; then
  echo "ERROR: JDK 21 tidak ditemukan."
  echo ""
  echo "Pasang JDK 21, lalu set JDK21_HOME, contoh:"
  echo "  export JDK21_HOME='C:\\Users\\<kamu>\\AppData\\Local\\jdk21\\jdk-21.0.13+9'"
  echo ""
  echo "atau download dari https://adoptium.net/temurin/releases/?version=21"
  exit 1
fi

# Windows-style path (backslash) - JANGAN pakai /c/... di sini.
if [[ "$JDK" == /* ]]; then
  WIN_JDK="$(printf '%s' "$JDK" | sed 's|^/c/|C:/|')"
else
  WIN_JDK="$JDK"
fi

SDK="${ANDROID_HOME:-$HOME/AppData/Local/Android/Sdk}"
if [[ "$SDK" == /* ]]; then
  WIN_SDK="$(printf '%s' "$SDK" | sed 's|^/c/|C:/|')"
else
  WIN_SDK="$SDK"
fi

if [ ! -d "$SDK" ]; then
  echo "ERROR: Android SDK tidak ditemukan di $SDK"
  echo "Set ANDROID_HOME, lalu install: sdkmanager \"platform-tools\" \"platforms;android-36\" \"build-tools;36.0.0\""
  exit 1
fi

export JAVA_HOME="$WIN_JDK"
export ANDROID_HOME="$WIN_SDK"
export PATH="$JAVA_HOME/bin:$PATH"

echo "JAVA_HOME   = $JAVA_HOME"
"$JAVA_HOME/bin/java" -version 2>&1 | head -1
echo "ANDROID_HOME = $ANDROID_HOME"
echo ""

# local.properties dengan escaping yang benar
node scripts/write-local-properties.mjs

echo ""
echo "== Build web =="
npm run build

echo ""
echo "== Sync Capacitor =="
npx cap sync android

echo ""
echo "== Build APK ($VARIANT) =="
cd android
if [ "$VARIANT" = "release" ]; then
  ./gradlew assembleRelease --no-daemon
else
  ./gradlew assembleDebug --no-daemon
fi

APK="app/build/outputs/apk/$VARIANT/app-$VARIANT.apk"
echo ""
echo "=============================================="
if [ -f "$APK" ]; then
  echo "APK BERHASIL:"
  echo "  $(cd "$(dirname "$APK")" && pwd)/$(basename "$APK")"
  ls -lh "$APK" | awk '{print "  Ukuran: " $5}'
else
  echo "APK tidak ditemukan di $APK"
fi
echo "=============================================="
