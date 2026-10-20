#Requires -Version 5.1
<#
.SYNOPSIS
    Start ForgeMind stack for remote testing via Tailscale
.DESCRIPTION
    Starts Postgres, backend, Flask AI, and Metro in order with health checks.
    Binds Metro to Tailscale IP for phone access via Expo Go.
    
    Trigger phrase: FORGE AWAKE
#>

param(
    [switch]$SkipHealthChecks,
    [int]$HealthCheckTimeout = 60
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Colors for output
function Write-Step { Write-Host "[>] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[!] $args" -ForegroundColor Yellow }
function Write-Fail { Write-Host "[X] $args" -ForegroundColor Red }

# Project paths
$SCRIPT_DIR = $PSScriptRoot
$MOBILE = Split-Path -Parent $SCRIPT_DIR
$ROOT = Split-Path -Parent $MOBILE
$BACKEND = Join-Path $ROOT "forgemind-backend"
$FLASK = Join-Path $ROOT "forgemind-ai"
$LOGS = Join-Path $MOBILE "logs"

# Create logs directory
if (-not (Test-Path $LOGS)) {
    New-Item -ItemType Directory -Path $LOGS -Force | Out-Null
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host "  ForgeMind Stack Startup" -ForegroundColor Magenta
Write-Host "  Trigger Phrase: FORGE AWAKE" -ForegroundColor Magenta
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host ""

# Kill existing services first
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "python","pythonw" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# -------------------------------------------------------------------------
# 1. Tailscale Check
# -------------------------------------------------------------------------
Write-Step "Checking Tailscale status..."

try {
    $tailscaleStatus = & tailscale status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Tailscale is not signed in."
        Write-Host "  Please sign in with: tailscale up"
        exit 1
    }
    
    $tailscaleIP = & tailscale ip -4
    if ([string]::IsNullOrWhiteSpace($tailscaleIP)) {
        Write-Fail "Could not get Tailscale IPv4 address"
        exit 1
    }
    
    Write-Success "Tailscale connected: $tailscaleIP"
} catch {
    Write-Fail "Tailscale not installed or not in PATH"
    Write-Host "  Install with: winget install tailscale.tailscale"
    exit 1
}

# -------------------------------------------------------------------------
# 2. PostgreSQL
# -------------------------------------------------------------------------
Write-Step "Checking PostgreSQL service..."

$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $pgService) {
    Write-Fail "PostgreSQL service not found"
    exit 1
}

if ($pgService.Status -ne "Running") {
    Write-Warn "PostgreSQL is not running. Starting..."
    Start-Service -Name $pgService.Name
    Start-Sleep -Seconds 2
    $pgService.Refresh()
}

if ($pgService.Status -eq "Running") {
    Write-Success "PostgreSQL is running ($($pgService.Name))"
} else {
    Write-Fail "Failed to start PostgreSQL"
    exit 1
}

# -------------------------------------------------------------------------
# 3. Backend (Node/Express on port 3000)
# -------------------------------------------------------------------------
Write-Step "Starting forgemind-backend..."

if (-not (Test-Path "$BACKEND\.env")) {
    Write-Fail "$BACKEND\.env not found"
    exit 1
}

$backendOutLog = Join-Path $LOGS "backend-out.log"
$backendErrLog = Join-Path $LOGS "backend-err.log"

$backendProc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$BACKEND'; npm start" `
    -WorkingDirectory $BACKEND `
    -RedirectStandardOutput $backendOutLog `
    -RedirectStandardError $backendErrLog `
    -WindowStyle Hidden `
    -PassThru

Write-Success "Backend started (PID: $($backendProc.Id), logs: logs\backend-*.log)"

