$ErrorActionPreference = "Stop"
Write-Host "Setting JAVA_HOME..."
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'

Write-Host "Building Android App Bundle (AAB)..."
cd android
.\gradlew.bat bundleRelease

Write-Host "Build finished! Check android/app/build/outputs/bundle/release/"
