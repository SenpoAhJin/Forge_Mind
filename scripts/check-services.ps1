#Requires -Version 5.1
<#
.SYNOPSIS
    Check ForgeMind services status
.DESCRIPTION
    Verifies Tailscale IP, listening ports, health endpoints, and Metro status
#>

$ErrorActionPreference = "Continue"

function Write-Check { Write-Host "[>] $args" -ForegroundColor Cyan }
function Write-Pass { Write-Host "  [OK] $args" -ForegroundColor Green }
function Write-Fail { Write-Host "  [X] $args" -ForegroundColor Red }
function Write-Info { Write-Host "  [i] $args" -ForegroundColor Yellow }

Write-Host ""
Write-Host "---------------------------------------------------" -ForegroundColor Magenta
Write-Host "  ForgeMind Services Self-Check" -ForegroundColor Magenta
Write-Host "---------------------------------------------------" -ForegroundColor Magenta
Write-Host ""

# -----------------------------------------------------------------------------
# 1. Tailscale
# -----------------------------------------------------------------------------
Write-Check "Tailscale Status"
try {
    $tailscaleIP = & tailscale ip -4 2>&1
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($tailscaleIP)) {
        Write-Pass "Connected: $tailscaleIP"
        $tsIP = $tailscaleIP.Trim()
    } else {
        Write-Fail "Not signed in or no IPv4 address"
        $tsIP = $null
    }
} catch {
    Write-Fail "Tailscale not installed or not in PATH"
    $tsIP = $null
}
Write-Host ""

# -----------------------------------------------------------------------------
# 2. Listening Ports
# -----------------------------------------------------------------------------
Write-Check "Listening Ports"

$portsToCheck = @(
    @{Port=3000; Name="Backend (Express)"; Address="0.0.0.0"},
    @{Port=5000; Name="Flask AI"; Address="0.0.0.0"},
    @{Port=8081; Name="Metro"; Address=$tsIP},
    @{Port=5432; Name="PostgreSQL"; Address="127.0.0.1"}
)

foreach ($portInfo in $portsToCheck) {
    $port = $portInfo.Port
    $name = $portInfo.Name
    $expectedAddr = $portInfo.Address
    
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
        $localAddr = $listener.LocalAddress
        if ($localAddr -eq "0.0.0.0" -or $localAddr -eq "::" -or $localAddr -eq $expectedAddr -or $localAddr -eq "127.0.0.1") {
            Write-Pass "$name listening on $localAddr`:$port"
        } else {
            Write-Info "$name listening on $localAddr`:$port (expected $expectedAddr)"
        }
    } else {
        Write-Fail "$name NOT listening on port $port"
    }
}
Write-Host ""

# -----------------------------------------------------------------------------
# 3. Health Endpoints
# -----------------------------------------------------------------------------
Write-Check "Health Endpoints"

# Backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $body = $response.Content | ConvertFrom-Json
        Write-Pass "Backend: $($body.status) (version $($body.version))"
    }
} catch {
    Write-Fail "Backend: $($_.Exception.Message)"
}

# Flask
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $body = $response.Content | ConvertFrom-Json
        Write-Pass "Flask: $($body.status) (service: $($body.service))"
    }
} catch {
    Write-Fail "Flask: $($_.Exception.Message)"
}
Write-Host ""

# -----------------------------------------------------------------------------
# 4. Firewall Rules
# -----------------------------------------------------------------------------
Write-Check "Firewall Rules (Tailscale scope)"

$firewallRules = @("ForgeMind-Backend-3000", "ForgeMind-Metro-8081")
foreach ($ruleName in $firewallRules) {
    $rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($rule) {
        $enabled = $rule.Enabled
        if ($enabled -eq "True") {
            Write-Pass "$ruleName is active"
        } else {
            Write-Info "$ruleName exists but is disabled"
        }
    } else {
        Write-Fail "$ruleName not found"
    }
}
Write-Host ""

# -----------------------------------------------------------------------------
# 5. Expo Go Instructions
# -----------------------------------------------------------------------------
if ($tsIP) {
    Write-Host "---------------------------------------------------" -ForegroundColor Magenta
    Write-Host "  Expo Go URL" -ForegroundColor Magenta
    Write-Host "---------------------------------------------------" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "  On your phone (Tailscale connected, Wi-Fi off):" -ForegroundColor Cyan
    Write-Host "  1. Open Expo Go" -ForegroundColor White
    Write-Host "  2. Tap 'Enter URL manually'" -ForegroundColor White
    Write-Host "  3. Type: " -NoNewline -ForegroundColor White
    Write-Host "exp://${tsIP}:8081" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Test backend access from phone browser:" -ForegroundColor Cyan
    Write-Host "    http://${tsIP}:3000/health" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Cannot provide Expo URL (Tailscale not connected)" -ForegroundColor Red
    Write-Host ""
}
