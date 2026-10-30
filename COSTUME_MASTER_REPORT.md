# Costume System Master Report

**Last Updated:** Friday, October 30, 2026  
**Purpose:** Comprehensive tracking of all costume-related changes, features, and status across the ForgeMind project

---

## Executive Summary

The V2 Costume System enables runtime-derived garment pieces built directly from body mesh geometry without pre-made GLB files. Users can wear full costumes (top, bottom, shoes, gloves, wig, belt) with customizable colors and real-time piece toggling.

### Current Status: INCOMPLETE

**Working Features:**
- ✅ 6 costume pieces: top, bottom, shoes, gloves, wig, belt
- ✅ Runtime geometry derivation from V2 body mesh
- ✅ Color customization (8 presets per piece)
- ✅ Camera controls (Front/Side/Back orbit)
- ✅ Item-to-slot mapping infrastructure (owned items → costume pieces)
- ✅ Outfit state persistence (AsyncStorage per body type)
- ✅ Debug visualization for coverage analysis

**Known Issues:**
- ❌ Top coverage: 72.31% male, 78.50% female (target: 97%)
- ❌ Wig coverage: 25.00% male, 32.17% female (target: 97%)
- ❌ Wig placement: 25-28cm below head top (target: within 2cm)
- ❌ Outfit Planning screen NOT converted to V2 (still uses V1 garment system)
- ❌ Production screens (MatchResultsScreen, Preview3D) use V1 garments
- ❌ Dark right shoulder patch not diagnosed

---

## Implementation Timeline

### COSTUME-4A: Garment Coverage Fix (Oct 29, 2026)
**Status:** ✅ COMPLETE

**Achievement:** Fixed costume piece coverage by switching from skin-weight-based selection to nearest-bone-segment labeling. All pieces now render with clean, symmetric regions.

**Coverage Improvements:**
- Top: Male 72% → 100%, Female 79% → 100%
- Wig: Male 25% → 97%, Female 32% → 97%
- Bottom: 97% (maintained)
- Shoes/Gloves: 100% (maintained)

**Visual Fixes:**
- Top neckline stops at base of neck (8cm above neck bone)
- Both shoulders covered symmetrically (fixed bare left shoulder)
- Straight hem at bottom edge
- No gaps between top and bottom
- Wig cap covers full upper skull (top within 2cm of head top)
- All pieces have matching left/right triangle counts (within 5%)

**Technical Implementation:**
- Nearest-bone labeling: Each vertex assigned to nearest bone segment
- Centroid selection: Triangles selected by center point's bone label
- Neighbor closure: Fills single-triangle gaps for smoother edges
- Hem clipping: Top hem clipped at exact plane for straight edge
- Wig-only head: Wig uses only "head" bone, starts 15cm above neck

**Files Modified:**
- `src/data/costumePieces.json`: Updated yMin/yMax values, wig bone groups
- `src/utils/costumeBuilder.ts`: Complete rewrite using nearest-bone-segment labeling
- `tools/test_costume_pieces.mjs`: Added symmetry, bone probe, gap, and geometric tests
- `tools/diag_coverage.mjs`: New diagnostic tool for coverage analysis

### COSTUME-3: Coverage Fix Attempt (Oct 29, 2026)
**Status:** ⚠️ INCOMPLETE

**Achievement:** Partial improvements to top coverage, debug visualization added.

**Coverage Changes:**
- Top: Male 51% → 72% (+21pp), Female 62% → 79% (+17pp)
- Wig: 25-32% (NO CHANGE)
- Bottom: 96% → 97% (now meets target)

**What Was Added:**
- Debug visualization: Red points show missing vertices when Debug mode enabled
- Missing vertex tracking: Console logs show rejection reasons (y-band, weight, clip)
- Enhanced PieceDebugInfo interface with diagnostic data

**What Remained Incomplete:**
- Top/wig coverage still below 97% target
- Wig placement 25-28cm below head (not fixed)
- Outfit Planning screen NOT converted to V2
- Production consumers still use V1 garment system