# Health check
if (-not $SkipHealthChecks) {
    Write-Step "Waiting for backend health check..."
    $elapsed = 0
    $healthy = $false
    while ($elapsed -lt $HealthCheckTimeout) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {
            # Continue waiting
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
    
    if ($healthy) {
        Write-Success "Backend is healthy (http://localhost:3000/health)"
    } else {
        Write-Fail "Backend health check timed out after $HealthCheckTimeout seconds"
        Write-Host "  Check logs\backend-err.log for errors"
        exit 1
    }
}

# -------------------------------------------------------------------------
# 4. Flask AI (port 5000, local only)
# -------------------------------------------------------------------------
Write-Step "Starting forgemind-ai (Flask)..."

if (-not (Test-Path "$FLASK\.venv\Scripts\python.exe")) {
    Write-Fail "Flask venv not found at $FLASK\.venv"
    Write-Host "  Run: cd forgemind-ai ; python -m venv .venv ; .venv\Scripts\pip install -r requirements.txt"
    exit 1
}

$flaskOutLog = Join-Path $LOGS "flask-out.log"
$flaskErrLog = Join-Path $LOGS "flask-err.log"

$flaskProc = Start-Process -FilePath "$FLASK\.venv\Scripts\python.exe" `
    -ArgumentList "src\api.py" `
    -WorkingDirectory $FLASK `
    -RedirectStandardOutput $flaskOutLog `
    -RedirectStandardError $flaskErrLog `
    -WindowStyle Hidden `
    -PassThru

Write-Success "Flask started (PID: $($flaskProc.Id), logs: logs\flask-*.log)"

# Health check
if (-not $SkipHealthChecks) {
    Write-Step "Waiting for Flask health check..."
    $elapsed = 0
    $healthy = $false
    while ($elapsed -lt $HealthCheckTimeout) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {
            # Continue waiting
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
    
    if ($healthy) {
        Write-Success "Flask is healthy (http://localhost:5000/health)"
    } else {
        Write-Fail "Flask health check timed out after $HealthCheckTimeout seconds"
        Write-Host "  Check logs\flask-err.log for errors"
        exit 1
    }
}

# -------------------------------------------------------------------------
# 5. Metro Bundler (Expo, bound to Tailscale IP)
# -------------------------------------------------------------------------
Write-Step "Starting Metro on Tailscale IP..."

$metroOutLog = Join-Path $LOGS "metro-out.log"
$metroErrLog = Join-Path $LOGS "metro-err.log"

# Set Tailscale IP as Metro hostname so phone can reach it
$metroProc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "`$env:REACT_NATIVE_PACKAGER_HOSTNAME='$tailscaleIP'; Set-Location '$MOBILE'; npx expo start --clear" `
    -WorkingDirectory $MOBILE `
    -RedirectStandardOutput $metroOutLog `
    -RedirectStandardError $metroErrLog `
    -WindowStyle Hidden `
    -PassThru

Write-Success "Metro started (PID: $($metroProc.Id), logs: logs\metro-*.log)"
Write-Success "Metro bound to $tailscaleIP (via REACT_NATIVE_PACKAGER_HOSTNAME)"

# Wait for Metro to bind
if (-not $SkipHealthChecks) {
    Write-Step "Waiting for Metro to start..."
    Start-Sleep -Seconds 10
    
    $elapsed = 0
    $metroHealthy = $false
    while ($elapsed -lt $HealthCheckTimeout) {
        try {
            $response = Invoke-WebRequest -Uri "http://$tailscaleIP:8081" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $metroHealthy = $true
                break
            }
        } catch {
            # Continue waiting
        }
        Start-Sleep -Seconds 3
        $elapsed += 3
    }
    
    if ($metroHealthy) {
        Write-Success "Metro is running (http://$tailscaleIP:8081)"
    } else {
        Write-Warn "Metro health check timed out (may still be starting)"
        Write-Host "  Check logs\metro-err.log if bundle fails to load"
    }
}

# -------------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host "  All services started successfully" -ForegroundColor Magenta
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Tailscale IP:       " -NoNewline; Write-Host $tailscaleIP -ForegroundColor Yellow
Write-Host "Backend:            http://localhost:3000 (binds 0.0.0.0)" -ForegroundColor Gray
Write-Host "Backend (Tailscale): http://$tailscaleIP:3000/health" -ForegroundColor Gray
Write-Host "Flask AI:           http://localhost:5000 (binds 127.0.0.1)" -ForegroundColor Gray
Write-Host "Metro:              http://$tailscaleIP:8081" -ForegroundColor Gray
Write-Host ""
Write-Host "Phone Instructions:" -ForegroundColor Cyan
Write-Host "  1. Install Tailscale on your phone and sign in" -ForegroundColor White
Write-Host "  2. Turn off Wi-Fi (cellular only)" -ForegroundColor White
Write-Host "  3. Open Expo Go > Enter URL manually" -ForegroundColor White
Write-Host "  4. Type: " -NoNewline -ForegroundColor White
Write-Host "exp://$tailscaleIP:8081" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run self-check:     .\scripts\check-services.ps1" -ForegroundColor Cyan
Write-Host "Stop all:           .\scripts\stop-all.ps1 or say 'forge sleep'" -ForegroundColor Cyan
Write-Host ""
