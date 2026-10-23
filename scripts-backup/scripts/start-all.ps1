#Requires -Version 5.1
<#
.SYNOPSIS
    Start ForgeMind stack for remote testing via Tailscale
.DESCRIPTION
    Starts Postgres, backend, Flask AI, and Metro in order.
    All services are started first, then health checks run at the end.
    
    Trigger phrase: "arise"
    Stop phrase: "rest"
#>

param(
    [switch]$SkipHealthChecks
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Check if running as Administrator, if not re-launch
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Elevating to Administrator..." -ForegroundColor Yellow
    $scriptPath = $MyInvocation.MyCommand.Path
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
    if ($SkipHealthChecks) {
        $arguments += " -SkipHealthChecks"
    }
    Start-Process powershell -Verb RunAs -ArgumentList $arguments
    exit
}

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
Write-Host "  Trigger: 'arise'  |  Stop: 'rest'" -ForegroundColor Magenta
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host ""

# -------------------------------------------------------------------------
# 0. Kill stale processes and free ports
# -------------------------------------------------------------------------
Write-Step "Freeing ports 3000, 5000, 8081..."

$portsToFree = @(3000, 5000, 8081)
$killedCount = 0

foreach ($port in $portsToFree) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $pid = $conn.OwningProcess
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Killing PID $pid ($($proc.Name)) on port $port" -ForegroundColor Gray
                Stop-Process -Id $pid -Force -ErrorAction Stop
                $killedCount++
            }
        } catch {
            Write-Warn "Could not kill PID $pid on port $port (may already be dead)"
        }
    }
}

if ($killedCount -gt 0) {
    Write-Success "Freed $killedCount port(s)"
    Start-Sleep -Seconds 2
} else {
    Write-Host "  All ports already free" -ForegroundColor Gray
}

# Also kill any stray node/python processes
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
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    $tailscaleIP = (& tailscale ip -4).Trim()
    if ([string]::IsNullOrWhiteSpace($tailscaleIP)) {
        Write-Warn "Could not get Tailscale IPv4 address, falling back to LAN IP"
        
        # Fallback to LAN IP
        $lanIP = Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp,Manual -ErrorAction SilentlyContinue | 
                 Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } | 
                 Select-Object -First 1 -ExpandProperty IPAddress
        
        if ($lanIP) {
            $tailscaleIP = $lanIP
            Write-Warn "Using LAN IP: $tailscaleIP (Tailscale unavailable)"
        } else {
            Write-Fail "Could not determine IP address"
            Read-Host "Press Enter to exit"
            exit 1
        }
    } else {
        Write-Success "Tailscale connected: $tailscaleIP"
    }
} catch {
    Write-Fail "Tailscale not installed or not in PATH"
    Write-Host "  Install with: winget install tailscale.tailscale"
    Read-Host "Press Enter to exit"
    exit 1
}

# -------------------------------------------------------------------------
# 2. PostgreSQL
# -------------------------------------------------------------------------
Write-Step "Checking PostgreSQL service..."

$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $pgService) {
    Write-Fail "PostgreSQL service not found"
    Read-Host "Press Enter to exit"
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
    Read-Host "Press Enter to exit"
    exit 1
}

# -------------------------------------------------------------------------
# 3. Start all services (no health checks yet)
# -------------------------------------------------------------------------

# Backend
Write-Step "Starting forgemind-backend..."

