# Gesture Controls Fix - Testing Protocol

**Date:** Wednesday, September 16, 2026  
**Fix Applied:** Replaced OrbitControls with custom React Native-compatible CameraController

---

## What Changed

### Problem Identified (Evidence-Based)
**Console logs showed:** `[ThreeDPreview] Touch captured!` and `Touch moving!`  
**Conclusion:** Touch events WERE reaching the component, but OrbitControls (from @react-three/drei) was not responding because it only works on web with mouse events.

### Solution Implemented
**Removed:** OrbitControls (web-only, uses mouse events)  
**Added:** Custom CameraController component that uses:
- react-three-fiber's native pointer/touch events
- Direct canvas event listeners for touchstart/touchmove/touchend
- THREE.Spherical coordinates for camera rotation
- Distance clamping (min=2.0, max=6.0) to keep model visible

**Files Changed:**
- `src/components/CameraController.tsx` (NEW) - Custom camera controller
- `src/components/Preview3D.tsx` - Replaced OrbitControls with CameraController
- `src/components/BodyModel.tsx` - Added mount/update logging

---

## How to Test

### Step 1: Clear Cache and Restart
```powershell
npx expo start --clear
```

### Step 2: Reload App on Device
- Press `r` in terminal, OR
- Shake device → Reload

### Step 3: Navigate to 3D Preview
- Open a project with 3D preview (the screen from your screenshots)

### Step 4: Test Camera Rotation
**Action:** Place ONE finger on 3D model, drag slowly in circles

**Expected Behavior:**
- Model should ROTATE around its center
- Drag left/right → model rotates horizontally
- Drag up/down → model rotates vertically
- Smooth continuous rotation while dragging

**Check Console For:**
```
[BodyModel] Component mounted/updated - bodyType: female morphFactor: 1.00
```

**Report:**
- [ ] Model rotates when I drag
- [ ] Model does NOT rotate (still frozen)
- [ ] Console shows BodyModel logs
- [ ] Console does NOT show BodyModel logs

### Step 5: Test Body Size Slider
**Action:** Move slider from 0.0 → 0.5 → 1.0

**Expected Behavior:**
- Body should visibly change shape
- At 0.0: Slim (all body parts smaller)
- At 1.0: Plus (all body parts larger, not just pelvis)

**Check Console For:**
```
[BodyModel] Component mounted/updated - bodyType: female morphFactor: 0.500
[BodyModel] Applying bone scaling for morphFactor: 0.500
[BodyModel] Found X bones in scene
[BodyModel] Successfully scaled X/31 bones
```

**Report:**
- [ ] Whole body morphs (chest, arms, legs, pelvis)
- [ ] Only pelvis morphs (same as before)
- [ ] No visible morphing at all
- [ ] Console shows bone scaling logs
- [ ] Console does NOT show bone scaling logs

---

## Expected Console Output

### When App Loads:
```
[boneScaling] Sample name translations:
  DEF-spine → DEF-spine
  DEF-spine.001 → DEF-spine001
  DEF-pelvis.L → DEF-pelvisL
[boneScaling] Total bones configured: 31

[BodyModel] Component mounted/updated - bodyType: female morphFactor: 0.26
```

### When You Drag the Model:
```
[ThreeDPreview] Touch captured!
[ThreeDPreview] Touch moving!
(Camera rotation should happen visually)
```

### When You Move the Slider:
```
[BodyModel] Component mounted/updated - bodyType: female morphFactor: 0.500
[BodyModel] Applying bone scaling for morphFactor: 0.500
[BodyModel] Found 156 bones in scene
[BodyModel] Sample: DEF-spine (DEF-spine) scaled to [1.075, 1.000, 1.075]
[BodyModel] Successfully scaled 31/31 bones
```

---

## Possible Outcomes

### Outcome A: Rotation Works, Body Morphing Works
✅ **SUCCESS** - Both issues fixed!
- Camera controller is working
- Bone scaling is working
- All 31 bones are being found and scaled

**Next:** Clean up unnecessary touch logging, document the fix

### Outcome B: Rotation Works, Only Pelvis Morphs
✅ Rotation fixed
⚠️ Bone scaling partial - need to investigate

**Check console for:**
- How many bones were found? (Should be 100+)
- How many bones were scaled? (Should be 31)
- Any "Bone not found" messages?

**Next:** Debug bone name matching

### Outcome C: Rotation Still Doesn't Work
❌ Camera controller not working

**Check console for:**
- Is BodyModel logging appearing at all?
- Are ThreeDPreview touch logs still appearing?

**Next:** Investigate why canvas events aren't working

### Outcome D: No Console Logs At All
❌ App may not have reloaded, or logging suppressed

**Actions:**
- Verify app reloaded (check app version or add obvious visual change)
- Check Metro terminal is showing ANY logs
- Try adding console.log in App.tsx to verify logging works

---

## What to Share

Please provide:

1. **Clear statement:**
   - "Model rotates when I drag: YES / NO"
   - "Whole body morphs: YES / NO / ONLY PELVIS"

2. **Console output:**
   - Copy/paste ALL lines that mention:
     - `[boneScaling]`
     - `[BodyModel]`
     - `[ThreeDPreview]`

3. **Screenshots (optional but helpful):**
   - Body at slider 0.0
   - Body at slider 1.0
   - Show if morphing affects whole body or just pelvis

---

## Technical Notes

### Why OrbitControls Didn't Work
- @react-three/drei's OrbitControls is designed for web browsers
- Uses mouse events (mousedown, mousemove, mouseup)
- React Native uses touch responder system (completely different API)
- Touch events reached the component but OrbitControls ignored them

### Why Custom Controller Should Work
- Uses react-three-fiber's unified pointer events
- Works on both web (mouse) and native (touch)
- Directly attaches to canvas element with touch/pointer listeners
- Uses THREE.Spherical for proper 3D rotation math

### Why Bone Scaling Might Show Only Pelvis
- If bone names don't match, only some bones are found
- Console logs will show "Successfully scaled X/31" where X < 31
- Need to see actual bone names in GLB to fix translation

---

**Status:** Fix implemented, awaiting device test results
