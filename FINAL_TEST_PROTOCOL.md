# Final Test Protocol - Evidence-Based Debugging

**Status:** On-screen debug added, stale bundle test ready

---

## Step 1: MUST DO FIRST - Clear Stale Bundle

### Kill Metro and Clear Cache
```powershell
# Stop Metro (Ctrl+C)
npx expo start -c
```

### Force Close Expo Go
- Android: Settings → Apps → Expo Go → Force Stop
- iOS: Swipe up, close app, wait 3 seconds
- **Reopen Expo Go** fresh

### Load Project Fresh
- **Scan QR code from terminal** (don't use "recently opened")
- Navigate to project with 3D preview

---

## Step 2: Check On-Screen Debug Display

### What You Should See

**Red banner at top of 3D preview:**
```
Touches: 0 | Updated: [time]
```

**This proves:**
- Code IS running (visual proof independent of console)
- Component mounted successfully
- State management works

### Test Touch Events

1. **Touch the 3D model once**
2. **Watch the red banner** - touch count should increment
3. **Touch again** - count should increment again

**Report:**
- [ ] Red banner visible: YES / NO
- [ ] Touch count increases: YES / NO
- [ ] Model rotates: YES / NO

---

## Step 3: Enable Bone Scaling Debug (Optional)

To see which bones are found/missing, temporarily edit ProjectDashboardScreen.tsx:

```typescript
<ThreeDPreview 
  bodySizeValue={localBodySize} 
  bodyType={bodyType}
  width={300} 
  height={400}
  showBoneDebug={true}  // ADD THIS LINE
/>
```

This will show:
- Total bones in scene
- How many configured bones were found (X/31)
- List of each bone with ✓ (found) or ✗ (not found)

---

## Step 4: Check Console Logs

**After fresh reload, check terminal for:**

```
[boneScaling] Sample name translations:
  DEF-spine → DEF-spine
  DEF-spine.001 → DEF-spine001
  DEF-pelvis.L → DEF-pelvisL
[boneScaling] Total bones configured: 31

[BodyModel] Component mounted/updated - bodyType: female morphFactor: 1.00
```

**If you see these logs:**
- Stale bundle was the problem
- Code is now actually running
- Can proceed to diagnose based on what logs say

**If you still don't see logs:**
- Console logging unreliable (rely on on-screen debug instead)
- Red banner proves code runs even without console

---

## Step 5: Test Bone Scaling

1. Move slider to 0.0
2. Move slider to 1.0
3. **Watch the model**

**With showBoneDebug={true}:**
- Shows how many bones found
- Shows which specific bones are missing
- This definitively answers why only pelvis morphs

**Expected problem:**
- Most bones NOT FOUND (shown in red with ✗)
- Bone names in JSON have dots: "DEF-spine.001"
- Bone names in GLB don't have dots: "DEF-spine001"
- Translation not working properly

---

## What to Report

### Minimum (without bone debug):
1. **Red banner visible:** YES / NO
2. **Touch count increases when touched:** YES / NO
3. **Model rotates when dragged:** YES / NO
4. **Console shows BodyModel logs:** YES / NO
5. **Whole body morphs or just pelvis:** WHOLE / PELVIS / NONE

### With Bone Debug Enabled:
6. **Total bones in scene:** [number]
7. **Configured bones found:** [X]/31
8. **Screenshot of bone debug overlay** showing which bones are red (✗)

---

## Expected Outcomes

### Outcome A: Red Banner Works, Model Rotates
✅ Touch events work
✅ CameraController works
✅ Code is running
**Next:** Fix bone scaling based on debug info

### Outcome B: Red Banner Works, Model Doesn't Rotate
✅ Touch events work
❌ CameraController not working
**Diagnosis:** Canvas events not reaching CameraController
**Next:** Investigate why camera controls don't respond

### Outcome C: Red Banner Works, Bone Debug Shows Most Bones Missing
✅ Touch events work
❌ Bone name translation not working
**Diagnosis:** Dots not being stripped, or stripped incorrectly
**Next:** Fix bone name translation logic

### Outcome D: No Red Banner Visible
❌ Component not mounting or rendering
**Diagnosis:** Deeper React Native rendering issue
**Next:** Add even more basic proof-of-life (e.g., solid color background change)

---

##Actions Required

**USER:** 
1. Kill Metro, restart with `-c`
2. Force close Expo Go, reopen fresh
3. Scan QR code, navigate to 3D preview
4. Report what you see on screen (red banner? touch count?)
5. Try touching model, report if count increases
6. Optionally enable bone debug and share screenshot

**DEVELOPER:**
- Will NOT make more changes until user provides evidence above
- Will diagnose based on ACTUAL behavior observed
- Will fix ONE confirmed problem at a time

---

**Critical:** Do the stale bundle clear FIRST before any conclusions.
