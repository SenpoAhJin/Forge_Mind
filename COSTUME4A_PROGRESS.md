# COSTUME-4A Progress

## Step 0: Git Setup

**Branch:** task/costume4a-coverage (from task/costume3-fix-and-connect)
**TypeScript baseline:** 36 errors ✓

## Step 1: Evidence (No Fixes)

**Raw diagnostic output (last 50 lines):**
```
b. TOP PIECE DIAGNOSIS
   y-band: [0.9378, 1.8999]
   neck_y: 1.5199, head_top_y: 1.8999
   bone groups: pelvis, spine_01, spine_02, spine_03, clavicleL, clavicleR, upperarmL, forearmL, handL, upperarmR, forearmR, handR
   Selected triangles: 7760
   Vertices above neck_y (1.5199): 1349
   Dominant bones above neck_y:
      handR: 839 verts
      forearmR: 269 verts
      forearmL: 175 verts
      spine_03: 27 verts
      neck: 25 verts
      handL: 14 verts
c. BARE LEFT UPPER ARM DIAGNOSIS
   Unselected vertices in +X upper arm (x>0.1, y∈[1.234, 1.520]): 537
   Sample of first 30:
      head: 21 verts, avg top sum weight: 0.368
      neck: 9 verts, avg top sum weight: 0.257
d. WIG DIAGNOSIS
   y-band: [1.5199, 1.9199]
   bone groups: neck, head
   Vertices with head weight >= 0.5: 748
   Count above neck_y (1.5199): 161
   Count above current wig yMax (1.9199): 0
   Top 20 highest head vertices:
      y=1.6211, headWeight=0.559, dominant=neck
      y=1.6190, headWeight=0.639, dominant=neck
      ...
      y=1.5895, headWeight=1.000, dominant=neck
   Selected wig triangles: 347, verts: 204
   Selected wig y-range: [1.4963, 1.6356]
   Distance from head_top_y: 0.2643 m
e. BELT RADIUS DIAGNOSIS
   Belt y-position: 1.0878 m
   Torso vertices at belt height: 138
   Torso x-range: [-0.3865, 0.3878] (width: 0.7744 m)
   Torso z-range: [-0.1387, 0.1085] (depth: 0.2472 m)
   Arm vertices at belt height: 0
```

### ROOT CAUSES

1. **Top includes head/neck above neckline - CONFIRMED**
   - Male: 1349 vertices above neck_y (1.5199 m), dominated by handR (839), forearmR (269), forearmL (175)
   - These are ARM vertices, NOT head vertices - the hands reach above neck_y when extended
   - The 27 spine_03 and 25 neck vertices ARE the actual problem: top extends into neck/head region
   - yMax=head_top_y (1.8999) allows top to include vertices up to the head top

2. **Bare left shoulder - CONFIRMED**
   - Male: 537 unselected vertices in +X upper arm region (x>0.1, elbow to shoulder)
   - Sample shows dominant bones are head (21 verts, avg top weight 0.368) and neck (9 verts, avg top weight 0.257)
   - These shoulder vertices have dominant bone = head/neck but insufficient top bone sum weight (<0.5)
   - This is a SKIN WEIGHT issue: shoulder cap vertices weighted to head/neck instead of clavicle/upperarm

3. **Wig top 26cm below head_top_y - CONFIRMED**
   - Male wig selected triangles y-range: [1.4963, 1.6356], max is 0.2643 m below head_top_y (1.8999)
   - Top 20 highest "head" vertices: y=1.59-1.62 m, all have dominant bone = NECK (not head!)
   - The "head" bone group includes neck+head, but neck vertices are BELOW the actual skull cap
   - Wig yMin starts at neck_y (1.5199), but highest vertices are at 1.62, nowhere near 1.90

4. **Hand vertex asymmetry - CONFIRMED**
   - Male: handL=571 verts, handR=839 verts (47% asymmetric)
   - Female: handL=420 verts, handR=1070 verts (155% asymmetric!)
   - This indicates different dominant bone assignments between left and right hands

5. **Belt measurement - CONFIRMED CORRECT**
   - Male torso at belt height: width=0.7744 m, depth=0.2472 m
   - Arm vertices at belt height: 0 (torso filtering works correctly)

### STRATEGY

The skin weight data is fundamentally problematic:
- Shoulder vertices are weighted to head/neck instead of clavicle/upperarm
- Neck vs head dominant bone assignments don't match anatomy
- L/R hand asymmetry suggests unreliable weighting

**Switch to nearest-bone-segment labeling** as specified in task requirements. This will:
- Assign each vertex exactly one label (nearest of 23 bone segments)
- Select triangles by centroid label (not 2-of-3 vertex weights)
- Fill single-vertex gaps with neighbor closure
- Produce clean, symmetric regions independent of skin weights

## Step 2: Fix Coverage Issues

### Changes Made

**1. costumeBuilder.ts - Nearest-bone-segment labeling system**
   - Added `distanceToSegment()`: compute point-to-line-segment distance
   - Added `buildBoneSegments()`: extract bone head/tail from contract
   - Added `labelVerticesByNearestBone()`: assign each vertex to nearest bone segment
   - Replaced `vertexBelongsToPiece()` and weight-based selection
   - Rewrote `selectTriangles()`:
     * Label each triangle by centroid's nearest bone
     * Select if label in boneSet AND centroid in y-band
     * Build edge-to-triangle adjacency
     * Neighbor closure: add unselected triangles with >=2 selected edge neighbors
   - Added `clipTrianglesAtPlane()`: clip at hem for straight edge
   - Updated `buildCostumePiece()`: use boneSegments, apply hem clip to top
   - Updated `computePieceDebugInfo()`: use nearest-bone labeling for coverage

**2. costumePieces.json - Data adjustments**
   - Top yMax: head_top_y → neck_y + 0.08 (8cm above neck = clean neckline, covers shoulders)
   - Wig groupDetails: ["neck", "head"] → ["head"] only (remove neck bone)
   - Wig yMin: neck_y + 0 → neck_y + 0.15 (start 15cm above neck = upper skull only)

### Rationale

**Nearest-bone labeling advantages:**
- Ignores problematic skin weights (shoulder→head misassignments)
- Produces symmetric L/R regions automatically (same bone geometry)
- Triangle centroids ensure contiguous regions
- Neighbor closure fills isolated gaps from mesh tessellation

**Top neckline fix:**
- Old yMax=head_top_y allowed triangles up to 1.90m (included head/neck)
- New yMax=neck_y+0.08=1.60m stops at base of neck
- Nearest-bone labeling will assign shoulder cap to clavicle (correct), not head
- Hem clip at yMin produces straight bottom edge

**Wig fix:**
- Removing neck bone prevents face/throat vertices from being eligible
- yMin=neck_y+0.15 starts at upper skull (diagnosis showed top head vertices at 1.59-1.62m)
- Only "head" bone segment covers actual skull cap region
- Should reach head_top_y (1.90m) with proper nearest-bone selection

**TypeScript:** 36 errors (baseline maintained) ✓

