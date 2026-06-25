$ErrorActionPreference = "Stop"
Write-Host "Starting build process for Marketplace App..."

# 1. Install dependencies
Write-Host "Running npm install..."
npm install

# 2. Build the web assets
Write-Host "Running npm run build..."
npm run build

# 3. Sync with Capacitor
Write-Host "Syncing Android project with Capacitor..."
npx cap sync android

# 4. Build the Android AAB
Write-Host "Building Android App Bundle (AAB)..."
cd android
.\gradlew.bat bundleRelease

Write-Host "Build finished! Check android/app/build/outputs/bundle/release/app-release-unsigned.aab or app-release.aab"
