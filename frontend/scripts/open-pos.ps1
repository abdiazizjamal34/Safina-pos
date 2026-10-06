@'
Set-Location (Join-Path $PSScriptRoot '..')
Copy-Item capacitor.config.pos.json capacitor.config.json -Force
Write-Host "Opening POS Android project..." -ForegroundColor Cyan
npx cap open android
'@ | Out-File -Encoding utf8 scripts\open-pos.ps1