Set-Location (Join-Path $PSScriptRoot '..')

Write-Host "Building WAITER..." -ForegroundColor Cyan

Copy-Item capacitor.config.waiter.json capacitor.config.json -Force
Copy-Item .env.waiter .env -Force

npm run build
npx cap sync

Write-Host "Waiter build synced to android-waiter/" -ForegroundColor Green
Write-Host ""
Write-Host "Next: npx cap open android" -ForegroundColor Yellow
