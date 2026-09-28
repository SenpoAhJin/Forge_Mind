# Stale Bundle Test Protocol

**CRITICAL:** Before making any more changes, rule out stale bundle issue.

---

## Problem

**No console logs appearing** could mean:
- A) Logs are suppressed (code issue)
- B) Code never runs (stale bundle)
- C) Console isn't showing logs (terminal issue)

**Touch not working** could mean:
- A) CameraController doesn't work (code issue)
- B) Old code still running (stale bundle)

**One stale bundle explains BOTH symptoms.**

---

## Test Protocol

### Step 1: Kill Metro and Clear Cache

In your terminal where Metro is running:
1. Press `Ctrl+C` to stop Metro
2. Run:
   ```powershell
   npx expo start -c
   ```

The `-c` flag clears the Metro bundler cache.

### Step 2: Force Close Expo Go

On your phone:
1. **Don't just minimize** - fully force-stop the app
2. On Android: Settings → Apps → Expo Go → Force Stop
3. On iOS: Swipe up to close app, wait 3 seconds
4. Reopen Expo Go fresh

### Step 3: Scan QR Code Fresh

**Don't use "recently opened"** - scan the QR code from terminal again.

### Step 4: Navigate and Test

1. Navigate to a project with 3D preview
2. Try to **drag the model ONE time**
3. **Immediately check terminal**

---

## What to Report

**Does ANY of these logs appear in terminal now?**
- `[BodyModel] Component mounted/updated`
- `[CameraController]` (any message)
- `[boneScaling] Sample name translations`

**Answer clearly:**
- [ ] YES - Logs now appear (stale bundle was the problem)
- [ ] NO - Still no logs (deeper issue)

---

## If Logs Appear Now

**This means:** All prior testing was on stale code. Previous conclusions invalid.

**Next steps:**
1. Report what the logs actually say
2. Test if rotation works now
3. Diagnose based on REAL current behavior

---

## If Logs Still Don't Appear

**This means:** Console logging itself is unreliable. Need visible proof.

**Next step:** Add on-screen debug display (see below)

---
