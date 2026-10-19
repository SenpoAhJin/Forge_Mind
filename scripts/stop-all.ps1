#Requires -Version 5.1
<#
.SYNOPSIS
    Stop all ForgeMind services
.DESCRIPTION
    Stops Metro, Flask, and backend. Leaves PostgreSQL running.
#>

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

function Write-Step { Write-Host "[>] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }

Write-Host ""
Write-Host "Stopping ForgeMind services..." -ForegroundColor Yellow
Write-Host ""

# Stop PowerShell jobs
Write-Step "Stopping PowerShell jobs..."
$jobs = Get-Job | Where-Object { $_.State -eq "Running" }
if ($jobs) {
    $jobs | Stop-Job
    $jobs | Remove-Job -Force
    Write-Success "Stopped $($jobs.Count) job(s)"
} else {
    Write-Host "  No running jobs found" -ForegroundColor Gray
}

# Stop node processes (backend, Metro)
Write-Step "Stopping Node processes..."
$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcs) {
    $nodeProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Success "Stopped $($nodeProcs.Count) Node process(es)"
} else {
    Write-Host "  No Node processes found" -ForegroundColor Gray
}

# Stop Python processes (Flask)
Write-Step "Stopping Python processes..."
$pythonProcs = Get-Process -Name "python","pythonw" -ErrorAction SilentlyContinue
if ($pythonProcs) {
    $pythonProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Success "Stopped $($pythonProcs.Count) Python process(es)"
} else {
    Write-Host "  No Python processes found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "All services stopped (PostgreSQL left running)" -ForegroundColor Green
Write-Host ""
