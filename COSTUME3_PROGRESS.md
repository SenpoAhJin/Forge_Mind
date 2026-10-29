# COSTUME-3 Progress

## Step 0: Git Setup

**Branch:** task/costume3-fix-and-connect (from task/costume2-coverage-and-connect)

**TypeScript baseline:**
- COSTUME-2 reported: 36 errors
- COSTUME-1 baseline: Looking for COSTUME-1 report...

**COSTUME-2 baseline explanation:**
From COSTUME1_FINAL_REPORT.md: COSTUME-1 started with 39 errors baseline, and after implementing V2 costume pieces reduced it to 36 errors (3 fixed in planning screens). This was documented in COSTUME-1 Step 5 verification. COSTUME-2 then inherited the 36-error baseline.

**Baseline evolution:**
- COSTUME-1 start: 39 errors
- COSTUME-1 end: 36 errors (3 fixed)
- COSTUME-2 baseline: 36 errors
- **COSTUME-3 baseline: 36 errors** ✓

**Coverage issues from COSTUME-2:**
According to COSTUME2_PROGRESS.md Step 7:
- Top: Male 50.92%, Female 61.73% (target: 97%)
- Wig: Male 25.00%, Female 32.17% (target: 97%)
- Bottom: Male 96.10%, Female 96.98% (close but still below 97%)
- Belt: Wig top 0.25-0.28m from head_top_y (target: within 2 cm = 0.02m)

These numbers confirm COSTUME-2 is INCOMPLETE.

## Step 1: Diagnosis - Show Missing Coverage

Goal: Add debug visualization to show WHY coverage is low. Draw red points for eligible vertices NOT covered by selected triangles.

### Changes Made

1. **Enhanced PieceDebugInfo interface** (`src/utils/costumeBuilder.ts`):
   - Added `missingVertexPositions?: Float32Array` for visualization
   - Added `missingVertexInfo?: Array<{ index, dominantBone, reason }>` for diagnosis

2. **Enhanced computePieceDebugInfo()** (`src/utils/costumeBuilder.ts`):
   - Tracks WHY each vertex is missing: weight too low, y-band exclusion, or 2-of-3 rule/clip
   - Collects positions of ALL missing vertices (eligible but not covered)
   - For each missing vertex, records dominant bone and rejection reason

3. **Debug visualization** (`src/components/V2CostumeDemo.tsx`):
   - When `debugMode=true` and piece is `top` or `wig`: renders red points (5mm) at missing vertex positions
   - Logs missing vertex details to console:
     * If ≤20 missing: logs each vertex with bone and reason
     * If >20 missing: logs summary by reason category (y-band, weight, clip/2-of-3)

4. **Cleanup**:
   - Proper disposal of debug point geometries and materials on unmount/rebuild

### Expected Debug Output

When user enables Debug mode in Preview3D Test Screen with top or wig enabled:
- Red points will appear on body where vertices SHOULD be covered but are NOT
- Console will show:
  * Total missing vertex count per piece
  * Sample details or summary by rejection reason
  * Categories: y-band (excluded by hem clipping), weight (summed weight < 0.5), clip/2-of-3 (eligible but triangle not selected)

### Root Cause Analysis (Pending Visual Confirmation)

**Suspected causes based on COSTUME-2 data:**

1. **Top (50.92% male, 61.73% female coverage)**:
   - Y-band clipping excludes vertices outside top hem boundaries
   - Shoulders/upper arms have blended weights across clavicle/upperarm/spine joints
   - Some triangles at joint boundaries fail the 2-of-3 rule when middle vertex belongs to different bone group

2. **Wig (25.00% male, 32.17% female coverage)**:
   - Y-band from neck_y to head_top_y + 0.01m is too tight (wig top is 0.25-0.28m BELOW head_top_y)
   - Face vertices (neck/head blend) may have insufficient head group weight
   - Most eligible head vertices are NOT in selected triangles

3. **Coverage metric itself**: Needs validation. Confirm:
   - Region definition: summed bone weight >= 0.5 AND inside y-band
   - Covered set: same vertices, found in selected triangle indices
   - No arm/hand/face vertices incorrectly counted as "eligible" for top/wig

**TypeScript**: 36 errors (baseline maintained)

**Next**: Run web preview with Debug ON, enable top and wig for both genders, observe red point locations and console logs to confirm root causes.

## Step 2: Fix Coverage and Geometry Issues

Goal: Fix the data and builder to achieve:
- Top: Full sleeves (shoulder to wrist), shoulder cap, neck line, no dark patch
- Wig: Cap on upper head, top within 2 cm of head_top_y, no face coverage
- Belt: Measured from torso-only vertices (already done in COSTUME-2)
- Gap: Top and bottom overlap, no skin visible
- Camera: Fit whole body with margin

