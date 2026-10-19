#Requires -Version 5.1
<#
.SYNOPSIS
    Start ForgeMind stack for remote testing via Tailscale
.DESCRIPTION
    Starts Postgres, backend, Flask AI, and Metro in order with health checks.
    Binds Metro to Tailscale IP for phone access via Expo Go.
#>

param(
    [switch]$SkipHealthChecks,
    [int]$HealthCheckTimeout = 30
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

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  ForgeMind Stack Startup (Tailscale Mode)" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. Tailscale Check
# ─────────────────────────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────────────────────────
# 2. PostgreSQL
# ─────────────────────────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────────────────────────
# 3. Backend (Node/Express on port 3000)
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "Starting forgemind-backend..."

if (-not (Test-Path "$BACKEND\.env")) {
    Write-Fail "$BACKEND\.env not found"
    exit 1
}

# Kill existing backend processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*forgemind-backend*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Push-Location $BACKEND
try {
    $backendOutLog = Join-Path $BACKEND "backend_out.log"
    $backendErrLog = Join-Path $BACKEND "backend_err.log"
    
    # Start backend as background job
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:BACKEND
        npm start 2>&1 | Tee-Object -FilePath (Join-Path $using:BACKEND "backend.log")
    }
    
    Write-Success "Backend started (Job ID: $($backendJob.Id), log: backend.log)"
} finally {
    Pop-Location
}

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
        Write-Warn "Backend health check timed out (check backend.log)"
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. Flask AI (port 5000, local only)
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "Starting forgemind-ai (Flask)..."

if (-not (Test-Path "$FLASK\.venv\Scripts\python.exe")) {
    Write-Fail "Flask venv not found at $FLASK\.venv"
    Write-Host "  Run: cd forgemind-ai ; python -m venv .venv ; .venv\Scripts\pip install -r requirements.txt"
    exit 1
}

# Kill existing Flask processes
Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*api.py*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Push-Location $FLASK
try {
    $flaskJob = Start-Job -ScriptBlock {
        Set-Location $using:FLASK
        & ".venv\Scripts\python.exe" "src\api.py" 2>&1 | Tee-Object -FilePath (Join-Path $using:FLASK "flask.log")
    }
    
    Write-Success "Flask started (Job ID: $($flaskJob.Id), log: flask.log)"
} finally {
    Pop-Location
}

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
        Write-Warn "Flask health check timed out (check api_err.log)"
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# 5. Metro Bundler (Expo, bound to Tailscale IP)
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "Starting Metro on Tailscale IP..."

# Kill existing Metro processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*@expo/cli*" -or $_.CommandLine -like "*metro*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Push-Location $MOBILE
try {
    # Set Tailscale IP as Metro hostname so phone can reach it
    $metroJob = Start-Job -ScriptBlock {
        Set-Location $using:MOBILE
        $env:REACT_NATIVE_PACKAGER_HOSTNAME = $using:tailscaleIP
        npx expo start --clear 2>&1 | Tee-Object -FilePath (Join-Path $using:MOBILE "metro.log")
    }
    
    Write-Success "Metro started (Job ID: $($metroJob.Id), log: metro.log)"
    Write-Success "Metro bound to $tailscaleIP (via REACT_NATIVE_PACKAGER_HOSTNAME)"
} finally {
    Pop-Location
}

# Wait a bit for Metro to bind
Start-Sleep -Seconds 5

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  All services started" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "Tailscale IP:       " -NoNewline; Write-Host $tailscaleIP -ForegroundColor Yellow
Write-Host "Backend:            http://localhost:3000 (binds 0.0.0.0)" -ForegroundColor Gray
Write-Host "Flask AI:           http://localhost:5000 (binds 0.0.0.0, local-only via firewall)" -ForegroundColor Gray
Write-Host "Metro:              http://${tailscaleIP}:8081 (bound to Tailscale)" -ForegroundColor Gray
Write-Host ""
Write-Host "Phone Instructions:" -ForegroundColor Cyan
Write-Host "  1. Install Tailscale on your phone and sign in" -ForegroundColor White
Write-Host "  2. Turn off Wi-Fi (cellular only)" -ForegroundColor White
Write-Host "  3. Open Expo Go > Enter URL manually" -ForegroundColor White
Write-Host "  4. Type: " -NoNewline -ForegroundColor White
Write-Host "exp://${tailscaleIP}:8081" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run self-check:     .\scripts\check-services.ps1" -ForegroundColor Cyan
Write-Host "Stop all:           .\scripts\stop-all.ps1" -ForegroundColor Cyan
Write-Host ""
