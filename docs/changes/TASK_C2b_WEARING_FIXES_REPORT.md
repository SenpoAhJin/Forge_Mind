# Task C2b: Wearing Scaffold Fixes — Final Report

**Date:** Wednesday, October 14, 2026  
**Branch:** feature/chat-app (forgemind-mobile)

---

**STATUS: finished**

All 6 steps completed with evidence:

**STEP 1: TRANSFORM GROUP** ✅
- Evidence: Documented at `STEP1_TRANSFORM_ANALYSIS.md`
- BodyModel.tsx:75 renders `<primitive object={gltf.scene} />` at world origin
- GarmentLayer.tsx:115-118 returns primitives, no wrapper group
- Both are siblings in scene graph at origin - correct for Blender-fitted garments
- tsc exit 0
- Commit: `5d25c7a`

**STEP 2: PER-BODY BOUNDS AND PLACEHOLDER** ✅
- Evidence: Created `src/data/bodyBounds.ts` with male/female min/max from context
- Male bounds: min [-0.440, -0.950, -0.174], max [0.436, 0.931, 0.150]
- Female bounds: min [-0.404, -0.951, -0.185], max [0.399, 0.944, 0.189]
- Replaced placeholder: sphere at Y=0.75 → cylinder above head top
- New placeholder: id `placeholder-head-hat`, type cylinder, position function using `getHeadTopY(bodyType)`, scale [0.12, 0.12, 0.12], label "Head Hat (placeholder)"
- Updated PlaceholderShape.position type to support `[x,y,z] | ((bodyType) => [x,y,z])`
- Updated GarmentLayer.tsx PlaceholderPrimitive to resolve function positions
- tsc exit 0
- Commit: `3417cd2`

**STEP 3: SLOT NAMES** ✅
- Evidence: Aligned to head/torso/legs/hands/prop (5 slots, removed feet/accessories)
- Updated `scripts/check_garment_registry.js` VALID_SLOTS line 19
- Updated `docs/GARMENT_SPEC.md` slot anchor table (removed feet row, updated prop)
- Registry already correct at garmentRegistry.ts:13
- Validation script exit 0 (1 entry, 0 errors, 0 warnings)
- tsc exit 0
- Commit: `1cb9500`

**STEP 4: BUNDLING REAL GLBs** ✅
- Evidence: Changed asset field to static import pattern like BodyModel
- BodyModel.tsx:5-6 uses `import MALE_GLTF from '../../assets/models/3D_Model_Male.glb'`
- Updated GarmentEntry.asset type from `number | string | null` to `number | null`
- Updated `docs/GARMENT_SPEC.md` example: two-step (import statement + use constant)
- Updated `scripts/check_garment_registry.js` to verify import exists for non-null assets
- Validation script exit 0
- tsc exit 0
- Commit: `69b0a7e`

**STEP 5: SPEC CORRECTIONS** ✅
- Evidence: Calculated and documented bounding box centers
- Male center: [(-0.440+0.436)/2, (-0.950+0.931)/2, (-0.174+0.150)/2] = [-0.002, -0.010, -0.012]
- Female center: [(-0.404+0.399)/2, (-0.951+0.944)/2, (-0.185+0.189)/2] = [-0.003, -0.004, 0.002]
- Updated `docs/GARMENT_SPEC.md` Body Measurements table: added "Bounding Box Center" row
- Removed "Origin Match: NO" claim, replaced with accurate statement: centers within 0.014 units (nearly identical), one garment could fit both but visual check still required (male wider, female taller)
- tsc exit 0
- Commit: `86e906d`

**STEP 6: CHANGELOG.md UPDATE** ✅
- Evidence: Added dated entry "Wednesday, October 14, 2026 (Wearing pipeline fixes)"
- Summary: transform verified, per-body placeholder, slot names aligned, asset bundling fixed, spec corrected
- Listed all 6 commits with messages
- States plainly: NO REAL GARMENT EXISTS, nothing tested on device
- tsc exit 0
- Commit: `5865cb4`

---

## DONE BY AGENT

1. ✅ Verified transform group structure (BodyModel and GarmentLayer both at world origin - correct)
2. ✅ Created bodyBounds.ts module with male/female min/max coordinates
3. ✅ Replaced placeholder sphere-inside-head with visible cylinder-above-head using per-body bounds
4. ✅ Made placeholder position per-body (function that computes from bodyType)
5. ✅ Aligned slot names to head/torso/legs/hands/prop in registry type, check script, and spec docs
6. ✅ Changed asset field to use static imports like BodyModel (removed string support)
7. ✅ Updated GARMENT_SPEC.md example to show two-step import pattern
8. ✅ Updated check script to verify imports exist for non-null assets
9. ✅ Calculated actual bounding box centers (male [-0.002, -0.010, -0.012], female [-0.003, -0.004, 0.002])
10. ✅ Corrected spec: centers nearly identical (within 0.014 units), one garment could fit both but visual check required
11. ✅ Updated CHANGELOG.md with all changes, stated NO REAL GARMENT EXISTS
12. ✅ Made 6 commits with clear messages
13. ✅ All tsc checks exit 0
14. ✅ All validation checks exit 0

---

## NEEDS YOU

### 1. Test placeholder hat on physical device
**What:** Open Expo Go on phone, navigate to Preview3DTestScreen, toggle "Head Hat (placeholder)" on
**Where:** Preview3DTestScreen or ProjectDashboardScreen 3D preview
**Expected:** Red cylinder appears ABOVE head (not inside), positioned at Y ≈ 0.99 for male (0.931+0.06) and Y ≈ 1.00 for female (0.944+0.06)
**Why:** Verify per-body positioning works correctly and placeholder is visible from all angles

### 2. Test placeholder on opposite body type
**What:** Switch from male to female (or vice versa), toggle placeholder on again
**Where:** Same screens as above
**Expected:** Cylinder appears at slightly different Y position (0.013 unit difference between bodies), but same relative position above head
**Why:** Verify per-body position function computes correctly for both body types

### 3. Add real garment GLB and test bundling
**What:** 
1. Export garment GLB from Blender following GARMENT_SPEC.md
2. Place in `assets/models/garments/YourGarment.glb`
3. Add import at top of garmentRegistry.ts: `import YOUR_GARMENT from '../../assets/models/garments/YourGarment.glb';`
4. Add registry entry with `asset: YOUR_GARMENT`
5. Run `node scripts/check_garment_registry.js` (should pass)
6. Run `npx tsc --noEmit` (should exit 0)
7. Test on device
**Where:** garmentRegistry.ts, device Preview3DTestScreen
**Why:** Verify static import bundling pattern works end-to-end with real garment file

---

**GAPS: 3**

(Test placeholder on male body, test placeholder on female body, add real garment and verify bundling)

---

## Summary

Wearing pipeline fixes complete. Key improvements:
- Transform structure verified correct (both at origin)
- Placeholder now visible above head, not inside
- Placeholder position computed per-body using actual bounding box measurements
- Slot names consistent across all files (5 slots)
- Asset bundling matches BodyModel pattern (static imports only)
- Spec corrected: body centers nearly identical (within 0.014 units)

All code changes compile (tsc exit 0) and validate (check script exit 0). NO REAL GARMENT EXISTS - placeholder demonstrates pipeline only. Device testing required to verify visual positioning.
