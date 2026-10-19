# ForgeMind Remote Testing Setup - Final Report

## Summary

Your ForgeMind stack is now configured for remote testing via Tailscale. With your phone on cellular data (Wi-Fi off) and Tailscale connected, you can:
1. Load the app from Expo Go
2. Test login (backend auth)
3. Test marketplace (backend API)
4. Test matcher (Flask AI via backend)

All services will auto-restart after reboot, and nothing is exposed to the public internet.

## What Changed

### Files Added
- **Commit**: `c7c8bbe` on branch `chore/remote-testing`
- **Location**: `forgemind-mobile/scripts/`
  - `start-all.ps1` - Start all services
  - `stop-all.ps1` - Stop all services
  - `check-services.ps1` - Self-check and status
  - `setup-firewall.ps1` - Configure Windows Firewall (admin)
  - `setup-power.ps1` - Configure power settings (admin)
  - `setup-autostart.ps1` - Configure auto-start (admin)
  - `README.md` - Complete documentation

### System Configuration (NOT DONE YET - you must do this)
- Windows Firewall: 2 rules (ports 3000, 8081) scoped to Tailscale range
- Power settings: No sleep/hibernate when plugged in
- Task Scheduler: Auto-start task on boot
- Tailscale: Must be installed and signed in

### Application Code
**ZERO CHANGES** - The mobile app already handles non-localhost Metro hosts correctly via `Constants.expoConfig?.hostUri`.

## Verified ✓

- ✓ Backend binds to 0.0.0.0 (confirmed in `forgemind-backend/src/config.ts` line 58)
- ✓ Flask binds to 0.0.0.0 (confirmed in `forgemind-ai/src/api.py` line 295)
- ✓ PostgreSQL service running and set to Automatic
- ✓ Mobile app uses Metro's hostUri for backend URL (no localhost hardcoded)
- ✓ Scripts created and committed (no secrets included)
- ✓ TypeScript compilation passes (no code changes made)

## NOT TESTED (requires your phone on cellular)

❌ Phone connects to Metro via Tailscale IP
❌ App loads in Expo Go over cellular
❌ Login reaches backend
❌ Marketplace actions reach backend
❌ Matcher calls reach Flask via backend
❌ Auto-start works after reboot

## What You Must Do

### 1. Sign in to Tailscale (one-time)
```powershell
tailscale up
```
This opens your browser. Complete the sign-in process.

### 2. Run Setup Scripts (requires Administrator PowerShell)

**Open PowerShell as Administrator**, then run:

```powershell
cd "c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-mobile"

# Configure firewall
.\scripts\setup-firewall.ps1

# Configure power settings
.\scripts\setup-power.ps1

# Configure auto-start
.\scripts\setup-autostart.ps1
```

### 3. Start Services (normal PowerShell)

```powershell
cd "c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-mobile"

.\scripts\start-all.ps1
```

This will print your Tailscale IP and the Expo Go URL.

### 4. Check Status

```powershell
.\scripts\check-services.ps1
```

Copy the Expo Go URL (something like `exp://100.x.x.x:8081`).

### 5. Phone Testing Checklist

1. **Install Tailscale on your phone** (iOS App Store or Google Play)
2. **Sign in** to Tailscale (same account as laptop)
3. **Verify connection**: Open Tailscale app, ensure it says "Connected"
4. **Turn off Wi-Fi** (cellular only)
5. **Test backend access**: Open phone browser, go to `http://<tailscale-ip>:3000/health`
   - Should show: `{"status":"healthy","version":"1.0.0"}`
   - If this fails, the app won't work either
6. **Open Expo Go** → "Enter URL manually"
7. **Type**: `exp://<tailscale-ip>:8081` (use the IP from step 4)
8. **Wait for bundle** to load (first load takes ~30 seconds)
9. **Test login**: Try to sign in with a test account
10. **Test marketplace**: Browse items, view details
11. **Test matcher**: Create a listing or match attire (triggers Flask AI)

## Architecture Diagram

