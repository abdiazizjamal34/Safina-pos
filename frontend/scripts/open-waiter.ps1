@'
Set-Location (Join-Path $PSScriptRoot '..')
Copy-Item capacitor.config.waiter.json capacitor.config.json -Force
Write-Host "Opening Waiter Android project..." -ForegroundColor Cyan
npx cap open android
'@ | Out-File -Encoding utf8 scripts\open-waiter.ps1