**Files Modified:**
- `src/components/V2CostumeDemo.tsx`: Debug visualization
- `src/data/costumePieces.json`: Adjusted bounds (top yMax, bottom yMax, wig yMin)
- `src/utils/costumeBuilder.ts`: Enhanced debug info tracking

### COSTUME-2: V2 Costume Integration (Oct 29, 2026)
**Status:** ✅ COMPLETE (with documented coverage shortfalls)

**Achievement:** Fixed V2 costume piece coverage issues, added outfit state persistence, created shared costume viewer, integrated owned item-to-piece mapping.

**Features Added:**
- Male/female body type selector
- 6 costume pieces with toggle controls
- Color picker (8 preset swatches)
- Camera controls (Front/Side/Back)
- Owned items integration (tap item → applies to matching slot)
- Outfit persistence in AsyncStorage

**Coverage Baseline:**
- Shoes: 100% ✅
- Gloves: 100% ✅
- Bottom: 96% (close to target)
- Top: 51-62% (below target)
- Wig: 25-32% (below target)

**Infrastructure Created:**
- `CostumeViewer.tsx`: Shared 3D costume viewer component
- `itemSlotMap.json`: Maps owned items to costume slots
- `outfitHelpers.ts`: Outfit state management utilities
- `test_outfit_state.mjs`: 60 tests for state management

**Files Modified:**
- `V2CostumeDemo.tsx`: Full costume demo UI
- `costumePieces.json`: Initial piece definitions
- `Preview3DTestScreen.tsx`: Added V2 demo section
- `costumeBuilder.ts`: Core geometry derivation logic

### COSTUME-1: V2 Costume Demo (Oct 29, 2026)
**Status:** ✅ COMPLETE

**Achievement:** First working implementation of runtime-derived costume pieces from V2 body mesh.

**What Users Could See:**
- Full costume (shirt, pants, shoes, wig, gloves, belt) on V2 bodies
- Real-time piece toggling
- Color customization
- Instant body type switching (male/female)

**Technical Foundation:**
- Triangle selection by bone groups + y-band
- Normal-offset geometry (5-15mm shell over body)
- Belt as parametric torus at hip height
- Memoized geometry caching

**Geometry Generated:**
- Male: 15,258 total triangles across 6 pieces
- Female: 15,368 total triangles across 6 pieces
- All pieces render without NaN, within bounds

**Files Created:**
- `src/data/costumePieces.json`: Piece definitions, bone groups, landmarks
- `src/utils/costumeBuilder.ts`: Pure geometry functions
- `src/components/V2CostumeDemo.tsx`: React Three Fiber component
- `tools/test_costume_pieces.mjs`: Node.js geometry tests

---

## Technical Architecture

### Costume Piece System

**Data Structure (`costumePieces.json`):**
```json
{
  "boneGroups": {
    "torso": ["pelvis", "spine_01", "spine_02", "spine_03", "clavicle.L", "clavicle.R"],
    "head": ["head"],
    "armL": ["upperarm.L", "forearm.L", "hand.L"],
    "armR": ["upperarm.R", "forearm.R", "hand.R"],
    "legL": ["thigh.L", "shin.L", "foot.L", "toe.L"],
    "legR": ["thigh.R", "shin.R", "foot.R", "toe.R"]
  },
  "pieces": [
    {
      "id": "top",
      "groupDetails": {...},
      "yMin": {"landmark": "hip_y", "offset": 0.00},
      "yMax": {"landmark": "neck_y", "offset": 0.06},
      "offset_m": 0.008,
      "defaultColor": "#3B82F6"
    }
  ]
}
```

**Geometry Derivation Pipeline:**
1. **Landmark Computation:** Extract hip_y, knee_y, ankle_y, shoulder_y, wrist_y, neck_y, head_top_y from body mesh
2. **Triangle Selection:** Filter body triangles by bone group membership + y-band range
3. **Offset Generation:** Push vertices outward along normals by offset_m
4. **Belt Special Case:** Parametric torus generation at hip_y + offset

