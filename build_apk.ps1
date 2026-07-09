$ErrorActionPreference = "Stop"
Write-Host "Setting JAVA_HOME..."
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'

Write-Host "Building web assets..."
npm run build

Write-Host "Syncing with Capacitor..."
npx cap sync android

Write-Host "Building Android Debug APK..."
cd android
.\gradlew.bat assembleDebug

Write-Host "Copying APK to the root folder..."
Copy-Item "app\build\outputs\apk\debug\app-debug.apk" -Destination "..\..\epraja-debug.apk" -Force

Write-Host "APK Build finished successfully! The APK is named epraja-debug.apk in the scratch directory."
