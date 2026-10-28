# Phone Testing Checklist (Cellular + Tailscale)

Copy this checklist when testing ForgeMind on your phone via cellular data.

## Pre-Test: Laptop Preparation

- [ ] Laptop plugged into power
- [ ] Tailscale signed in: `tailscale status` shows "Connected"
- [ ] Services running: `.\scripts\start-all.ps1` completed
- [ ] Self-check passed: `.\scripts\check-services.ps1` shows all green
- [ ] Note Tailscale IP from check-services output: `________________`

## Pre-Test: Phone Preparation

- [ ] Tailscale app installed (App Store / Google Play)
- [ ] Signed in to Tailscale (same account as laptop)
- [ ] Tailscale app shows "Connected"
- [ ] Wi-Fi **TURNED OFF** (Settings > Wi-Fi > Off)
- [ ] Cellular data enabled and working
- [ ] Expo Go app installed and up to date

## Test 1: Backend Reachability

Open phone browser (Safari / Chrome), navigate to:

```
http://<your-tailscale-ip>:3000/health
```

**Expected result:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "development"
}
```

- [ ] **PASS**: JSON shown above displayed
- [ ] **FAIL**: Connection timeout / refused / blank page

**If FAIL, stop here. Diagnose on laptop:**
1. Run `.\scripts\check-services.ps1` again
2. Check firewall: `Get-NetFirewallRule -DisplayName 'ForgeMind-*'`
3. Check backend log: `forgemind-backend\backend.log`
4. Verify Tailscale on both devices: `tailscale status`

## Test 2: Expo Go Metro Connection

Open Expo Go app:
1. Tap "Enter URL manually"
2. Type: `exp://<your-tailscale-ip>:8081`
3. Tap "Connect"

**Expected result:**
- Progress bar appears
- "Downloading JavaScript bundle" message
- App loads after 10-60 seconds (first load is slow)
- You see the ForgeMind splash screen / login screen

- [ ] **PASS**: App loaded, login screen visible
- [ ] **FAIL**: Connection error / timeout

**If FAIL:**
1. Check Metro is running: laptop should show Metro output
2. Check `forgemind-mobile\metro.log` for errors
3. Verify Metro bound to Tailscale IP (not 127.0.0.1)
4. Try clearing Metro cache: `.\scripts\stop-all.ps1` then `.\scripts\start-all.ps1`

## Test 3: Authentication (Backend API)

On the login screen:
1. Enter test credentials:
   - Email: `_______________________`
   - Password: `_______________________`
2. Tap "Login"

**Expected result:**
- Loading spinner appears
- Login succeeds
- Home screen / dashboard appears

- [ ] **PASS**: Logged in successfully
- [ ] **FAIL**: Login error / network error

**If FAIL:**
1. Check backend logs: `forgemind-backend\backend.log`
2. Check CORS is allowing the request (backend should log it)
3. Verify user exists in database

## Test 4: Marketplace Browse (Backend API)

Navigate to Marketplace:
1. Tap "Marketplace" or similar navigation
2. Wait for items to load

**Expected result:**
- List of marketplace items appears
- Images load (if applicable)
- Can scroll through items

- [ ] **PASS**: Marketplace items loaded and displayed
- [ ] **FAIL**: Empty list / loading spinner stuck / error

**If FAIL:**
1. Check backend logs for API errors
2. Verify database has marketplace data
3. Check network tab (if using browser) or backend logs for request/response

## Test 5: Item Details (Backend API)

Tap on any marketplace item:

**Expected result:**
- Item detail screen appears
- All details shown (name, price, description, etc.)
- Images load

- [ ] **PASS**: Item details loaded correctly
- [ ] **FAIL**: Details missing / error

## Test 6: Matcher (Flask AI via Backend)

Perform an action that triggers the matcher:
- Create a listing (if applicable)
- Use "Find matching items" feature
- Or any other feature that calls the matcher API

**Expected result:**
- Matcher processes request (may take 2-5 seconds)
- Results appear (matched items, score, etc.)
- No timeout or error

- [ ] **PASS**: Matcher returned results
- [ ] **FAIL**: Timeout / error / no results

**If FAIL:**
1. Check Flask logs: `forgemind-ai\api_err.log`
2. Check Flask is running: `Invoke-WebRequest http://localhost:5000/health`
3. Check backend can reach Flask: backend logs should show Flask call
4. Verify matcher dataset exists: `forgemind-ai\chracters_datasets\`

## Post-Test: Stress Test

Leave the app running for 5 minutes:
1. Navigate between screens
2. Trigger multiple API calls
3. Lock/unlock phone
4. Switch to another app and back

**Expected result:**
- App remains responsive
- API calls continue to work
- No crashes or disconnections

- [ ] **PASS**: App stable for 5+ minutes
- [ ] **FAIL**: Crashes / disconnects / freezes

## Summary

Total tests: 7
Tests passed: _____
Tests failed: _____

**Overall result:** ☐ PASS  ☐ FAIL

---

## Appendix: Quick Fixes

### "Connection refused" from phone
- Laptop services not running → run `.\scripts\start-all.ps1`
- Firewall blocking → run `.\scripts\setup-firewall.ps1` (admin)
- Tailscale not connected → run `tailscale up` on laptop

### "Bundle loading very slow"
- Normal for first load (30-60 seconds)
- Subsequent loads much faster (5-10 seconds)
- Clear Metro cache if stuck: `.\scripts\stop-all.ps1`, then `start-all.ps1`

### "API calls fail but app loads"
- Backend not running → check `.\scripts\check-services.ps1`
- Wrong API URL → check Metro log for hostUri value
- CORS issue → check backend CORS config allows Tailscale range

### "Matcher times out"
- Flask not running → check `forgemind-ai\api_err.log`
- Dataset missing → check `chracters_datasets` folder exists
- Network issue backend→Flask → Flask runs on localhost only, backend must be local

---

**Date tested:** _____________
**Tester:** _____________
**Phone model:** _____________
**OS version:** _____________
**Cellular carrier:** _____________
**Expo Go version:** _____________
