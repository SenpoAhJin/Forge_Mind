# FE-3D Milestone 2 — Critical Bug Fixes

**Date:** Wednesday, September 16, 2026  
**Issues:** Three.js import warning, non-interactive 3D preview, non-functional body morphing

---

## 🐛 Bugs Identified from Device Testing

### Bug 1: Multiple Three.js Import Warning ❌
**Symptom:**
```
WARNING: Multiple instances of Three.js being imported.
```

**Root Cause:**
`BodyModel.tsx` was importing `import * as THREE from 'three'`, but react-three-fiber already imports Three.js internally, causing duplicate module instances.

**Fix Applied:**
Changed from wildcard import to type-only import:
```typescript
// Before
import * as THREE from 'three';

// After
import type { Bone, SkinnedMesh } from 'three';
```

Also changed `instanceof` checks to `.type` property checks:
```typescript
// Before
if (child instanceof THREE.Bone) { ... }

// After  
if (child.type === 'Bone') { ... }
```

**Files Modified:**
- `src/components/BodyModel.tsx`

---

### Bug 2: 3D Preview Not Interactive (Static/Frozen) ❌
**Symptom:**
- User cannot rotate, pan, or zoom the 3D model
- Touch/drag gestures do nothing
- Model appears frozen/static

**Root Cause:**
The Canvas component is inside a ScrollView in `ProjectDashboardScreen.tsx`. ScrollView intercepts all touch events by default, preventing OrbitControls from receiving gestures.

**Fix Applied:**
Added responder capture to the Preview3D container View:
```typescript
<View 
  style={styles.container}
  onStartShouldSetResponder={() => true}
  onMoveShouldSetResponder={() => true}
>
  <Canvas ... />
</View>
```

**How It Works:**
- `onStartShouldSetResponder={() => true}` tells React Native: "This View wants to handle touch events"
- `onMoveShouldSetResponder={() => true}` tells React Native: "This View wants to handle move/drag events"
- These return `true`, which means the View claims touch priority over the parent ScrollView
- Touch events now reach the Canvas and OrbitControls

**Files Modified:**
- `src/components/Preview3D.tsx`

---

### Bug 3: Body Morphing Not Working ❌
**Symptom:**
- Body looks identical at slider values 0.26 and 1.00
- No visible morphing when dragging slider
- Bone scaling not applying

**Suspected Root Causes:**

**Cause 1: Bone Names Don't Match**
- Blender exports: `"DEF-pelvis.L"`, `"DEF-spine.001"`
- Three.js may strip dots: `"DEF-pelvisL"`, `"DEF-spine001"`
- If names don't match, bones won't be found in the scene
- Utility assumes dot-stripping, but this needs verification

**Cause 2: Bones Not Found in Scene**
- GLB file might not contain bone hierarchy
- Bones might have different names than expected
- Scene traversal might not be finding bones

**Cause 3: Scale Not Propagating**
- Bone scale set correctly but skinned mesh not updating
- Skeleton update not triggering re-render
- Scene caching preventing updates

**Debugging Added:**
Added extensive console logging to diagnose:

**In `boneScaling.ts`:**
```typescript
// Logs sample name translations on module load
console.log('[boneScaling] Sample name translations:');
console.log('  DEF-spine → DEF-spine');
console.log('  DEF-spine.001 → DEF-spine001');
console.log('  DEF-pelvis.L → DEF-pelvisL');
console.log('[boneScaling] Total bones configured: 31');
```

**In `BodyModel.tsx`:**
```typescript
// Logs when bone scaling is triggered
console.log(`[BodyModel] Applying bone scaling for morphFactor: ${morphFactor.toFixed(3)}`);

// Logs how many bones were found
console.log(`[BodyModel] Found ${Object.keys(bones).length} bones in scene`);

// Logs sample bone scaling
console.log(`[BodyModel] Sample: DEF-spine (DEF-spine) scaled to [1.038, 1.000, 1.038]`);

// Logs bones that weren't found
console.log(`[BodyModel] Bone not found: DEF-pelvis.L (DEF-pelvisL)`);

// Logs final count
console.log(`[BodyModel] Successfully scaled 31/31 bones`);
```

**What to Check in Console:**
1. **On app load:** Should see bone scaling utility initialization
2. **When slider moves:** Should see morphFactor value logged
3. **Bone count:** Should find many bones (expect 100+ in full Rigify rig)
4. **Scaled count:** Should show "Successfully scaled X/31 bones" where X > 0
5. **Missing bones:** If many "Bone not found" logs, names don't match

**Expected Console Output (Good Case):**
```
[boneScaling] Sample name translations:
  DEF-spine → DEF-spine
  DEF-spine.001 → DEF-spine001
  DEF-pelvis.L → DEF-pelvisL
[boneScaling] Total bones configured: 31

[BodyModel] Applying bone scaling for morphFactor: 0.260
[BodyModel] Found 156 bones in scene
[BodyModel] Sample: DEF-spine (DEF-spine) scaled to [1.039, 1.000, 1.039]
[BodyModel] Successfully scaled 31/31 bones

[BodyModel] Applying bone scaling for morphFactor: 1.000
[BodyModel] Found 156 bones in scene
[BodyModel] Sample: DEF-spine (DEF-spine) scaled to [1.150, 1.000, 1.150]
[BodyModel] Successfully scaled 31/31 bones
```

