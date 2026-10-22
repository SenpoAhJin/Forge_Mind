# arise

**SEARCH TAGS**: start server, arise, rest, tailscale, expo, backend, flask, metro, forgemind startup, remote testing

## Quick Commands

**Start all services**: Type `arise` in PowerShell, or tell the AI agent "arise"

**Stop all services**: Type `rest` in PowerShell, or tell the AI agent "rest"

## What Each Phrase Does

### `arise` - Start All Services

1. Frees ports 3000, 5000, 8081 by killing any existing processes
2. Checks Tailscale connection (falls back to LAN IP if unavailable)
3. Verifies PostgreSQL is running
4. Starts backend (Express on port 3000)
5. Starts Flask AI service (port 5000)
6. Starts Metro bundler on Tailscale IP (port 8081)
7. Waits 15 seconds for initialization
8. Runs health checks on all three services
9. Displays the Expo Go URL and backend health URL

All services start with hidden windows. Logs are written to `forgemind-mobile\logs\`:
- `backend-out.log` / `backend-err.log`
- `flask-out.log` / `flask-err.log`
- `metro-out.log` / `metro-err.log`
- `last-run.txt` (full transcript of the last startup/shutdown)

### `rest` - Stop All Services

1. Kills all processes listening on ports 3000, 5000, 8081
2. Stops PowerShell background jobs
3. Kills all Node.js processes (backend, Metro)
4. Kills all Python processes (Flask)
5. Verifies that ports 3000, 5000, 8081 are free
6. Reports final status

PostgreSQL is left running.

## Manual Commands (If Shortcuts Don't Work)

### Start services:
```powershell
# From workspace root
powershell -ExecutionPolicy Bypass -File "forgemind-mobile\scripts\start-all.ps1"
```

### Stop services:
```powershell
powershell -ExecutionPolicy Bypass -File "forgemind-mobile\scripts\stop-all.ps1"
```

### Check service status:
```powershell
powershell -ExecutionPolicy Bypass -File "forgemind-mobile\scripts\check-services.ps1"
```

### Individual service commands:

**Backend (Express)**:
```powershell
cd forgemind-backend
npm start
```

**Flask AI**:
```powershell
cd forgemind-ai
.venv\Scripts\python.exe src\api.py
```

**Metro (with Tailscale IP)**:
```powershell
cd forgemind-mobile
$env:REACT_NATIVE_PACKAGER_HOSTNAME = (tailscale ip -4).Trim()
npx expo start --clear
```

## URLs

After running `arise`, you'll see:

**Expo Go URL** (for your phone):
```
exp://<tailscale-ip>:8081
```

**Backend health check**:
```
http://<tailscale-ip>:3000/health
```

**Local health checks** (from laptop browser):
- Backend: `http://localhost:3000/health`
- Flask: `http://localhost:5000/health`
- Metro: `http://<tailscale-ip>:8081`

## Network Compatibility Table

| Phone situation                  | Works? | Link                         | Notes |
|----------------------------------|--------|------------------------------|-------|
| Same Wi-Fi, Tailscale on         | Yes    | exp://<tailscale-ip>:8081    | Recommended |
| Different Wi-Fi, Tailscale on    | Yes    | exp://<tailscale-ip>:8081    | Laptop and phone must both be on Tailscale |
| Cellular data, Tailscale on      | Yes    | exp://<tailscale-ip>:8081    | Slower, but works everywhere |
| Any network, Tailscale off       | No     | None                         | Tailscale is required |
| Same Wi-Fi, Tailscale off        | Unverified | exp://<lan-ip>:8081 (maybe) | Firewall rules are scoped to Tailscale range (100.64.0.0/10). LAN access is probably blocked. Test and record the real result. |

## Prerequisites

**Laptop must be**:
- Powered on
- Awake (not sleeping or hibernating)
- Logged in to your user account
- Running Tailscale (signed in with `tailscale up`)

**Phone must have**:
- Tailscale installed and signed in
- Same Tailscale account as laptop
- Expo Go app installed

