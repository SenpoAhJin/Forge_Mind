# COSTUME-6 Progress Report

Branch: task/costume4c-clip-and-coverage
Started: 2026-10-30

**NEXT STEP (Step 2):** Add "clips" field to each piece in src/data/costumePieces.json. Convert existing yMin/yMax/armYMax to equivalent clips. Top: torso hem at hip_y-0.05 keep above, torso neck at neck_y+0.03 keep below, arms at wrist_y keep above. Wig: head group, yMin becomes a clip at head_top_y-0.18 keep above, yMax becomes a clip at head_top_y keep below. Bottom, shoes, gloves: convert their yMin/yMax. Belt: no clips (torus type). Do NOT change any numeric value. Normalize schema: every piece has same "groups"/"groupDetails" shape. Add test per clip: all pre-offset vertices of affected triangles on kept side within 1e-4. Run tests, paste full failure list before/after. Commit and push.

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