**Expected Console Output (Bad Case - Names Don't Match):**
```
[BodyModel] Applying bone scaling for morphFactor: 0.260
[BodyModel] Found 156 bones in scene
[BodyModel] Bone not found: DEF-spine (DEF-spine)
[BodyModel] Bone not found: DEF-spine.001 (DEF-spine001)
[BodyModel] Bone not found: DEF-pelvis.L (DEF-pelvisL)
[BodyModel] Successfully scaled 0/31 bones
```

**Files Modified:**
- `src/components/BodyModel.tsx` (extensive logging)
- `src/utils/boneScaling.ts` (name translation logging)

---

## 📋 Testing Instructions

### Test 1: Verify Three.js Warning Gone
1. Start app, navigate to project with 3D preview
2. Check console logs
3. **Expected:** No "Multiple instances of Three.js" warning
4. **If warning persists:** Check for other files importing `three` directly

### Test 2: Verify 3D Preview Interactive
1. Navigate to project dashboard with 3D preview
2. Try to drag/rotate the model
3. **Expected:** Model rotates smoothly when dragging
4. Try pinch to zoom
5. **Expected:** Model zooms in/out
6. **If still frozen:** Check console for touch event errors

### Test 3: Verify Body Morphing Works
1. Open project dashboard
2. Move "Adjust Body Size" slider to 0.00
3. **Expected:** Console shows "morphFactor: 0.000", body should look slim
4. Move slider to 1.00
5. **Expected:** Console shows "morphFactor: 1.000", body should look noticeably wider
6. Check console for bone scaling logs
7. **Expected:** "Successfully scaled 31/31 bones" (or close to 31)

**If morphing still doesn't work:**
- Share console logs (especially bone count and scaled count)
- We may need to inspect the GLB file structure
- May need to adjust bone name translation logic

---

## 🔍 Additional Diagnostics

### Check Bone Names in GLB File
If morphing still doesn't work after these fixes, we need to inspect the actual bone names in the GLB:

**Add this temporary code to BodyModel.tsx:**
```typescript
useEffect(() => {
  if (!gltf.scene) return;
  
  // Log ALL bone names found in the scene
  const allBones: string[] = [];
  gltf.scene.traverse((child) => {
    if (child.type === 'Bone') {
      allBones.push(child.name);
    }
  });
  
  console.log('[BodyModel] ALL BONES IN SCENE:');
  console.log(allBones.join(', '));
}, [gltf.scene]);
```

This will show us the exact bone names Three.js sees, so we can adjust the translation logic if needed.

---

## ✅ Verification Checklist

**Before This Fix:**
- [ ] ❌ Three.js warning appears in console
- [ ] ❌ 3D preview frozen, cannot interact
- [ ] ❌ Body looks same at 0.26 and 1.00
- [ ] ❌ No console logs from bone scaling

**After This Fix:**
- [ ] Three.js warning gone
- [ ] Can rotate 3D preview with drag
- [ ] Can zoom 3D preview with pinch
- [ ] Console shows bone scaling logs when slider moves
- [ ] Body morphs visibly between slim (0.0) and plus (1.0)
- [ ] Slider value displayed updates correctly
- [ ] Male/Female buttons work (already confirmed working)

---

## 📊 Files Changed

**Modified (3 files):**
- `src/components/BodyModel.tsx` - Fixed Three.js import, added extensive logging
- `src/components/Preview3D.tsx` - Added touch responder to capture gestures
- `src/utils/boneScaling.ts` - Added name translation logging

**Total Changes:**
- ~30 lines of logging added
- 2 import statements changed
- 2 responder props added
- TypeScript: **0 errors, 0 warnings**

---

## 🎯 Next Steps

1. **Restart Expo Dev Server:**
   ```powershell
   npx expo start --clear
   ```

2. **Reload App in Expo Go:**
   - Press `r` in terminal to reload
   - Or shake device and tap "Reload"

3. **Test All Three Issues:**
   - Check console for Three.js warning (should be gone)
   - Try rotating 3D preview (should work now)
   - Move slider and check console logs (should see bone scaling logs)

4. **Share Console Output:**
   - If morphing still doesn't work, copy console logs
   - Especially the bone count and scaled count lines
   - This will tell us if bone names match or need adjustment

---

## 💡 Why These Fixes Work

**Three.js Import Fix:**
- Type-only import doesn't create new module instance
- Uses types from existing Three.js loaded by react-three-fiber
- No runtime code duplication

**Touch Responder Fix:**
- React Native's responder system has priority chain
- ScrollView normally claims all touch events
- `onStartShouldSetResponder={() => true}` overrides this
- Canvas now receives touch events directly

**Bone Scaling Logging:**
- Shows exactly what's happening during morphing
- Confirms bone names match (or don't match)
- Shows scaling values being applied
- Helps diagnose if issue is names, scene structure, or update propagation

---

**Status:** Fixes implemented, awaiting device testing verification
