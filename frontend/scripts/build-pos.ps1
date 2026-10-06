Set-Location (Join-Path $PSScriptRoot '..')

Write-Host "Building POS..." -ForegroundColor Cyan

Copy-Item capacitor.config.pos.json capacitor.config.json -Force
Copy-Item .env.pos .env -Force

npm run build
npx cap sync

Write-Host "POS build synced to android-pos/" -ForegroundColor Green
Write-Host ""
Write-Host "Next: npx cap open android" -ForegroundColor Yellow
