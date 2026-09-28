# Touch Interaction Debug Protocol

**Status:** Awaiting Real Device Testing  
**Current State:** Touch logging added, multiple speculative fixes applied (NOT YET VERIFIED)

---

## ⚠️ CRITICAL: Test on REAL DEVICE First

**DO NOT make any more code changes until this test is complete.**

All previous "fixes" (zoom, freeze, lighting) were likely only tested on web, NOT on actual device. Touch behavior is fundamentally different between web mouse events and React Native's native touch system.

---

## Step 1: Test Current Code on Real Device

### Setup
1. Clear cache and restart dev server:
   ```powershell
   npx expo start --clear
   ```

2. Open in **Expo Go on physical device** (not web, not simulator if possible)

3. Navigate to project with 3D preview (the screen shown in your screenshots)

### Touch Test Actions
Perform these actions on the 3D preview area:

**Test A: Single Finger Drag**
- Place one finger on the 3D model
- Drag slowly up/down/left/right
- Try for 5 seconds

**Test B: Pinch Zoom**
- Place two fingers on the 3D model
- Pinch together (zoom out)
- Spread apart (zoom in)
- Try for 5 seconds

**Test C: Body Size Slider**
- Move the "Adjust Body Size" slider
- Try values: 0.0, 0.5, 1.0
- Observe if body shape changes

### What to Check

**In Metro/Expo Terminal Output** (immediately after testing):

Look for these EXACT log messages:
```
[ThreeDPreview] Touch started!
[ThreeDPreview] Touch moving!
[ThreeDPreview] Touch released!
```

Also look for these bone scaling logs (when moving slider):
```
[BodyModel] Applying bone scaling for morphFactor: X.XXX
[BodyModel] Found X bones in scene
[BodyModel] Successfully scaled X/31 bones
```

---

## Step 2: Report Results

### Please provide this information:

**1. Touch Logs:**
- [ ] YES - I see "[ThreeDPreview] Touch started!" logs
- [ ] NO - I do NOT see any ThreeDPreview touch logs

**2. Visual Behavior:**
- [ ] Model rotates when I drag
- [ ] Model does NOT rotate when I drag
- [ ] Model zooms when I pinch
- [ ] Model does NOT zoom when I pinch

**3. Slider Logs:**
- [ ] YES - I see "[BodyModel] Successfully scaled X/31 bones" logs
- [ ] NO - I do NOT see any BodyModel logs

**4. Body Morphing:**
- [ ] Body visibly changes shape when slider moves
- [ ] Body does NOT change shape when slider moves

**5. Copy/Paste Console Output:**
```
[Paste all console output here, especially any lines with
ThreeDPreview, BodyModel, or boneScaling in them]
```

---

## Step 3: Diagnosis (DO NOT PROCEED UNTIL STEP 2 IS COMPLETE)

### Scenario A: Touch Logs Appear, Model Doesn't Rotate
**Diagnosis:** Touch IS reaching component, but OrbitControls not responding

**Root Cause Investigation Required:**
- Check if @react-three/drei OrbitControls supports React Native
- Check react-three-fiber documentation for native gesture handling
- Verify OrbitControls works in Preview3DTestScreen (non-ScrollView context)

**Likely Solution:** OrbitControls is web-only. Need React Native gesture library.

### Scenario B: No Touch Logs Appear at All
**Diagnosis:** Touch is NOT reaching component, blocked by parent

**Root Cause Investigation Required:**
- Trace component tree from ScrollView → ThreeDPreview → Preview3D → Canvas
- Identify which ancestor is capturing touch events
- Check if Preview3DTestScreen (outside ScrollView) works

**Likely Solution:** ScrollView capturing touches. Need to extract 3D preview or disable scroll in that region.

### Scenario C: Slider Logs Appear, Body Doesn't Change
**Diagnosis:** Bone scaling code runs, but visual update not propagating

**Root Cause Investigation Required:**
- Check if bone names match (logs will show "Bone not found")
- Check scaled count (should be close to 31/31)
- Verify skeleton.update() is actually triggering

**Likely Solution:** Bone name mismatch or scene not re-rendering after scale change.

### Scenario D: No Logs Appear At All (Touch OR Slider)
**Diagnosis:** Console logging may be suppressed or app not reloading properly

**Action Required:**
- Verify app reloaded after code changes (shake device → Reload)
- Check Metro terminal is showing logs (not filtered)
- Try adding a simple console.log in App.tsx to confirm logging works

---

## Step 4: Verification Standards Going Forward

### For Touch/Gesture Features:
**MUST test on:**
- [ ] Real physical device in Expo Go (primary)
- [ ] iOS Simulator (secondary, if available)
- [ ] Android Emulator (secondary, if available)

**Web testing is NOT sufficient** for touch/gesture features.

### For Visual Features (lighting, morphing):
**MUST provide:**
- [ ] Screenshots from device (not web)
- [ ] Multiple angles (front/back/side for lighting)
- [ ] Multiple values (0.0, 0.5, 1.0 for morphing)

### For Performance Features (zoom freeze):
**MUST test:**
- [ ] Rapid interaction (20-30 times) on device
- [ ] Monitor for lag/freeze/crash
- [ ] Device-specific performance (older devices may behave differently)

---

## Current Code State

**Speculative Fixes Applied (NOT YET VERIFIED):**
1. Touch responder handlers in ThreeDPreview.tsx
2. Touch responder handlers in Preview3D.tsx
3. eventSource/eventPrefix props on Canvas
4. makeDefault prop on OrbitControls
5. collapsable={false} on container Views
6. Comprehensive touch logging

**These may be:**
- Correct and solving the issue ✓
- Partially correct but incomplete ⚠️
- Unnecessary and doing nothing 〰️
- Conflicting with each other and making it worse ✗

**We won't know until real device testing is complete.**

---

## What NOT to Do

❌ **DO NOT** add more OrbitControls props
❌ **DO NOT** add more responder handlers
❌ **DO NOT** try different Canvas configurations
❌ **DO NOT** add more touch event wrappers
❌ **DO NOT** assume web behavior matches native behavior
❌ **DO NOT** report features as "fixed" without device evidence

---

## Next Action

**USER:** Please complete Step 1 (test on device) and Step 2 (report results) above.

**DEVELOPER:** Will wait for real evidence before making any more changes.

---

**Remember:** The goal is to identify the ACTUAL problem with REAL EVIDENCE, then apply ONE TARGETED FIX, not to layer on more speculative solutions.