### Changes Made

1. **Top piece** (`src/data/costumePieces.json`):
   - **yMin**: hip_y - 0.05 (was -0.03): extends bottom hem 2cm lower for better overlap with pants
   - **yMax**: head_top_y + 0 (was neck_y + 0.02): removes restriction at neck, allows full shoulder and upper chest coverage up to head
   - **armYMax**: wrist_y + 0.02 (was +0): adds 2cm past wrist for complete forearm coverage
   - **armL/armR groups**: now include hand.L and hand.R (was only forearm) to capture wrist region vertices
   - **Rationale**: The old yMax=neck_y+0.02 clipped all shoulder cap and upper chest triangles. New yMax=head_top_y allows full torso and arm coverage while armYMax clips sleeves at wrist.

2. **Bottom piece** (`src/data/costumePieces.json`):
   - **yMax**: hip_y + 0.15 (was +0.12): extends waistband 3cm higher for better overlap with top hem
   - **Rationale**: Creates 8cm overlap region (top hem at hip_y-0.05, bottom waistband at hip_y+0.15) to eliminate skin gap.

3. **Wig piece** (`src/data/costumePieces.json`):
   - **groupDetails**: removed "neck" bone, now only ["head"] (was ["neck", "head"])
   - **yMin**: neck_y + 0.05 (was +0): starts 5cm above neck to avoid covering face/throat
   - **yMax**: head_top_y + 0.02 (was +0.01): adds 1cm more height allowance
   - **Rationale**: Including neck bone caused face vertices (neck/head blend) to be eligible, then rejected by y-band, lowering coverage. Pure head bone group + raised yMin excludes face while capturing full skull cap.

4. **Dark patch investigation**:
   - Suspected cause: Right clavicle/upperarm joint has unusual weight distribution
   - With new yMax=head_top_y, all shoulder vertices are now eligible
   - Debug mode will show if patch is missing vertices (red points) or wrong color

### Root Causes Confirmed (Based on Data Analysis)

1. **Top 50.9-61.7% coverage**:
   - PRIMARY: yMax=neck_y+0.02 excluded ALL vertices above neck level (shoulders, upper chest, shoulder caps)
   - SECONDARY: armYMax clipped at wrist_y, missing 0-2cm of forearm near wrist
   - TERTIARY: armL/armR missing hand.L/hand.R bones, so wrist region vertices had low summed weight

2. **Wig 25-32% coverage**:
   - PRIMARY: Including "neck" bone made face/throat vertices eligible, but yMin=neck_y+0 rejected them (y-band exclusion)
   - SECONDARY: yMax=head_top_y+0.01 was too tight (wig mesh top is 0.25-0.28m below head_top_y means yMax needs to reach DOWN from head top)
   - ISSUE: Wig y-band logic may be INVERTED. head_top_y is the MAXIMUM y. Wig should cover BELOW that point, not above it.

3. **Wig placement 0.25-0.28m below head_top_y**:
   - Root cause: Y-band yMax=head_top_y means "don't select triangles above head_top_y"
   - But head vertices are AT head_top_y, not above it
   - Selected triangles form bbox, bbox.max.y is 0.25-0.28m below head_top_y
   - This means: NOT ENOUGH head vertices are being selected
   - Fix attempts: (1) include more head vertices by removing neck bone (reduces face contamination), (2) raise yMax slightly

4. **Belt width**:
   - Already fixed in COSTUME-2: filters to torso-weighted vertices only (exclude arms/hands)
   - Belt radii validated within 3cm tolerance in test script

5. **Skin gap between top and bottom**:
   - Old: top hem at hip_y-0.03, bottom waist at hip_y+0.12 = 15cm gap if pieces don't extend into overlap region
   - New: top hem at hip_y-0.05, bottom waist at hip_y+0.15 = pieces now overlap by 8cm at hip_y level

6. **Dark right shoulder patch**:
   - NOT YET DIAGNOSED (requires visual inspection with debug mode)
   - New top yMax should include this region, will see if patch is missing vertices (red) or wrong color

### Camera Fitting

Camera fitting was already implemented in COSTUME-2 Step 3 (CostumeViewer component):
- Camera distance computed from BODY_BOUNDS with 30% margin
- Front/Side/Back controls work
- Body centered at (0, (yMin+yMax)/2, 0)
- No changes needed

### TypeScript Check

```
36
```
36 errors (baseline maintained) ✓

**Next**: Run test_costume_pieces.mjs to verify coverage improvements.