if (-not (Test-Path "$BACKEND\.env")) {
    Write-Fail "$BACKEND\.env not found"
    Read-Host "Press Enter to exit"
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

Write-Success "Backend started (PID: $($backendProc.Id))"

# Flask
Write-Step "Starting forgemind-ai (Flask)..."

if (-not (Test-Path "$FLASK\.venv\Scripts\python.exe")) {
    Write-Fail "Flask venv not found at $FLASK\.venv"
    Write-Host "  Run: cd forgemind-ai ; python -m venv .venv ; .venv\Scripts\pip install -r requirements.txt"
    Read-Host "Press Enter to exit"
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

Write-Success "Flask started (PID: $($flaskProc.Id))"

# Metro
Write-Step "Starting Metro on $tailscaleIP..."

$metroOutLog = Join-Path $LOGS "metro-out.log"
$metroErrLog = Join-Path $LOGS "metro-err.log"

$metroProc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "`$env:REACT_NATIVE_PACKAGER_HOSTNAME='$tailscaleIP'; Set-Location '$MOBILE'; npx expo start --clear" `
    -WorkingDirectory $MOBILE `
    -RedirectStandardOutput $metroOutLog `
    -RedirectStandardError $metroErrLog `
    -WindowStyle Hidden `
    -PassThru

Write-Success "Metro started (PID: $($metroProc.Id))"

# -------------------------------------------------------------------------
# 4. Health checks (after all services started)
# -------------------------------------------------------------------------

if (-not $SkipHealthChecks) {
    Write-Host ""
    Write-Step "Waiting for services to initialize (15 seconds)..."
    Start-Sleep -Seconds 15
    
    Write-Host ""
    Write-Step "Health checks:"
    
    # Backend
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  Backend:  " -NoNewline -ForegroundColor White
            Write-Host "UP" -ForegroundColor Green -NoNewline
            Write-Host "  (logs\backend-*.log)" -ForegroundColor Gray
        } else {
            Write-Host "  Backend:  " -NoNewline -ForegroundColor White
            Write-Host "DOWN (HTTP $($response.StatusCode))" -ForegroundColor Red -NoNewline
            Write-Host "  (logs\backend-err.log)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  Backend:  " -NoNewline -ForegroundColor White
        Write-Host "DOWN (not responding)" -ForegroundColor Red -NoNewline
        Write-Host "  (logs\backend-err.log)" -ForegroundColor Gray
    }
    
    # Flask
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  Flask:    " -NoNewline -ForegroundColor White
            Write-Host "UP" -ForegroundColor Green -NoNewline
            Write-Host "  (logs\flask-*.log)" -ForegroundColor Gray
        } else {
            Write-Host "  Flask:    " -NoNewline -ForegroundColor White
            Write-Host "DOWN (HTTP $($response.StatusCode))" -ForegroundColor Red -NoNewline
            Write-Host "  (logs\flask-err.log)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  Flask:    " -NoNewline -ForegroundColor White
        Write-Host "DOWN (not responding)" -ForegroundColor Red -NoNewline
        Write-Host "  (logs\flask-err.log)" -ForegroundColor Gray
    }
    
    # Metro
    try {
        $response = Invoke-WebRequest -Uri "http://$tailscaleIP:8081" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  Metro:    " -NoNewline -ForegroundColor White
            Write-Host "UP" -ForegroundColor Green -NoNewline
            Write-Host "  (logs\metro-*.log)" -ForegroundColor Gray
        } else {
            Write-Host "  Metro:    " -NoNewline -ForegroundColor White
            Write-Host "DOWN (HTTP $($response.StatusCode))" -ForegroundColor Red -NoNewline
            Write-Host "  (logs\metro-err.log)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  Metro:    " -NoNewline -ForegroundColor White
        Write-Host "DOWN (still starting)" -ForegroundColor Yellow -NoNewline
        Write-Host "  (logs\metro-err.log)" -ForegroundColor Gray
    }
}

# -------------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host "  All services started" -ForegroundColor Magenta
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Phone Instructions:" -ForegroundColor Cyan
Write-Host "  1. Install Tailscale on your phone and sign in" -ForegroundColor White
Write-Host "  2. Turn off Wi-Fi (cellular only)" -ForegroundColor White
Write-Host "  3. Open Expo Go > Enter URL manually" -ForegroundColor White
Write-Host "  4. Type: " -NoNewline -ForegroundColor White
Write-Host "exp://$tailscaleIP:8081" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test from phone browser:" -ForegroundColor Cyan
Write-Host "  http://$tailscaleIP:3000/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run check:  " -NoNewline -ForegroundColor Cyan
Write-Host ".\scripts\check-services.ps1" -ForegroundColor White
Write-Host "Stop:       " -NoNewline -ForegroundColor Cyan
Write-Host ".\scripts\stop-all.ps1 or say 'rest'" -ForegroundColor White
Write-Host ""

if (-not $isAdmin) {
    Read-Host "Press Enter to close"
}
