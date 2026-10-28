# ForgeMind "arise" and "rest" Testing Checklist

Complete each section in order. Record actual results in the Results table at the end.

## A. Terminal Test

**Objective**: Verify terminal shortcuts work correctly

1. Open PowerShell
2. Type `rest` and press Enter
3. Verify output shows ports 3000, 5000, 8081 are free
4. Run: `Get-NetTCPConnection -LocalPort 3000,5000,8081 -State Listen -ErrorAction SilentlyContinue`
   - Expected: No output (all ports free)
5. Type `arise` and press Enter
6. Wait for script to complete (UAC prompt may appear)
7. Verify the output shows:
   - Backend: UP or DOWN (with log path)
   - Flask: UP or DOWN (with log path)
   - Metro: UP or DOWN (with log path)
   - Expo Go URL: `exp://<tailscale-ip>:8081`
   - Backend health URL: `http://<tailscale-ip>:3000/health`
8. Run: `.\scripts\check-services.ps1`
9. Verify all three services report UP
10. Test health endpoints from laptop browser:
    - Open: `http://localhost:3000/health`
    - Open: `http://<tailscale-ip>:3000/health` (use IP from arise output)
11. Verify both URLs return JSON with `"status": "ok"`

**Pass criteria**: All commands execute, ports are freed by `rest`, all services show UP in `arise` output, health URLs work

---

## B. Agent Test

**Objective**: Verify AI agent responds to "arise" trigger phrase

1. Open a new Kiro chat session
2. Type only: `arise`
3. Verify the agent:
   - Runs `start-all.ps1`
   - Runs `check-services.ps1`
   - Shows real output (not fabricated)
   - Reports Backend: UP/DOWN
   - Reports Flask: UP/DOWN
   - Reports Metro: UP/DOWN
   - Prints the `exp://<tailscale-ip>:8081` link
   - Prints the backend health link

**Pass criteria**: Agent executes both scripts and shows real results, not just chat responses

---

## C. Phone Test - Same Wi-Fi with Tailscale

**Objective**: Verify phone can connect over Tailscale while on same Wi-Fi

**Prerequisites**:
- Laptop services running (`arise` completed)
- Phone has Tailscale installed and signed in (same account as laptop)
- Phone is on same Wi-Fi as laptop

**Steps**:
1. On phone, open Tailscale app and verify it's connected
2. Note the laptop's Tailscale IP (from `arise` output or `tailscale ip -4` on laptop)
3. On phone browser, navigate to: `http://<tailscale-ip>:3000/health`
4. Verify you see JSON response: `{"status":"ok",...}`
5. Open Expo Go on phone
6. Tap "Enter URL manually"
7. Type: `exp://<tailscale-ip>:8081`
8. Wait for app to load
9. Verify ForgeMind app home screen appears
10. Test login functionality
11. Navigate to marketplace
12. Verify listings load

**Pass criteria**: Health endpoint accessible from phone browser, Expo app loads and functions

---

## D. Phone Test - Cellular with Tailscale (Slow Expected)

**Objective**: Verify phone can connect over cellular data through Tailscale

**Prerequisites**:
- Laptop services running
- Phone has Tailscale installed and signed in
- Phone Wi-Fi is OFF
- Phone is on cellular data only

**Steps**:
1. On phone, turn off Wi-Fi
2. Verify cellular data is active
3. Open Tailscale app and verify it's connected (may take 10-15 seconds)
4. On phone browser, navigate to: `http://<tailscale-ip>:3000/health`
   - Note: May be slower than Wi-Fi (5-10 seconds)
5. Verify JSON response appears
6. Open Expo Go on phone
7. Enter URL: `exp://<tailscale-ip>:8081`
8. Wait for app to load (may take 30-60 seconds on cellular)
9. Verify ForgeMind app loads
10. Log in
11. Navigate to marketplace and verify listings load
12. Test the matcher on the **Gojo Satoru Season 2 Uniform** variant
    - This is the only fully mapped variant
    - Verify the matcher displays results

**Pass criteria**: All functionality works over cellular (slower speed is expected and acceptable)

---

## E. Reboot Test - Auto-Start Verification

**Objective**: Verify services start automatically after reboot

**Prerequisites**:
- `setup-autostart.ps1` has been run as Administrator
- Scheduled task "ForgeMind-AutoStart" exists

**Steps**:
1. Run `rest` to stop all services
2. Verify ports are free
3. Restart the laptop (full reboot, not just sleep)
4. Log in to Windows
5. Do NOT manually start any services
6. Wait 2 minutes (task has 60-second delay + startup time)
7. Open PowerShell
8. Run: `.\scripts\check-services.ps1`
9. Verify all three services report UP:
   - Backend: UP
   - Flask: UP
   - Metro: UP

**Pass criteria**: All services are running without manual intervention after reboot

**Troubleshooting**: If services are not running:
- Check task exists: `Get-ScheduledTask -TaskName "ForgeMind-AutoStart"`
- Check task history: `Get-ScheduledTask -TaskName "ForgeMind-AutoStart" | Get-ScheduledTaskInfo`
- Check log: `Get-Content forgemind-mobile\logs\last-run.txt`

---

## F. Stop Test - Clean Shutdown

**Objective**: Verify `rest` cleanly stops all services and frees ports

**Prerequisites**:
- Services are currently running

**Steps**:
1. Type `rest` in PowerShell
2. Verify output shows:
   - Freed X port(s) OR All ports already free
   - Stopped X Node process(es) OR No Node processes found
   - Stopped X Python process(es) OR No Python processes found
   - "Ports 3000, 5000, 8081 confirmed free"
3. Run: `Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue`
   - Expected: No output
4. Run: `Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue`
   - Expected: No output
5. Run: `Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue`
   - Expected: No output
6. Verify PostgreSQL is still running (should not be stopped):
   - Run: `Get-Service -Name "postgresql*"`
   - Expected: Status = Running

**Pass criteria**: All three ports (3000, 5000, 8081) are free, PostgreSQL still running

---

## Results Table

| Step | Test | Result | Evidence / Notes |
|------|------|--------|------------------|
| A.1  | Terminal `rest` frees ports | | |
| A.2  | Terminal `arise` starts services | | |
| A.3  | All services report UP | | |
| A.4  | Health URLs work (localhost) | | |
| A.5  | Health URLs work (Tailscale IP) | | |
| B.1  | Agent responds to "arise" | | |
| B.2  | Agent shows real UP/DOWN output | | |
| C.1  | Phone health check (Wi-Fi + Tailscale) | | |
| C.2  | Expo app loads (Wi-Fi + Tailscale) | | |
| C.3  | Login and marketplace work | | |
| D.1  | Phone health check (cellular + Tailscale) | | |
| D.2  | Expo app loads (cellular + Tailscale) | | |
| D.3  | Matcher works on Gojo Season 2 Uniform | | |
| E.1  | Auto-start after reboot | | |
| E.2  | All services UP after 2 minutes | | |
| F.1  | `rest` frees all ports | | |
| F.2  | Ports 3000, 5000, 8081 confirmed free | | |
| F.3  | PostgreSQL still running | | |

---

## Tests NOT Performed (Requires Physical Access)

The following tests cannot be automated and require physical testing:

- **C (Phone on Wi-Fi)**: Requires physical phone with Tailscale
- **D (Phone on cellular)**: Requires physical phone with cellular data
- **E (Reboot test)**: Requires actual system reboot and 2-minute wait
- **Same Wi-Fi without Tailscale**: Firewall rules are scoped to Tailscale range, so this configuration is expected to fail

Record actual test results in the table above when performing physical tests.
