# COSTUME-6 Progress Report

Branch: task/costume4c-clip-and-coverage
Started: 2026-10-30

## C1 ONE PIPELINE - COMPLETE

Created selectPieceTriangles() function that unifies the app's buildCostumePiece and test sequences:
1. Convert clips to yMin/yMax (or use legacy yMin/yMax)
2. Call selectTriangles with bone labels and y-band filtering  
3. Call clipTrianglesAtPlane for specific pieces (e.g., top hem)
4. Return selected triangle indices

Modified:
- src/utils/costumeBuilder.ts: Added export function selectPieceTriangles(). Updated buildCostumePiece to call it.
- tools/test_costume_pieces.mjs: Removed imports of selectTriangles and clipTrianglesAtPlane. Now calls selectPieceTriangles.
- tools/check_no_duplicate_builder.mjs: Added check that test_costume_pieces.mjs must not import selectTriangles or clipTrianglesAtPlane.

Verification:
```
C0: Male top 5834, bottom 4840, shoes 2150, gloves 3286, wig 1187, hash fd444a8e/f5fef383/6a2c95f5/79ae65bb/82242ad4
C1: Male top 5834, bottom 4840, shoes 2150, gloves 3286, wig 1187, hash fd444a8e/f5fef383/6a2c95f5/79ae65bb/82242ad4
IDENTICAL ✓
```

Baseline failures preserved: Male wig height 0.215 > 0.2, Female top 5 loops.

## C0 BEFORE SNAPSHOT - COMPLETE

### Male
| Piece | Triangles | BBox Min (x,y,z) | BBox Max (x,y,z) | Hash |
|-------|-----------|------------------|------------------|------|
| top | 5834 | -0.407905, 0.987930, -0.178378 | 0.412300, 1.566642, 0.135394 | fd444a8e |
| bottom | 4840 | -0.244490, 0.126024, -0.171339 | 0.244097, 1.037329, 0.129466 | f5fef383 |
| shoes | 2150 | -0.264289, 0.000280, -0.092300 | 0.264854, 0.122590, 0.178110 | 6a2c95f5 |
| gloves | 3286 | -0.444111, 0.729435, -0.017638 | 0.443929, 0.996934, 0.127111 | 79ae65bb |
| wig | 1187 | -0.094665, 1.705219, -0.093173 | 0.093696, 1.879445, 0.129131 | 82242ad4 |

### Female
| Piece | Triangles | BBox Min (x,y,z) | BBox Max (x,y,z) | Hash |
|-------|-----------|------------------|------------------|------|
| top | 5962 | -0.396803, 0.988093, -0.156605 | 0.396514, 1.544493, 0.163418 | 66db1afd |
| bottom | 5085 | -0.218585, 0.125640, -0.163184 | 0.218983, 1.036878, 0.102197 | 89de6915 |
| shoes | 2147 | -0.229887, 0.000712, -0.134809 | 0.229964, 0.115142, 0.134228 | 533cc6e9 |
| gloves | 2734 | -0.433148, 0.763992, -0.025081 | 0.432867, 0.991239, 0.078668 | b74e5031 |
| wig | 1581 | -0.101013, 1.698379, -0.116684 | 0.101695, 1.879764, 0.124410 | a8ad8e61 |

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