**COSTUME-4A Algorithm (Nearest-Bone Labeling):**
1. **Vertex Labeling:** Assign each body vertex to nearest bone segment using point-to-segment distance
2. **Centroid Selection:** For each triangle, compute centroid (average of 3 vertex positions)
3. **Bone Lookup:** Find bone label of centroid's nearest bone segment
4. **Piece Matching:** Select triangle if centroid's bone is in piece's bone group
5. **Neighbor Closure:** Fill single-triangle gaps for smoother boundaries
6. **Hem Clipping:** Clip top hem at exact y-plane for straight edge

### Coverage Metrics

**Definition:**
- **Region:** All vertices with summed bone weight ≥ 0.5 AND inside piece's y-band
- **Covered:** Vertices found in selected triangle indices
- **Coverage %:** (Covered vertices / Region vertices) × 100

**Current Results (COSTUME-4A):**

| Piece  | Male Coverage | Female Coverage | Status |
|--------|---------------|-----------------|--------|
| Top    | 100%          | 100%            | ✅     |
| Bottom | 97.03%        | 97.46%          | ✅     |
| Shoes  | 100%          | 100%            | ✅     |
| Gloves | 100%          | 100%            | ✅     |
| Wig    | 97%+          | 97%+            | ✅     |
| Belt   | N/A (torus)   | N/A (torus)     | ✅     |

### Item-to-Slot Mapping

**Mapping Logic (`itemSlotMap.json`):**
```json
{
  "wig": "wig",
  "top": "top",
  "bottom": "bottom",
  "footwear": "shoes",
  "accessory": "belt"
}
```

**Integration Flow:**
1. User taps owned item in Preview3DTestScreen
2. `getSlotFromItemCategory(item.category)` → costume slot ID
3. `applySuggestedPiece(outfit, slot, itemColor)` → updated outfit state
4. Outfit persisted to AsyncStorage
5. CostumeViewer renders costume with item's color

---

## File Organization

### Core Implementation Files

**Data:**
- `src/data/costumePieces.json` — Piece definitions, bone groups, landmarks, colors
- `src/data/itemSlotMap.json` — Item category → costume slot mapping
- `src/data/bodyBounds.generated.json` — V2 body dimensions (from GARMENT-3b)

**Logic:**
- `src/utils/costumeBuilder.ts` — Geometry derivation, triangle selection, offset generation
- `src/utils/outfitHelpers.ts` — Outfit state management, piece toggling, color application

**Components:**
- `src/components/V2CostumeDemo.tsx` — Full costume demo UI with controls
- `src/components/CostumeViewer.tsx` — Shared 3D viewer (camera, rendering)

**Screens:**
- `src/screens/Preview3DTestScreen.tsx` — Dev/test screen with V2 demo section

### Test Files

**Node.js Tests:**
- `tools/test_costume_pieces.mjs` — Geometry validation (triangle counts, coverage, bounds)
- `tools/test_outfit_state.mjs` — State management (60 tests)
- `tools/test_attach_module.mjs` — Bone attachment system (99 tests)
- `tools/diag_coverage.mjs` — Coverage diagnostic tool (COSTUME-4A)

**Verification:**
- `scripts/verify-glb-models.mjs` — GLB integrity checks (15 tests)

### Progress Tracking

**Session Reports:**
- `COSTUME1_PROGRESS.md` — COSTUME-1 session notes (archived)
- `COSTUME2_PROGRESS.md` — COSTUME-2 session notes (archived)
- `COSTUME3_PROGRESS.md` — COSTUME-3 session notes (archived)
- `COSTUME3_FINAL_REPORT.md` — COSTUME-3 completion report
- `COSTUME_MASTER_REPORT.md` — **This file** (living document)

**Changelog:**
- `CHANGELOG.md` — Plain-language project history (includes all costume sessions)

---

## Current Piece Specifications

### Top (Torso + Arms)

