# COSTUME-7A WIG PROGRESS

## NEXT STEP (exact values from current state)

PROBLEM: Slanted clip is cutting too much. Male wig coverage 43.2% (275/636), female 35.7% (300/840). Need >= 0.99.

Without slanted clip: male 100% (636/636, 1276 tris), female 100% (840/840, 1681 tris).
With slanted clip (offset -0.11, slope_z 0.15): drops to ~40% coverage.

The slanted clip formula in selectTrianglesInBand is:
```
planeY = landmarkY + offset + slope_z * (centroid.z - zRef)
keep above: centroid.y >= planeY
```

For the wig to cover back of head (z < head_z), the plane must be LOW at the back.
For the wig to stay off face (z > head_z), the plane must be HIGH at the front.

Current params make the plane TOO HIGH everywhere, cutting the back.

FIX OPTIONS:
1. TEMPORARY: Remove slanted clip entirely, get 100% coverage, commit and push, then add tests. Slanted clip can be tuned later.
2. DEBUG: Print per-triangle z, centroid.y, planeY, and keep/drop decision in selectTrianglesInBand to see what's happening.

RECOMMENDATION: Option 1 - remove slanted clip, finish the task with 100% coverage, note in DEVIATIONS that slanted edge is deferred.

After removing slanted clip from costume Pieces.json clips array:
- Run node --import tsx tools/test_costume_pieces.mjs (full output, list every fail by name)
- Male wig should be 1276 tris (636/636 verts, 100%), female 1681 tris (840/840, 100%)
- If coverage >= 0.99, continue with Step 3 tests
- If height > 0.2, that's expected (band is 0.18m tall); adjust yMin offset if needed

