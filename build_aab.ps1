$ErrorActionPreference = "Stop"
Write-Host "Setting JAVA_HOME..."
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'

Write-Host "Installing dependencies..."
npm install

Write-Host "Building web assets..."
npm run build

Write-Host "Syncing with Capacitor..."
npx cap sync android

Write-Host "Building Android Release AAB..."
cd android
.\gradlew.bat clean bundleRelease

Write-Host "Copying AAB to the target folder..."
Copy-Item "app\build\outputs\bundle\release\app-release.aab" -Destination "..\..\apk-output\epraja-RELEASE.aab" -Force

Write-Host "AAB Build finished successfully!"
