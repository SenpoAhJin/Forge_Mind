#Requires -Version 5.1
<#
.SYNOPSIS
    Stop all ForgeMind services
.DESCRIPTION
    Stops Metro, Flask, and backend. Leaves PostgreSQL running.
    Trigger phrase: "rest"
#>

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

# Detect if launched from profile shortcut
$LaunchedFromShortcut = $MyInvocation.Line -match "arise|rest"

# Check if running as Administrator, if not re-launch
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Elevating to Administrator..." -ForegroundColor Yellow
    $scriptPath = $MyInvocation.MyCommand.Path
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
    
    if ($LaunchedFromShortcut) {
        # Launch elevated, wait for completion, then show results
        $process = Start-Process powershell -Verb RunAs -ArgumentList $arguments -PassThru -Wait
        
        # Read and display the log
        $SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
        $MOBILE = Split-Path -Parent $SCRIPT_DIR
        $logPath = Join-Path $MOBILE "logs\last-run.txt"
        if (Test-Path $logPath) {
            Get-Content $logPath
        }
    } else {
        Start-Process powershell -Verb RunAs -ArgumentList $arguments
    }
    exit
}

function Write-Step { Write-Host "[>] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }

# Project paths
$SCRIPT_DIR = $PSScriptRoot
$MOBILE = Split-Path -Parent $SCRIPT_DIR
$LOGS = Join-Path $MOBILE "logs"

# Create logs directory if needed
if (-not (Test-Path $LOGS)) {
    New-Item -ItemType Directory -Path $LOGS -Force | Out-Null
}

# Start transcript for full run log
$runLogPath = Join-Path $LOGS "last-run.txt"
Start-Transcript -Path $runLogPath -Force | Out-Null

Write-Host ""
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host "  ForgeMind Stack Shutdown" -ForegroundColor Magenta
Write-Host "  Trigger: 'rest'" -ForegroundColor Magenta
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host ""

# Stop processes by port (3000, 5000, 8081)
Write-Step "Freeing ports 3000, 5000, 8081..."
$portsToFree = @(3000, 5000, 8081)
$killedCount = 0

foreach ($port in $portsToFree) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        try {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Killing PID $procId ($($proc.Name)) on port $port" -ForegroundColor Gray
                Stop-Process -Id $procId -Force -ErrorAction Stop
                $killedCount++
            }
        } catch {
            Write-Host "  Warning: Could not kill PID $procId on port $port" -ForegroundColor Yellow
        }
    }
}

if ($killedCount -gt 0) {
    Write-Success "Freed $killedCount port(s)"
} else {
    Write-Host "  All ports already free" -ForegroundColor Gray
}

# Stop PowerShell jobs
Write-Step "Stopping PowerShell jobs..."
$jobs = @(Get-Job | Where-Object { $_.State -eq "Running" })
if ($jobs.Count -gt 0) {
    $jobs | Stop-Job
    $jobs | Remove-Job -Force
    Write-Success "Stopped $($jobs.Count) job(s)"
} else {
    Write-Host "  No running jobs found" -ForegroundColor Gray
}

# Stop node processes (backend, Metro)
Write-Step "Stopping Node processes..."
$nodeProcs = @(Get-Process -Name "node" -ErrorAction SilentlyContinue)
if ($nodeProcs.Count -gt 0) {
    $nodeProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Success "Stopped $($nodeProcs.Count) Node process(es)"
} else {
    Write-Host "  No Node processes found" -ForegroundColor Gray
}

# Stop Python processes (Flask)
Write-Step "Stopping Python processes..."
$pythonProcs = @(Get-Process -Name "python","pythonw" -ErrorAction SilentlyContinue)
if ($pythonProcs.Count -gt 0) {
    $pythonProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Success "Stopped $($pythonProcs.Count) Python process(es)"
} else {
    Write-Host "  No Python processes found" -ForegroundColor Gray
}

# Verify ports are free
Write-Host ""
Write-Step "Verifying ports are free..."
$stillBusy = @()
foreach ($port in $portsToFree) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($listener) {
        $stillBusy += $port
        Write-Host "  Port $port still busy" -ForegroundColor Red
    } else {
        Write-Host "  Port $port free" -ForegroundColor Green
    }
}

Write-Host ""
if ($stillBusy.Count -eq 0) {
    Write-Host "All services stopped (PostgreSQL left running)" -ForegroundColor Green
    Write-Host "Ports 3000, 5000, 8081 confirmed free" -ForegroundColor Green
} else {
    Write-Host "Services stopped but some ports still busy: $($stillBusy -join ', ')" -ForegroundColor Yellow
}
Write-Host ""

Stop-Transcript | Out-Null

if (-not $LaunchedFromShortcut) {
    Read-Host "Press Enter to close"
}
