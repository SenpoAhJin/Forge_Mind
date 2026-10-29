# GARMENT-3a2 Progress Report

## Step 0: Git Setup
- Branch: task/garment3a-body-frame (continuing from GARMENT-3a)
- Status: clean working tree
- Baseline tsc errors: 39

## Step 2: Before Fix - Projection Test
Canvas aspects: test=0.9375 (375/400), prod=1.5 (SCREEN_WIDTH / (SCREEN_WIDTH/1.5))

**V1 BASELINE (target at origin [0,0,0]):**
- male test: center NDC [0.0000, -0.0050], bounds Y[-0.5326, 0.5931]
- male prod: center NDC [0.0000, -0.0079], bounds Y[-0.8467, 0.9514]
- female test: center NDC [0.0000, -0.0020], bounds Y[-0.5356, 0.5958]
- female prod: center NDC [0.0000, -0.0031], bounds Y[-0.8568, 0.9561]

**V2 BEFORE FIX (target at origin [0,0,0]):**
- male test: center NDC [0.0000, 0.5036] ❌ FAR ABOVE CENTER
- male prod: center NDC [0.0000, 0.7796] ❌ WORSE, maxY=2.0769 (HEAD CUT OFF)
- female test: center NDC [0.0000, 0.5037] ❌ FAR ABOVE CENTER
- female prod: center NDC [0.0000, 0.7797] ❌ WORSE, maxY=2.0770 (HEAD CUT OFF)

## Step 3: Fix Applied
Files changed:
- src/components/Preview3D.tsx: OrbitControls target={cameraConfig.target}
- src/screens/cosplayer/ProjectPlanningScreen.tsx: OrbitControls target={cameraConfig.target}
- tools/test_camera_framing.mjs: created numerical test with assertions

No camera distance changes needed - position and target both work from cameraFraming helper.

## Step 4: After Fix - All Assertions PASS
**V1 AFTER FIX (target at centerY ≈ -0.009 male, -0.004 female):**
- male test: center NDC [0.0000, -0.0000], bounds Y[-0.5293, 0.5977] ✅
- male prod: center NDC [0.0000, -0.0000], bounds Y[-0.8376, 0.9608] ✅
- female test: center NDC [0.0000, 0.0000], bounds Y[-0.5319, 0.5995] ✅
- female prod: center NDC [0.0000, 0.0000], bounds Y[-0.8532, 0.9598] ✅

**V2 AFTER FIX (target at centerY ≈ 0.950):**
- male test: center NDC [0.0000, -0.0000], bounds Y[-0.5317, 0.5977] ✅
- male prod: center NDC [0.0000, 0.0000], bounds Y[-0.8486, 0.9595] ✅
- female test: center NDC [0.0000, -0.0000], bounds Y[-0.5293, 0.5977] ✅
- female prod: center NDC [0.0000, 0.0000], bounds Y[-0.8425, 0.9595] ✅

All assertions pass:
a. Bbox center within 0.05 NDC of canvas center: ✅
b. All points (8 corners + headroom) within NDC ±0.97: ✅
c. V1 center NDC unchanged from baseline (tolerance 0.05): ✅

## Step 5: Verification Results
a. npx tsc --noEmit: 39 errors (SAME AS BASELINE) ✅
b. node scripts/verify-glb-models.mjs: PASS (15 passed, 0 failed) ✅
c. node tools/test_camera_framing.mjs: exit 0 (ALL TESTS PASSED) ✅
c. node tools/test_attach_module.mjs: exit 0 (99 passed, 0 failed) ✅
d. npx expo export --platform web: SUCCESS ✅
   - V2 GLBs: N/A (V2 assets not yet present, expected)

## Step 1: Root Cause Analysis
**ROOT CAUSE CONFIRMED:**

Preview3D.tsx line 139: `camera={{ position: cameraConfig.position, fov: cameraConfig.fov }}`
- OrbitControls target is NOT SET, defaults to [0,0,0]
- Camera position IS SET from cameraConfig (from computeCameraFraming)

ProjectPlanningScreen.tsx line 191: `camera={{ position: cameraConfig.position, fov: cameraConfig.fov }}`
- OrbitControls target is NOT SET, defaults to [0,0,0]
- Camera position IS SET from cameraConfig

cameraFraming.ts line 64: `return { position, target, fov };`
- Helper COMPUTES target but it is NEVER USED in either screen

**Evidence:**
- computeCameraFraming returns `target: [0, centerY, 0]` where centerY ≈ 0.95 for V2
- But neither screen applies this target to OrbitControls
- OrbitControls defaults target to [0, 0, 0] (origin)
- Camera looks at feet, not at body center
