$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Jdk = Join-Path $env:LOCALAPPDATA 'jdk21\jdk-21.0.13+9'
if (-not (Test-Path (Join-Path $Jdk 'bin\java.exe'))) {
    Write-Error "JDK 21 tidak ditemukan di $Jdk"
}

$env:JAVA_HOME = $Jdk
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "JAVA_HOME = $env:JAVA_HOME"
& "$env:JAVA_HOME\bin\java.exe" -version

node scripts/write-local-properties.mjs
npm run build
npx cap sync android
Set-Location android
& .\gradlew.bat assembleDebug --no-daemon

$Apk = 'app\build\outputs\apk\debug\app-debug.apk'
if (Test-Path $Apk) {
    $dest = Join-Path $Root 'Simulasi-Pilkades-v1.0.apk'
    Copy-Item $Apk $dest -Force
    Write-Host "APK: $dest"
} else {
    Write-Error "APK tidak ditemukan"
}
