#Requires -Version 5.1
<#
.SYNOPSIS
    Stop all ForgeMind services
.DESCRIPTION
    Stops Metro, Flask, and backend. Leaves PostgreSQL running.
#>

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step { Write-Host "[>] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }

Write-Host ""
Write-Host "Stopping ForgeMind services..." -ForegroundColor Yellow
Write-Host ""

# Stop Metro (Expo/Metro bundler)
Write-Step "Stopping Metro..."
$metroCount = 0
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*@expo/cli*" -or $_.CommandLine -like "*metro*"
} | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    $metroCount++
}
if ($metroCount -gt 0) {
    Write-Success "Stopped $metroCount Metro process(es)"
} else {
    Write-Host "  No Metro processes found" -ForegroundColor Gray
}

# Stop Flask AI
Write-Step "Stopping Flask AI..."
$flaskCount = 0
Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*api.py*" -or $_.CommandLine -like "*forgemind-ai*"
} | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    $flaskCount++
}
if ($flaskCount -gt 0) {
    Write-Success "Stopped $flaskCount Flask process(es)"
} else {
    Write-Host "  No Flask processes found" -ForegroundColor Gray
}

# Stop Backend
Write-Step "Stopping backend..."
$backendCount = 0
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*forgemind-backend*"
} | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    $backendCount++
}
if ($backendCount -gt 0) {
    Write-Success "Stopped $backendCount backend process(es)"
} else {
    Write-Host "  No backend processes found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "All services stopped (PostgreSQL left running)" -ForegroundColor Green
Write-Host ""