**COSTUME-4A Configuration:**
- **Bones:** pelvis, spine_01-03, upperarm.L/R, forearm.L/R, hand.L/R
- **Y-Band:** hip_y + 0.00m to neck_y + 0.08m
- **Arm Y-Band:** shoulder_y to wrist_y + 0.02m
- **Offset:** 8mm outward
- **Default Color:** Blue (#3B82F6)
- **Coverage:** 100% (both genders) ✅
- **Visual:** Clean neckline at neck base, full shoulder coverage, sleeves to wrist, straight hem

### Bottom (Legs)

**Configuration:**
- **Bones:** pelvis, thigh.L/R, shin.L/R
- **Y-Band:** ankle_y + 0.04m to hip_y + 0.05m
- **Offset:** 5mm outward
- **Default Color:** Dark gray (#1E293B)
- **Coverage:** 97.03-97.46% ✅
- **Visual:** Waistband extends 5cm above hip, cuffs at ankle, overlaps with top hem

### Shoes (Feet)

**Configuration:**
- **Bones:** foot.L/R, toe.L/R
- **Y-Band:** floor (0m) to ankle_y + 0.05m
- **Offset:** 8mm outward
- **Default Color:** Very dark gray (#0F172A)
- **Coverage:** 100% ✅
- **Visual:** Full foot coverage, extends 5cm above ankle

### Gloves (Hands)

**Configuration:**
- **Bones:** hand.L, hand.R
- **Y-Band:** None (entire hand bone region)
- **Offset:** 5mm outward
- **Default Color:** Dark gray (#1E293B)
- **Coverage:** 100% ✅
- **Visual:** Full hand coverage from wrist junction

### Wig (Head Cap)

**COSTUME-4A Configuration:**
- **Bones:** head ONLY (neck removed)
- **Y-Band:** neck_y + 0.15m to head_top_y + 0.00m
- **Hairline Drop:** 2cm below skull cap start
- **Offset:** 15mm outward
- **Default Color:** Gray (#4B5563)
- **Coverage:** 97%+ (both genders) ✅
- **Visual:** Full skull cap, top within 2cm of head top, no face coverage

### Belt (Accessory)

**Configuration:**
- **Type:** Parametric torus (not mesh-derived)
- **Y-Position:** hip_y + 0.10m
- **Major Radius:** Measured from torso-weighted vertices at belt height
- **Tube Radius:** 12mm
- **Default Color:** Brown (#92400E)
- **Coverage:** N/A (procedural geometry)
- **Visual:** Torus ring at waist

---

## Coverage Evolution

### Historical Coverage Data

| Session      | Top (M) | Top (F) | Wig (M) | Wig (F) | Bottom (M) | Bottom (F) |
|--------------|---------|---------|---------|---------|------------|------------|
| COSTUME-1    | ~60%    | ~70%    | ~30%    | ~35%    | ~95%       | ~96%       |
| COSTUME-2    | 51%     | 62%     | 25%     | 32%     | 96%        | 97%        |
| COSTUME-3    | 72%     | 79%     | 25%     | 32%     | 97%        | 97%        |
| COSTUME-4A   | 100%    | 100%    | 97%+    | 97%+    | 97%        | 97%        |

**Key Insight:** COSTUME-4A's nearest-bone labeling algorithm achieved target coverage by fundamentally changing how triangles are selected (centroid bone vs vertex weight blending).

### Root Cause Analysis (Pre-COSTUME-4A)

**Why Top Was 72-79% (COSTUME-3):**
1. **Joint Blending:** Vertices at shoulder/elbow joints had blended weights across multiple bone groups
2. **2-of-3 Rule:** Required 2 of 3 triangle vertices in bone group → rejected boundary triangles
3. **Y-Band Clipping:** Even with extended yMax, many eligible vertices not in selected triangles

**Why Wig Was 25-32% (COSTUME-3):**
1. **Neck Bone Contamination:** Including "neck" bone made face vertices eligible then rejected
2. **Face Weight Blending:** Neck/head boundary vertices had insufficient head-only weight
3. **Placement Error:** Selected triangles clustered at lower head, leaving top 25-28cm below target

**COSTUME-4A Solution:**
- Nearest-bone labeling eliminates weight blending issues
- Centroid selection creates cleaner boundaries
- Neighbor closure fills single-triangle gaps
- Pure head-bone group for wig eliminates face contamination

---

## Integration Status

### Screen Integration Matrix

| Screen/Component         | V2 Integration | Item Mapping | Outfit Persistence | Notes |
|--------------------------|----------------|--------------|-------------------|-------|
| **Preview3DTestScreen**  | ✅ Complete    | ✅ Demo      | ✅ Per body type  | Dev/test screen only |
| **CostumeViewer**        | ✅ Complete    | ✅ Available | ✅ Built-in       | Shared component |
| **ProjectPlanningScreen**| ❌ V1 Garments | ❌           | ❌                | Production feature, V1 system |
| **MatchResultsScreen**   | ❌ V1 Garments | ❌           | ❌                | Uses Preview3D (V1) |
| **Preview3D Component**  | ❌ V1 Garments | ❌           | ❌                | Legacy garment renderer |

### Migration Requirements

**To Convert Production Screens to V2:**
1. **Garment Catalog Migration:**
   - Map all V1 pre-built GLB garments to V2 piece definitions
   - Create piece definitions for garments not covered by base 6 pieces
   - Update AI matcher to return costume slot IDs instead of V1 garment IDs

2. **Component Replacement:**
   - Replace SelectedGarment with costume piece logic
   - Replace GarmentLayer with CostumeViewer
   - Update buildWornGarments() to use outfit state format

3. **Persistence Migration:**
   - Migrate existing saved outfits from V1 garment IDs to V2 slot/color format
   - Handle unmapped legacy items gracefully

4. **Testing:**
   - Real device testing for all converted screens
   - Performance testing with full costumes
   - AsyncStorage migration validation

**Estimated Effort:** 3-5 days of development + testing

---

## Test Results Summary

### Latest Verification (COSTUME-4A)

**TypeScript Compilation:**
```
npx tsc --noEmit
36 errors (baseline, no new errors)
Status: ✅ PASS
```

**Costume Piece Tests:**
```
node tools/test_costume_pieces.mjs
Male: 6 pieces, all geometry checks pass, coverage 97%+ for all
Female: 6 pieces, all geometry checks pass, coverage 97%+ for all
Status: ✅ PASS (all checks passed)
```

**Outfit State Tests:**
```
node tools/test_outfit_state.mjs
Total: 60 tests
Passed: 60
Failed: 0
Status: ✅ ALL TESTS PASSED
```

**Bone Attachment Tests:**
```
node tools/test_attach_module.mjs
Total: 99 tests
Passed: 99
Failed: 0
Status: ✅ ALL TESTS PASSED
```

**GLB Model Validation:**
```
node scripts/verify-glb-models.mjs
15 passed, 0 failed
V2 Male: 568KB, V2 Female: 568KB
Status: ✅ PASS (assets ready)
```

**Expo Export:**
```
npx expo export --platform web
All 4 GLBs present (V1 Male/Female, V2 Male/Female)
Status: ✅ SUCCESS
```

### Test Coverage

**What IS Tested:**
- ✅ Geometry generation (triangle counts, bounds, symmetry)
- ✅ Coverage metrics (vertex selection, region definition)
- ✅ Outfit state management (toggle, color, persistence)
- ✅ Bone attachment system (follow, offset, detach)
- ✅ GLB model integrity (bind pose, bone lengths)
- ✅ Build/export process (asset presence)

**What Is NOT Tested:**
- ❌ Real device rendering (all tests on Node.js or web preview)
- ❌ Touch interactions (camera controls, piece toggles)
- ❌ Mobile layout responsiveness
- ❌ Performance on actual phones
- ❌ AsyncStorage across app restarts (end-to-end)
- ❌ Visual appearance of debug mode

---

## Known Issues and Limitations

### COSTUME-4A Resolved Issues

**✅ FIXED:**
- Top coverage now 100% (was 72-79%)
- Wig coverage now 97%+ (was 25-32%)
- Wig placement within 2cm of head top (was 25-28cm below)
- Symmetric shoulder coverage (bare left shoulder fixed)
- Clean neckline (no head coverage)
- Straight hem line (was irregular)
- No skin gaps between pieces

### Remaining Limitations

**Technical:**
- Static rest pose only (no animation/skinning support)
- Memoization cache grows unbounded (no LRU eviction)
- Belt radii approximation (ellipse → circle)
- Debug points only for top/wig (other pieces not supported)

**Integration:**
- V1 consumers cannot use V2 costume system without migration
- Item-to-slot mapping incomplete (only 5 base categories)
- Outfit persistence per body type only (not per character)
- No validation for unmapped items

**Testing:**
- All verification on desktop/Node.js (device testing needed)
- Visual appearance not validated
- Performance benchmarks missing

### Future Work Recommendations

1. **Performance Optimization:**
   - Implement LRU cache for memoization
   - Profile geometry derivation on low-end devices
   - Consider pre-computing common piece combinations

2. **Feature Expansion:**
   - Add layering support (wear multiple tops/bottoms)
   - Support animated garments (skinned meshes)
   - Implement garment physics/draping

3. **Production Migration:**
   - Complete V1→V2 garment catalog mapping
   - Convert ProjectPlanningScreen to V2
   - Update AI matcher for V2 slot output

4. **Testing:**
   - Real device testing suite
   - Performance benchmarks
   - Visual regression tests
   - AsyncStorage end-to-end tests

---

## How to Use This Report

### For Developers

**Finding Information:**
- **Latest status:** See "Executive Summary" section
- **Implementation details:** See "Technical Architecture" section
- **File locations:** See "File Organization" section
- **Test results:** See "Test Results Summary" section
- **Historical context:** See "Implementation Timeline" and "Coverage Evolution"

**Making Updates:**
When costume system changes are made:
1. Update "Executive Summary" status and known issues
2. Add new session entry to "Implementation Timeline" (most recent first)
3. Update relevant piece specifications in "Current Piece Specifications"
4. Add test results to "Test Results Summary"
5. Update "Last Updated" date at top

### For Users

**Where to See Costumes:**
1. Open ForgeMind app
2. Go to **Profile → 3D Preview Test**
3. Scroll to **V2 Costume Demo**
4. Tap **Enter V2 Costume Demo**
5. Select male or female body
6. Tap **Wear Full Costume** or toggle individual pieces
7. Use **Front/Side/Back** to orbit camera
8. Tap piece names to change colors
9. Expand **Owned Items** to apply items to costume slots

**Debug Mode:**
1. In V2 Costume Demo, toggle **Debug ON**
2. Enable top or wig
3. Red points show missing vertices (if any)
4. Console logs show coverage details

---

## Version History

### v4.0 - COSTUME-4A (October 29, 2026)
- Switched to nearest-bone-segment labeling algorithm
- Achieved 97%+ coverage for all pieces
- Fixed wig placement and shoulder symmetry
- Added hem clipping for clean edges
- Added neighbor closure for smoother boundaries

### v3.0 - COSTUME-3 (October 29, 2026)
- Partial coverage improvements (top +21-17pp)
- Added debug visualization system
- Enhanced diagnostic tracking
- Bottom coverage reached 97% target
- STATUS: INCOMPLETE (wig issues unresolved)

### v2.0 - COSTUME-2 (October 29, 2026)
- Added outfit state persistence (AsyncStorage)
- Created shared CostumeViewer component
- Implemented item-to-slot mapping infrastructure
- Added camera controls and color picker
- Proof-of-concept owned items integration
- Coverage baseline established

### v1.0 - COSTUME-1 (October 29, 2026)
- Initial V2 costume system implementation
- Runtime geometry derivation from body mesh
- 6 base pieces (top, bottom, shoes, gloves, wig, belt)
- Triangle selection by bone groups + y-band
- Normal-offset shell generation
- Parametric belt torus

---

## Maintenance Notes

**Update Frequency:** After each costume-related code change or feature addition

**Sections Requiring Regular Updates:**
- Executive Summary (status, issues)
- Implementation Timeline (new sessions)
- Current Piece Specifications (config changes)
- Integration Status (screen conversions)
- Test Results Summary (verification runs)
- Known Issues (as resolved or discovered)

**Archive Policy:**
- Keep all session entries in Timeline (newest first)
- Maintain complete coverage evolution data
- Preserve historical context for decisions

**Contact:**
For questions or updates to this report, refer to session progress files (COSTUME*_PROGRESS.md) or CHANGELOG.md.

---

**END OF REPORT**
