#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Configure Windows Firewall for ForgeMind remote testing
.DESCRIPTION
    Creates inbound rules for ports 3000 and 8081, scoped to Tailscale range 100.64.0.0/10 ONLY.
    Flask (5000) remains local-only (no rule created).
    
    MUST BE RUN AS ADMINISTRATOR
#>

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step { Write-Host "▶ $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Warn { Write-Host "⚠ $args" -ForegroundColor Yellow }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  ForgeMind Firewall Setup (Tailscale scope)" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# Tailscale CGNAT range: 100.64.0.0/10
$TAILSCALE_RANGE = "100.64.0.0/10"

# ─────────────────────────────────────────────────────────────────────────────
# Rule 1: Backend (port 3000)
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "Configuring firewall rule for Backend (port 3000)..."

$ruleName = "ForgeMind-Backend-3000"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Warn "Rule '$ruleName' already exists. Removing..."
    Remove-NetFirewallRule -DisplayName $ruleName
}

New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 3000 `
    -RemoteAddress $TAILSCALE_RANGE `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allow ForgeMind backend access from Tailscale network only" | Out-Null

Write-Success "Created rule: $ruleName (scope: $TAILSCALE_RANGE)"

# ─────────────────────────────────────────────────────────────────────────────
# Rule 2: Metro (port 8081)
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "Configuring firewall rule for Metro (port 8081)..."

$ruleName = "ForgeMind-Metro-8081"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Warn "Rule '$ruleName' already exists. Removing..."
    Remove-NetFirewallRule -DisplayName $ruleName
}

New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 8081 `
    -RemoteAddress $TAILSCALE_RANGE `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allow Metro bundler access from Tailscale network only" | Out-Null

Write-Success "Created rule: $ruleName (scope: $TAILSCALE_RANGE)"

# ─────────────────────────────────────────────────────────────────────────────
# Flask remains local-only (no firewall rule)
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Flask AI (port 5000):" -ForegroundColor Cyan
Write-Host "  No firewall rule created (local-only, called by backend)" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  Firewall configuration complete" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "Ports opened to Tailscale network ($TAILSCALE_RANGE):" -ForegroundColor Green
Write-Host "  • 3000 (Backend)" -ForegroundColor White
Write-Host "  • 8081 (Metro)" -ForegroundColor White
Write-Host ""
Write-Host "Verify rules:" -ForegroundColor Cyan
Write-Host "  Get-NetFirewallRule -DisplayName 'ForgeMind-*' | Format-Table" -ForegroundColor Gray
Write-Host ""
