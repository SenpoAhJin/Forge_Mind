# COSTUME-6 Progress Report

Branch: task/costume4c-clip-and-coverage
Started: 2026-10-30

## NEXT STEP: Step 3 - Evidence Collection

Create tools/diag_regions.mjs to investigate:
- Shoes region: y <= ankle_y + 0.05 
- Wig region: head_top_y - 0.18 to head_top_y
- Shoulders: body vertices within 0.06m of upperarm bone heads

For each region, report:
- Quadrant coverage (x/z signs) for region vertices inside selected triangles
- For unselected vertices: bone label and gap between nearest/second-nearest bone

Test hypotheses:
1. Nearest-bone labeling drops vertices behind the bone line (heel, back of skull)
2. Missing clavicle bones in top's torso group cause ragged shoulder tops

Write CONFIRMED or REJECTED with numbers. Then delete tools/diag_coverage.mjs and remove its exemption from check_no_duplicate_builder.mjs.

Commit and push.

## Step 2: PER-GROUP CLIPS - COMPLETE

Added "clips" field to costumePieces.json. Each clip has: groups, landmark, offset, keep ("above"/"below").

Conversion from yMin/yMax:
- top: 3 clips (hip_y+0.00 above, neck_y+0.06 below for all groups; hip_y+0.00 above for torso only = hem)
- bottom: 2 clips (ankle_y+0.04 above, hip_y+0.05 below)
- shoes: 2 clips (floor above, ankle_y+0.05 below)
- gloves: 0 clips (no yMin/yMax)
- wig: 2 clips (head_top_y-0.18 above, head_top_y+0.00 below)

Schema normalized: all pieces now use groupDetails (removed plain "groups" field).

Added ClipDef interface. Updated buildPieceForDisplay to read clips (prefers clips, falls back to yMin/yMax).

Kept both yMin/yMax and clips fields for now (legacy support).

**EQUIVALENCE CHECK PASSED:**
```
BEFORE: Male: top 5834, bottom 4967, shoes 2164, gloves 3286
AFTER:  Male: top 5834, bottom 4967, shoes 2164, gloves 3286
BEFORE failures: Male wig height 0.215 > 0.2, Female top 5 loops
AFTER failures:  Male wig height 0.215 > 0.2, Female top 5 loops
```

Committed 11701a7 and pushed.

## Step 1B: HOUSEKEEPING - COMPLETE

a. Checked e16f489 diff: contains 8 `export` keywords PLUS one unrelated fix (line 809: fixed space typo `let selected Triangles` → `let selectedTriangles` that existed before Step 1).

b. Modified test harness to collect ALL failures and run BOTH genders even when male fails:
   - Changed main() to wrap each testBody() in try-catch
   - Collects failures into allFailures array
   - Prints all failures at end

   BASELINE FAILURES:
   ```
   Male: wig: height 0.215 > 0.2
   Female: top: 5 boundary loops, expected 4
   ```

c. TypeScript error count: 36 (was 72 at start of COSTUME-4A2)

Committed 4a359c0.

## Step 0: BASELINE - COMPLETE

Git status:
```
On branch task/costume4c-clip-and-coverage
Your branch is up to date with 'origin/task/costume4c-clip-and-coverage'.
Changes not staged for commit:
	modified:   src/utils/costumeBuilder.ts
Untracked files:
	COSTUME_MASTER_REPORT.md
```

TypeScript compilation:
- Total lines: 72
- Last line: `Type '"#FBFAFF"' is not assignable to type '"#14122B"'.`
- Top error files: CreateListingScreen.tsx(5), ai_inventory_check.ts(4+4), ProjectDashboardScreen.tsx(3)
- No duplicate file paths detected
- Errors are NOT in costume files

## Step 1: TESTS USE THE REAL BUILDER - COMPLETE

Added tsx@latest as devDependency (3 packages added).

Modified src/utils/costumeBuilder.ts:
- Exported: sanitizeBoneName, resolveBoneSet, distanceToSegment, buildBoneSegments, labelVerticesByNearestBone, selectTriangles, clipTrianglesAtPlane, buildOffsetGeometry

Modified tools/test_costume_pieces.mjs:
- Added import from '../src/utils/costumeBuilder.ts'
- Deleted all duplicate builder functions (sanitizeBoneName, findBodyMesh, computeLandmarks, resolveBoneSet, distanceToSegment, buildBoneSegments, labelVerticesByNearestBone, selectTriangles, clipTrianglesAtPlane, buildOffsetGeometry)
- Kept: loadGLB, countBoundaryLoops, testBody, main, and measurement helpers

Created tools/check_no_duplicate_builder.mjs:
- Checks all tools/*.mjs for duplicates of costumeBuilder.ts functions
- Exempts diag_coverage.mjs (uses skin weights, different logic)
- Exit 1 on any duplicate

Test run with real builder:
```
node --import tsx tools/test_costume_pieces.mjs
COSTUME-4A2: Honest tests with original thresholds
=== Threshold validation ===
All thresholds at spec values ✓
=== Testing male body ===
Body bbox: y -0.000 to 1.900 m
top: 5834 tris, bbox h=0.586m ✓
bottom: 4967 tris, bbox h=0.957m ✓
shoes: 2164 tris, bbox h=0.133m ✓
gloves: 3286 tris, bbox h=0.274m ✓
=== FAIL ===
wig: height 0.215 > 0.2
```

Duplicate checker:
```
node tools/check_no_duplicate_builder.mjs
✓ No duplicate builder functions found in 15 tools/*.mjs files (1 exempt)
```

The test now fails honestly (wig height). This is expected - the tests import the real builder.
