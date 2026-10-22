#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Configure power settings to keep laptop awake while plugged in
.DESCRIPTION
    Prevents sleep and hibernation when plugged into AC power.
    Battery operation remains unchanged.
    
    MUST BE RUN AS ADMINISTRATOR
#>

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step { Write-Host "[>] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }

Write-Host ""
Write-Host "---------------------------------------------------" -ForegroundColor Magenta
Write-Host "  ForgeMind Power Management Setup" -ForegroundColor Magenta
Write-Host "---------------------------------------------------" -ForegroundColor Magenta
Write-Host ""

# Get current power scheme
Write-Step "Configuring power settings for AC operation..."

# Set AC (plugged in) sleep timeout to 0 (never)
powercfg /change standby-timeout-ac 0
Write-Success "Set sleep timeout (AC) to Never"

# Set AC hibernate timeout to 0 (never)
powercfg /change hibernate-timeout-ac 0
Write-Success "Set hibernate timeout (AC) to Never"

# Set AC monitor timeout to 15 minutes (reasonable for a server)
powercfg /change monitor-timeout-ac 15
Write-Success "Set monitor timeout (AC) to 15 minutes"

# Keep processor performance high when plugged in
powercfg /change processor-throttle-ac 100
Write-Success "Set processor throttling (AC) to 100%"

Write-Host ""
Write-Host "Power settings configured:" -ForegroundColor Green
Write-Host "  - Sleep: Never (when plugged in)" -ForegroundColor White
Write-Host "  - Hibernate: Never (when plugged in)" -ForegroundColor White
Write-Host "  - Monitor: 15 minutes (when plugged in)" -ForegroundColor White
Write-Host ""
Write-Host "Battery operation unchanged" -ForegroundColor Gray
Write-Host ""
Write-Host "View current settings:" -ForegroundColor Cyan
Write-Host "  powercfg /query" -ForegroundColor Gray
Write-Host ""
