# GARMENT-3a2 Final Report

## 1. Step 0 Result and TypeScript Baseline
- Branch: task/garment3a-body-frame (continuing from GARMENT-3a)
- Baseline tsc errors: 39 (unchanged after fix)
- Working tree clean, committed and pushed

## 2. Root Cause
**OrbitControls target not set, defaults to [0,0,0]**

Evidence:
- Preview3D.tsx:139 — camera position set from cameraConfig, target not passed to OrbitControls
- ProjectPlanningScreen.tsx:191 — same issue
- cameraFraming.ts:64 — helper computes target = [0, centerY, 0] but neither screen uses it

For V2 bodies (centerY ≈ 0.95m, feet at y=0), camera looks at origin (feet) instead of body center, causing body to render 0.5+ NDC units above canvas center with head clipped.

## 3. Before and After Projection Table

Canvas aspects: test=0.9375 (375/400), prod=1.5 (wider)

| Body Set | Gender | Canvas | Before (target [0,0,0]) | After (target [0,centerY,0]) | NDC Range Y (after) |
|----------|--------|--------|-------------------------|------------------------------|---------------------|
| V1       | male   | test   | [0.0000, -0.0050]       | [0.0000, -0.0000]            | [-0.5293, 0.5977]   |
| V1       | male   | prod   | [0.0000, -0.0079]       | [0.0000, -0.0000]            | [-0.8376, 0.9608]   |
| V1       | female | test   | [0.0000, -0.0020]       | [0.0000,  0.0000]            | [-0.5319, 0.5995]   |
| V1       | female | prod   | [0.0000, -0.0031]       | [0.0000,  0.0000]            | [-0.8532, 0.9598]   |
| V2       | male   | test   | [0.0000,  0.5036] ❌    | [0.0000, -0.0000] ✅         | [-0.5317, 0.5977]   |
| V2       | male   | prod   | [0.0000,  0.7796] ❌    | [0.0000,  0.0000] ✅         | [-0.8486, 0.9595]   |
| V2       | female | test   | [0.0000,  0.5037] ❌    | [0.0000, -0.0000] ✅         | [-0.5293, 0.5977]   |
| V2       | female | prod   | [0.0000,  0.7797] ❌    | [0.0000,  0.0000] ✅         | [-0.8425, 0.9595]   |

V2 center shifted from 0.50-0.78 NDC (far above center) to 0.0000 (centered).
V1 center changed by < 0.01 NDC (visually identical).

## 4. Step 5 Verification Results

### a. TypeScript Errors
```
npx tsc --noEmit: 39 errors (SAME AS BASELINE) ✅
```

### b. V1 GLB Models
```
node scripts/verify-glb-models.mjs: PASS ✅
- 15 checks passed, 0 failed
- Both V1 bodies (male/female) verified
```

### c. Test Scripts
```
node tools/test_camera_framing.mjs: exit 0 ✅
- ALL TESTS PASSED (0 failures)
- All assertions pass:
  a. Bbox center within 0.05 NDC of canvas center
  b. All points within NDC ±0.97 (body + 0.15m headroom fully visible)
  c. V1 center NDC unchanged from baseline (tol 0.05)

node tools/test_attach_module.mjs: exit 0 ✅
- 99 passed, 0 failed
```

### d. Expo Export
```
npx expo export --platform web: SUCCESS ✅
- Export completed without errors
- Output: dist/ (7.5MB main bundle)
- V2 GLBs: N/A (V2 body assets not yet present, expected for this task)
```

## 5. Nothing BLOCKED

All steps completed successfully. No blockers encountered.

## 6. Device Testing Instructions

**NOT TESTED** (requires physical device):

### What to Check:
1. **Profile Screen** — 3D body preview
2. **3D Preview Test Screen** (dev menu) — V1/V2 body toggle

### Expected Behavior:

**V1 (default, production):**
- Body vertically centered in canvas
- Head and feet both visible
- No clipping at top or bottom
- Visual appearance UNCHANGED from before this task

**V2 (dev toggle only):**
- Body vertically centered in canvas ✅ (was FAR ABOVE CENTER before)
- Head fully visible ✅ (was CUT OFF at top before)
- Feet visible at bottom
- White wig cap near pelvis (EXPECTED — legacy garments fit V1, not V2)

### How to Test:
1. Open app on physical device via Expo Go
2. Navigate to 3D Preview Test screen (from dev menu)
3. Toggle between V1 and V2 using the body set buttons
4. Toggle between male and female
5. Rotate camera, zoom in/out
6. Verify body stays centered and fully visible in all cases

### Success Criteria:
- V1: No visible change from before (baseline behavior preserved)
- V2: Body centered, head visible, no top clipping
- Both: Smooth camera controls, 60fps rendering

---

**Commit:** 99baab8 on branch task/garment3a-body-frame
**Pushed:** Yes
**Files Changed:** Preview3D.tsx, ProjectPlanningScreen.tsx, test_camera_framing.mjs, GARMENT3A2_PROGRESS.md, CHANGELOG.md
