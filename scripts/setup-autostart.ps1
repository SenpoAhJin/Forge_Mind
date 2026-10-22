#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Configure ForgeMind stack to start automatically on boot
.DESCRIPTION
    Creates a Task Scheduler task that runs start-all.ps1 at system startup.
    Task runs with highest privileges and waits for network (Tailscale) to be available.
    
    MUST BE RUN AS ADMINISTRATOR
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$Username = $env:USERNAME
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step { Write-Host "[>] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[!] $args" -ForegroundColor Yellow }
function Write-Fail { Write-Host "[X] $args" -ForegroundColor Red }

Write-Host ""
Write-Host "---------------------------------------------------" -ForegroundColor Magenta
Write-Host "  ForgeMind Auto-Start Setup" -ForegroundColor Magenta
Write-Host "---------------------------------------------------" -ForegroundColor Magenta
Write-Host ""

# Paths
$SCRIPT_DIR = $PSScriptRoot
$MOBILE = Split-Path -Parent $SCRIPT_DIR
$ROOT = $MOBILE
$StartScript = Join-Path $MOBILE "scripts\start-all.ps1"
$LogDir = Join-Path $ROOT "logs"

# Validate script exists
if (-not (Test-Path $StartScript)) {
    Write-Fail "Start script not found: $StartScript"
    exit 1
}

# Create logs directory
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    Write-Success "Created logs directory: $LogDir"
}

# -----------------------------------------------------------------------------
# Create Scheduled Task
# -----------------------------------------------------------------------------
Write-Step "Creating scheduled task..."

$TaskName = "ForgeMind-AutoStart"
$TaskDescription = "Start ForgeMind stack (backend, Flask, Metro) at system startup"

# Remove existing task if present
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Warn "Task '$TaskName' already exists. Removing..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Action: Run PowerShell with start-all.ps1
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`"" `
    -WorkingDirectory $ROOT

# Trigger: At logon with 60-second delay
$Trigger = New-ScheduledTaskTrigger -AtLogon -User $Username
$Trigger.Delay = "PT60S"  # ISO 8601 duration: 60 seconds

# Settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -Hidden  # Run hidden

# Principal: Run as current user with highest privileges
$Principal = New-ScheduledTaskPrincipal -UserId $Username -RunLevel Highest -LogonType Interactive

# Register task
Register-ScheduledTask -TaskName $TaskName `
    -Description $TaskDescription `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal | Out-Null

Write-Success "Task '$TaskName' created"

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "---------------------------------------------------" -ForegroundColor Magenta
Write-Host "  Auto-start configured" -ForegroundColor Magenta
Write-Host "---------------------------------------------------" -ForegroundColor Magenta
Write-Host ""
Write-Host "Task Details:" -ForegroundColor Cyan
Write-Host "  Name:     $TaskName" -ForegroundColor White
Write-Host "  Trigger:  At logon (60-second delay)" -ForegroundColor White
Write-Host "  User:     $Username" -ForegroundColor White
Write-Host "  Hidden:   Yes" -ForegroundColor White
Write-Host "  Script:   $StartScript" -ForegroundColor White
Write-Host ""
Write-Host "The ForgeMind stack will now start automatically after reboot." -ForegroundColor Green
Write-Host ""
Write-Host "Manage task:" -ForegroundColor Cyan
Write-Host "  View:     Get-ScheduledTask -TaskName '$TaskName' | Format-List" -ForegroundColor Gray
Write-Host "  Disable:  Disable-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
Write-Host "  Enable:   Enable-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
Write-Host "  Remove:   Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
Write-Host ""
Write-Host "Test task:" -ForegroundColor Cyan
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
Write-Host ""
