FORGE AWAKE

# ForgeMind Server Startup Guide

**SEARCH TAGS**: start server, forge awake, tailscale, expo, backend, metro, flask, remote testing

## Magic Phrases

- **Start servers**: `FORGE AWAKE` (case-insensitive)
- **Stop servers**: `forge sleep` (case-insensitive)

When you say "FORGE AWAKE" to the AI assistant, it will automatically start all ForgeMind services and report their status.

## What FORGE AWAKE Does

The phrase triggers the automated startup sequence:

1. Checks Tailscale connection (laptop must be signed in)
2. Verifies PostgreSQL is running
3. Starts the backend server (Node/Express on port 3000)
4. Starts Flask AI service (Python on port 5000, localhost only)
5. Starts Metro bundler (Expo on port 8081, bound to Tailscale IP)
6. Performs health checks on all services
7. Reports the Expo Go URL and backend health endpoint

All services run in hidden background windows with logs in `logs/` folder.

## Manual Commands (if needed)

### Start All Services
```powershell
cd "c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-mobile"
.\scripts\start-all.ps1
```

### Stop All Services
```powershell
.\scripts\stop-all.ps1
```

### Check Service Status
```powershell
.\scripts\check-services.ps1
```

### Individual Service Commands

**Backend**:
```powershell
cd ..\forgemind-backend
npm start
# Runs on http://0.0.0.0:3000
```

**Flask AI**:
```powershell
cd ..\forgemind-ai
.\.venv\Scripts\python.exe src\api.py
# Runs on http://127.0.0.1:5000
```

**Metro**:
```powershell
cd forgemind-mobile
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "100.82.197.108"  # Your Tailscale IP
npx expo start --clear
# Runs on http://100.82.197.108:8081
```

## Important URLs

### For Your Phone (Expo Go)
```
exp://100.82.197.108:8081
```
Type this URL in Expo Go after:
1. Turning off Wi-Fi (cellular only)
2. Connecting to Tailscale on your phone
3. Opening Expo Go > "Enter URL manually"

### For Testing (Phone Browser)
```
http://100.82.197.108:3000/health
```
Should return: `{"status":"ok","db":"ok"}`

### Localhost Endpoints
- Backend: `http://localhost:3000/health`
- Flask: `http://localhost:5000/health`
- Metro: `http://localhost:8081`

## Troubleshooting

### Services won't start

**Check Tailscale**:
```powershell
tailscale status
tailscale ip -4
```
If not signed in: `tailscale up`

**Check PostgreSQL**:
```powershell
Get-Service postgresql*
```
If stopped: `Start-Service postgresql-x64-18`

**Check logs**:
```powershell
Get-Content logs\backend-out.log -Tail 30
Get-Content logs\flask-out.log -Tail 30
Get-Content logs\metro-out.log -Tail 30
```

### Phone can't connect to Expo

**1. Verify backend reachable from laptop**:
```powershell
Invoke-WebRequest -Uri "http://100.82.197.108:3000/health"
```

**2. Verify Metro reachable**:
```powershell
Invoke-WebRequest -Uri "http://100.82.197.108:8081"
```

**3. Ping phone from laptop**:
```powershell
tailscale ping 100.107.157.28  # Your phone's Tailscale IP
```

**4. Check firewall rules**:
```powershell
Get-NetFirewallRule -DisplayName "ForgeMind-*"
```
Should show rules for ports 3000 and 8081.

### Services crash or stop

**Kill everything and restart**:
```powershell
.\scripts\stop-all.ps1
Start-Sleep -Seconds 5
.\scripts\start-all.ps1
```

**Check for port conflicts**:
```powershell
Get-NetTCPConnection -LocalPort 3000,5000,8081 -State Listen
```

### Metro bundle errors

**Clear Metro cache**:
```powershell
.\scripts\stop-all.ps1
Remove-Item node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
.\scripts\start-all.ps1
```

### Backend can't reach Flask

Flask runs on `127.0.0.1:5000` (localhost only). Verify:
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:5000/health"
```

If Flask is bound to wrong address, check `forgemind-ai/src/api.py` line 313:
```python
app.run(debug=True, host='127.0.0.1', port=5000)
```

### Auto-start after reboot doesn't work

**Check scheduled task**:
```powershell
Get-ScheduledTask -TaskName "ForgeMind-AutoStart"
```

**Test task manually**:
```powershell
Start-ScheduledTask -TaskName "ForgeMind-AutoStart"
Start-Sleep -Seconds 30
.\scripts\check-services.ps1
```

**Rerun setup**:
```powershell
# Administrator PowerShell required
.\scripts\setup-autostart.ps1
```

## Service Architecture

```
Phone (cellular + Tailscale)
  ↓
  ├─→ exp://100.82.197.108:8081 ──→ Metro (bound to Tailscale IP)
  │                                    └─ React Native bundle
  │
  └─→ http://100.82.197.108:3000 ──→ Backend (binds 0.0.0.0, Tailscale-scoped firewall)
       ├─→ http://127.0.0.1:5000 ──→ Flask AI (localhost only)
       └─→ tcp://127.0.0.1:5432 ──→ PostgreSQL (localhost only)
```

## Security Notes

- **No public exposure**: All access via Tailscale private network
- **Firewall scoped**: Ports 3000 and 8081 only accept Tailscale range (100.64.0.0/10)
- **Flask isolated**: Bound to 127.0.0.1, no external access
- **PostgreSQL isolated**: Bound to 127.0.0.1, no network exposure

## Quick Reference

```powershell
# Start everything
FORGE AWAKE (say to AI) or .\scripts\start-all.ps1

# Stop everything
forge sleep (say to AI) or .\scripts\stop-all.ps1

# Check status
.\scripts\check-services.ps1

# View logs
Get-Content logs\*.log -Tail 50

# Tailscale IP
tailscale ip -4

# Test backend from laptop
Invoke-WebRequest http://100.82.197.108:3000/health

# Expo Go URL for phone
exp://100.82.197.108:8081
```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Tailscale is not signed in" | Tailscale not connected | Run `tailscale up` |
| "Backend health check timed out" | Backend not started or crashed | Check `logs\backend-err.log` |
| "Flask health check timed out" | Flask not started | Check `logs\flask-err.log`, verify venv exists |
| "Metro port already in use" | Previous Metro still running | Run `.\scripts\stop-all.ps1` first |
| "Unable to resolve module" | Metro cache issue | Stop services, run `npx expo start --clear` |
| Connection refused (phone) | Firewall or Tailscale issue | Run `.\scripts\setup-firewall.ps1` (admin) |

---

**Last Updated**: 2026-10-19  
**Tailscale Laptop IP**: 100.82.197.108  
**Tailscale Phone IP**: 100.107.157.28