```
Phone (cellular + Tailscale)
  ↓
  ├─→ exp://100.x.x.x:8081 ──────→ Metro (REACT_NATIVE_PACKAGER_HOSTNAME)
  │                                   ↓
  └─→ http://100.x.x.x:3000 ────→ Backend (binds 0.0.0.0, firewall allows Tailscale)
                                      ├─→ http://127.0.0.1:5000 → Flask AI (local only)
                                      └─→ tcp://127.0.0.1:5432 → PostgreSQL (local only)
```

## Security Posture

✓ **No public exposure**: All access via Tailscale private network
✓ **Firewall scoped**: Only 100.64.0.0/10 (Tailscale CGNAT range) allowed
✓ **Flask isolated**: No external access, only localhost calls from backend
✓ **Postgres isolated**: Binds to 127.0.0.1 only
✓ **Auth preserved**: All security checks intact
✓ **Secrets safe**: All .env files gitignored, no secrets in scripts

## Recovery After Reboot

**Automatic** (if auto-start configured):
1. Laptop boots
2. PostgreSQL starts (already set to Automatic)
3. Tailscale connects (~30 seconds)
4. Task Scheduler waits 2 minutes
5. Runs `start-all.ps1`
6. Backend, Flask, Metro come online

**Manual** (if auto-start not configured):
1. Sign in to Tailscale (if needed): `tailscale up`
2. Run: `.\scripts\start-all.ps1`

## Remaining Risks

❌ **Network cable unplugged**: Tailscale can't connect, services won't be reachable
❌ **Tailscale sign-in expired**: Requires you to sign in again (unlikely, "Run unattended" helps)
❌ **Laptop enters BIOS/UEFI**: Requires physical access to continue boot
❌ **Power loss during update**: Windows might boot to update screen, delaying startup
❌ **Firewall profile change**: If Windows switches from Private to Public profile, rules won't apply

## Remote Recovery Options

If you have TeamViewer, AnyDesk, or Chrome Remote Desktop installed:
1. Connect remotely
2. Run `.\scripts\check-services.ps1` to diagnose
3. Run `.\scripts\start-all.ps1` to restart services

If remote desktop is not set up, you'll need physical access.

## Reverting Changes

To remove all changes:

```powershell
# Remove firewall rules (admin)
Remove-NetFirewallRule -DisplayName "ForgeMind-Backend-3000"
Remove-NetFirewallRule -DisplayName "ForgeMind-Metro-8081"

# Remove scheduled task (admin)
Unregister-ScheduledTask -TaskName "ForgeMind-AutoStart" -Confirm:$false

# Revert power settings (admin)
powercfg /change standby-timeout-ac 15  # or your preferred value
powercfg /change hibernate-timeout-ac 30

# Delete scripts (git)
git checkout feature/chat-app
git branch -D chore/remote-testing
rm -r scripts/
```

## Troubleshooting

### Services won't start
Check logs:
- Backend: `forgemind-backend/backend.log`
- Flask: `forgemind-ai/api_err.log`
- Metro: `forgemind-mobile/metro.log`

### Phone can't reach backend
1. Verify Tailscale on both devices: `tailscale status`
2. Test from phone browser: `http://<tailscale-ip>:3000/health`
3. Check firewall: `Get-NetFirewallRule -DisplayName 'ForgeMind-*'`
4. Check backend is listening: `Get-NetTCPConnection -LocalPort 3000`

### Bundle loads but API calls fail
1. Check backend logs for errors
2. Verify the mobile app is using the correct URL (check Metro log for the hostUri)
3. Test API manually: `curl http://<tailscale-ip>:3000/api/users/me` (with token)

### Auto-start doesn't work after reboot
1. Check task: `Get-ScheduledTask -TaskName 'ForgeMind-AutoStart'`
2. Check task history: Task Scheduler GUI → ForgeMind-AutoStart → History tab
3. Check Tailscale: Must be set to "Run unattended"
4. Manually run task: `Start-ScheduledTask -TaskName 'ForgeMind-AutoStart'`

## Next Steps

1. Complete the setup steps above
2. Test with your phone on cellular
3. If everything works, merge the branch:
   ```powershell
   git checkout feature/chat-app
   git merge chore/remote-testing
   git push
   ```
4. Consider setting up remote desktop software for remote recovery

## Contact Info

If you encounter issues, check:
- `scripts/README.md` - Detailed troubleshooting
- Logs in each project folder
- Task Scheduler History tab
- Windows Firewall settings