**Important**: `arise` only starts the laptop services. It does not depend on the phone's network state. The phone can be on any network (Wi-Fi, cellular, or offline) as long as Tailscale is running on both devices.

## Troubleshooting

### Encoding parse errors in PowerShell
**Symptom**: Script fails with strange character errors

**Fix**: All scripts are now UTF-8 with BOM. If you see encoding issues:
```powershell
cd forgemind-mobile\scripts
Get-ChildItem *.ps1 | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.UTF8Encoding]::new($true))
}
```

### Port still busy after `rest`
**Symptom**: `arise` reports "Could not kill PID" or port remains occupied

**Fix**: Force-kill the process manually:
```powershell
# Find the process
Get-NetTCPConnection -LocalPort 3000 -State Listen

# Kill it
Stop-Process -Id <PID> -Force
```

Or use Task Manager to end `node.exe` / `python.exe` processes.

### Health check false negatives
**Symptom**: `arise` reports "DOWN" but the service is actually running

**Cause**: Service takes longer than 15 seconds to start

**Fix**: Wait 10 more seconds and run:
```powershell
.\scripts\check-services.ps1
```

If it's still DOWN, check the error log:
```powershell
Get-Content forgemind-mobile\logs\backend-err.log -Tail 20
Get-Content forgemind-mobile\logs\flask-err.log -Tail 20
Get-Content forgemind-mobile\logs\metro-err.log -Tail 20
```

### Agent only chats back (doesn't run commands)
**Symptom**: When you type "arise", the agent acknowledges but doesn't execute scripts

**Fix**: The steering file may not be loaded. Check:
```powershell
# Verify steering file exists
Test-Path ".kiro\steering\arise.md"
```

If it exists, restart the Kiro session to reload steering files. The `inclusion: always` directive should auto-load it.

### UAC prompt hangs on auto-start
**Symptom**: After reboot, services don't start automatically and a UAC prompt is waiting

**Cause**: Task Scheduler task is not configured with "Highest" privileges

**Fix**: Run `setup-autostart.ps1` as Administrator:
```powershell
# Must be run as Administrator
.\scripts\setup-autostart.ps1
```

This creates the `ForgeMind-AutoStart` scheduled task with:
- Trigger: At logon with 60-second delay
- Run level: Highest (no UAC prompt)
- Hidden: Yes
- User: Your Windows username

To manually verify task settings:
```powershell
Get-ScheduledTask -TaskName "ForgeMind-AutoStart" | Format-List
```

To manually trigger the task (for testing):
```powershell
Start-ScheduledTask -TaskName "ForgeMind-AutoStart"
```

### Tailscale not found
**Symptom**: `arise` reports "Tailscale not installed or not in PATH"

**Fix**: Install Tailscale:
```powershell
winget install tailscale.tailscale
```

Then sign in:
```powershell
tailscale up
```

### Flask venv not found
**Symptom**: `arise` reports "Flask venv not found"

**Fix**: Create and activate the virtual environment:
```powershell
cd forgemind-ai
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

### Backend .env missing
**Symptom**: `arise` reports ".env not found"

**Fix**: Create `forgemind-backend\.env` with required environment variables. Check the backend README or existing `.env.example` for the template.

## Auto-Start on Boot

To make services start automatically when you log in:

1. Run as Administrator:
```powershell
.\scripts\setup-autostart.ps1
```

2. Verify the task:
```powershell
Get-ScheduledTask -TaskName "ForgeMind-AutoStart"
```

The task will start services 60 seconds after you log in, running hidden in the background.

To disable auto-start:
```powershell
Disable-ScheduledTask -TaskName "ForgeMind-AutoStart"
```

To re-enable:
```powershell
Enable-ScheduledTask -TaskName "ForgeMind-AutoStart"
```

To remove completely:
```powershell
Unregister-ScheduledTask -TaskName "ForgeMind-AutoStart" -Confirm:$false
```
