# COSTUME-6 Progress Report

Branch: task/costume4c-clip-and-coverage
Started: 2026-10-30

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

Committed: [pending]

**NEXT STEP:** Step 2 - Per-group clips conversion. Read how costumeBuilder.ts applies yMin/yMax/armYMax. Convert to clips field. Record before/after counts and bbox. Add clip tests. Equivalence must match.

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

## Step 2: PER-GROUP CLIPS - IN PROGRESS

Next: Add "clips" schema to costumePieces.json
