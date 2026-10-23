# ForgeMind Remote Testing Scripts

Scripts for running ForgeMind stack (backend + Flask + Metro) accessible from your phone via Tailscale while this laptop stays at home.

## Prerequisites

1. **Tailscale installed and signed in**
   ```powershell
   # Install
   winget install tailscale.tailscale
   
   # Sign in (opens browser)
   tailscale up
   
   # Enable "Run unattended" in Tailscale settings (Windows system tray icon)
   ```

2. **All three projects set up**
   - `forgemind-backend` with `.env` configured
   - `forgemind-ai` with `.venv` and dependencies installed
   - `forgemind-mobile` with node_modules installed

3. **PostgreSQL running** (should already be set to Automatic startup)

## Quick Start

### First Time Setup (requires elevated PowerShell)

Run these commands in an **Administrator PowerShell**:

```powershell
# 1. Configure firewall (Tailscale scope only)
.\scripts\setup-firewall.ps1

# 2. Configure power settings (no sleep when plugged in)
.\scripts\setup-power.ps1

# 3. Configure auto-start on boot
.\scripts\setup-autostart.ps1
```

### Normal Operation

```powershell
# Start all services
.\scripts\start-all.ps1

# Check status
.\scripts\check-services.ps1

# Stop all services
.\scripts\stop-all.ps1
```

## Scripts

### `start-all.ps1`
Starts the entire stack in order:
1. Checks Tailscale connection
2. Verifies PostgreSQL is running
3. Starts backend (port 3000, binds 0.0.0.0)
4. Starts Flask AI (port 5000, localhost only)
5. Starts Metro bound to Tailscale IP (port 8081)

All services run in background with logs:
- Backend: `forgemind-backend/backend.log`
- Flask: `forgemind-ai/api_*.log`
- Metro: `forgemind-mobile/metro.log`

### `stop-all.ps1`
Stops Metro, Flask, and backend. Leaves PostgreSQL running.

### `check-services.ps1`
Self-check that displays:
- Tailscale IP address
- Listening ports (3000, 5000, 8081, 5432)
- Health check results for backend and Flask
- Firewall rule status
- Expo Go URL to use on your phone

### `setup-firewall.ps1` (requires Administrator)
Creates Windows Firewall inbound rules:
- Port 3000 (backend): Allow from Tailscale range 100.64.0.0/10 only
- Port 8081 (Metro): Allow from Tailscale range 100.64.0.0/10 only
- Port 5000 (Flask): No rule (local-only, called by backend)

**Security**: These rules are scoped to the Tailscale private network. Nothing is exposed to the public internet.

### `setup-power.ps1` (requires Administrator)
Configures power settings for AC operation:
- Sleep: Never
- Hibernate: Never
- Monitor: 15 minutes

Battery operation unchanged.

### `setup-autostart.ps1` (requires Administrator)
Creates a Task Scheduler task that runs `start-all.ps1` at system startup.
- 2-minute delay to allow Tailscale to connect
- Runs with highest privileges
- Auto-restarts on failure (3 attempts)

## Phone Testing Checklist

1. **Install Tailscale on your phone** and sign in with the same account
2. **Turn off Wi-Fi** (cellular only)
3. **Verify Tailscale is connected** on the phone
4. **Test backend access** in phone browser:
   ```
   http://<tailscale-ip>:3000/health
   ```
   Should return JSON: `{"status":"healthy",...}`

5. **Open Expo Go** > "Enter URL manually"
6. **Type**: `exp://<tailscale-ip>:8081`
7. **Wait for bundle to load**
8. **Test features**:
   - Login (tests backend auth)
   - Browse marketplace (tests backend API)
   - Use matcher (tests Flask AI via backend)

Replace `<tailscale-ip>` with the IP from `.\scripts\check-services.ps1`.

## Architecture

```
Phone (cellular + Tailscale)
  ↓
  ├─→ Metro (8081) ────────→ Laptop Tailscale IP
  └─→ Backend (3000) ──────→ Laptop Tailscale IP
       └─→ Flask (5000) ───→ localhost only
       └─→ Postgres (5432) → localhost only
```

- **Metro** binds to Tailscale IP via `REACT_NATIVE_PACKAGER_HOSTNAME`
- **Backend** binds to 0.0.0.0 (all interfaces), protected by firewall
- **Flask** binds to 0.0.0.0 but has no firewall rule (local-only)
- **Postgres** binds to 127.0.0.1 (local-only)

## Troubleshooting

### "Tailscale is not signed in"
```powershell
tailscale up
```

### Backend or Flask health check fails
Check logs:
- Backend: `forgemind-backend\backend.log`
- Flask: `forgemind-ai\api_err.log`

### Phone cannot reach backend
1. Run `.\scripts\check-services.ps1` on laptop
2. Verify Tailscale is connected on both laptop and phone
3. Test `http://<tailscale-ip>:3000/health` in phone browser
4. Check firewall rules: `Get-NetFirewallRule -DisplayName 'ForgeMind-*'`

### Metro bundle fails to load
1. Check `forgemind-mobile\metro.log`
2. Verify Metro is bound to Tailscale IP (not 127.0.0.1)
3. Try clearing cache: `.\scripts\stop-all.ps1` then `.\scripts\start-all.ps1`

### After reboot, services don't start
1. Check scheduled task: `Get-ScheduledTask -TaskName 'ForgeMind-AutoStart'`
2. View task history: Task Scheduler > Task Scheduler Library > ForgeMind-AutoStart > History tab
3. Check if Tailscale is set to "Run unattended" (system tray icon > Settings)

## Recovery from Remote

If the laptop loses power or crashes while you're away:

1. **Automatic recovery** (if auto-start is configured):
   - Laptop boots
   - Tailscale connects (2-minute wait)
   - Scheduled task runs `start-all.ps1`
   - Services come back online

2. **Manual recovery** (if you have remote access):
   - Use TeamViewer, AnyDesk, or Chrome Remote Desktop
   - Run `.\scripts\start-all.ps1`

3. **What won't recover automatically**:
   - Network cable unplugged
   - Tailscale sign-in expired (sign in required)
   - Laptop goes into BIOS/UEFI (requires physical access)

## Security Notes

- **No public exposure**: All access is through Tailscale private network
- **Firewall scoped**: Only Tailscale range (100.64.0.0/10) can reach backend/Metro
- **Flask isolated**: No external access, only localhost calls from backend
- **Secrets safe**: All `.env` files are gitignored
- **Auth preserved**: No security checks disabled

## Files Modified

This setup does NOT modify:
- Application code (backend, mobile, Flask)
- Database schema or data
- Package dependencies
- Git history

Only additions:
- `scripts/*.ps1` (new files)
- Windows Firewall rules (2 rules, can be removed)
- Task Scheduler task (1 task, can be removed)
- Power settings (can be reverted)
