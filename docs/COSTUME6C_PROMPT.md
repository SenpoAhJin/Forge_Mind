TASK COSTUME-6C. Fix ONLY these two visible problems on the V2 costume: (1) the WIG does not cover the back and crown of the head (female and male: back view shows a bald head with two small patches at ear height; front and top are covered); (2) the TOP has bare skin patches on the shoulder tops and upper back, with a ragged neckline. Out of scope and must NOT change: shoes, gloves, bottom, belt, camera buttons, outfit planning, merges.

R0: write this ENTIRE message verbatim to docs/COSTUME6C_PROMPT.md, commit and push. Then read COSTUME6_PROGRESS.md.

ENVIRONMENT: Windows PowerShell. Do not use grep, tail, head, sort, uniq, cat, sed or awk. Use the Grep tool, Select-String, Select-Object, or short node one-liners. Use Grep to find things; read only about 40 lines around hits; never open whole files; no narration of searches; keep tool output short.

CONTEXT

- Branch: task/costume4c-clip-and-coverage. Run `git branch --show-current` and `git status`. If the branch differs, report and STOP. No merges, no stash changes, do not stop or restart any process, no force-push. File-lock error: report the exact error and STOP.

- Run tests with `node --import tsx tools/test_costume_pieces.mjs`.

- Facts claimed by the previous session (CONFIRM each with Grep and line numbers before relying on it): (a) armYMax is never read; (b) clipTrianglesAtPlane keeps only triangles entirely on the kept side, it does not split; (c) selectTriangles filters by centroid label and by centroid yMin/yMax; (d) the data file has BOTH yMin/yMax and clips; the app path (buildPieceForDisplay) converts clips back into yMin/yMax; the test builds pieces with its own select, clip, offset sequence, so the test does NOT run the app's code path; (e) the wig has a face-exclusion rule (isWig parameter); (f) baseline failures: male wig height 0.215 > 0.2; female top has 5 boundary loops (expected 4). Do not change either expectation and do not hide them.

- Data facts: the top's groupDetails.torso lists pelvis, spine_01..spine_03 but NOT clavicle.L/clavicle.R (boneGroups.torso includes them); the neck bone is in boneGroups.head, not in the top; the wig uses only the "head" bone with band head_top_y - 0.18 .. head_top_y and hairlineDrop 0.02.

- HYPOTHESES (UNCONFIRMED, prove or reject with printed numbers): H1 nearest-bone labeling gives back-of-skull vertices a label other than "head", so the wig drops them; H2 the wig face-exclusion rule removes the back; H3 the top's shoulder/upper-back holes are vertices labeled with bones that are not in the top's torso group (clavicle, neck).

- ALLOWED: group lists, selection method, new data fields, builder internals. NOT ALLOWED: raising a tolerance, lowering a threshold, disabling a check, editing the numeric values of existing yMin/yMax/clips, adding exemptions to check_no_duplicate_builder.mjs, hard-coded body numbers in code (values live in costumePieces.json).

RULES

1. STATUS is INCOMPLETE if any check fails or a part is skipped; DEVIATIONS go first in every report. Never write COMPLETE for a part unless its check passed with raw output pasted.

2. No shortcuts: if a part is too big for this session, STOP right after a commit, say exactly what is left, and write it at the top of COSTUME6_PROGRESS.md (numbers copied from the data file, never from memory).

3. Max 3 attempts on any one fix; then mark it FAILING and continue.

4. After EACH part: update COSTUME6_PROGRESS.md, commit and push.

PARTS

C0 BEFORE SNAPSHOT. For male and female, for each piece (top, bottom, shoes, gloves, wig): selected triangle count, pre-offset bounding box (min and max x, y, z), and a hash of the sorted selected triangle indices. Write the table to COSTUME6_PROGRESS.md before changing any code.

C1 ONE PIPELINE (small). Extract the exact sequence the app uses in buildPieceForDisplay (conversion of clips, selection, closure, clipping, offset) into ONE exported function. buildPieceForDisplay and tools/test_costume_pieces.mjs must BOTH call it; delete the test's own select, clip, offset sequence. Add to tools/check_no_duplicate_builder.mjs: exit 1 if test_costume_pieces.mjs imports selectTriangles, clipTrianglesAtPlane or buildOffsetGeometry for building pieces. The result must be IDENTICAL to the C0 table (counts equal, bbox within 1e-6, hash equal). If C1 cannot be finished in this session, STOP after a commit; do not start C2 (a test that does not run the app's code can pass while the app is wrong).

C2 EVIDENCE. New file tools/diag_regions.mjs (do not touch other diag files). It must use the C1 function. Both genders.

 WIG region: body vertices with y >= head_top_y - 0.18. Split into four quadrants (x sign and z sign relative to the head bone's head position; body faces +Z). The front quadrants are expected to be partly uncovered (face); the BACK quadrants must be covered. For each quadrant print total vertices and how many are inside selected triangles. For unselected vertices in the back quadrants print counts by label (owner bone), the gap between nearest and second-nearest bone segment (flag ties < 1e-4), and the REASON each was dropped (label not in group / outside y band / wig face rule / closure / other); if the builder does not expose reasons, add a small read-only debug return, no behavior change.

 TOP regions: (1) shoulder cap: body vertices within 0.06 m of each upperarm bone head, left and right; (2) upper back: body vertices with y between shoulder_y - 0.15 and neck_y + 0.06 and z behind the spine_03 bone head (body faces +Z). For each: total, inside selected triangles, % covered; for unselected vertices, counts by label and by reason.

 End with H1, H2, H3: CONFIRMED or REJECTED with the numbers. Commit and push.

C3 FIXES, driven by C2. Re-run tools/diag_regions.mjs after each attempt.

 WIG: if H1 or H2 is confirmed, add "selection": "band" to the piece schema (the piece takes every triangle whose centroid is in its region, no bone labels) and use it for the wig. Keep the face clear with a slanted plane read from the data file: region is ABOVE y(z) = head_top_y + offset + slope_z * (z - z_ref), z_ref = the head bone's head z, whole-triangle mode (keep triangles entirely above). Starting values offset -0.125, slope_z 0.5 are GUESSES, not measurements: put them in costumePieces.json as new fields so the user can tune them. If the face-exclusion rule is the cause, move its hard-coded numbers into the data file. Do not edit the existing yMin/yMax/clips numbers. The wig must cover the back and crown and stay off the face.

 TOP, in this order, stop at the first that fixes it: (a) add clavicle.L and clavicle.R to the top's torso group; (b) if unselected vertices are still labeled "neck" below the neck cut, add the neck bone to the top's groups (the existing neck-height limit still applies); (c) if the holes remain, report the labels and reasons and STOP; do not invent another method.

 Commit and push after each fix.

C4 TESTS (each exits 1 on failure; both genders; constants at the TOP of the test file, not read from the data file; paste the full failure list):

 - wig back coverage: >= 0.99 of region vertices in each back quadrant (above the wig plane) are inside selected triangles;

 - wig face clear: no wig vertex with z > z_ref + 0.06 has y < head_top_y - 0.10; wig top within 0.02 of head_top_y;

 - top shoulder cap: >= 0.95 of vertices within 0.06 m of each upperarm bone head are inside selected top triangles, left AND right;

 - top upper back: >= 0.95 of the upper-back region vertices are inside selected top triangles;

 - regression: shoes, gloves and bottom hash and counts identical to C0;

 - report (do not change) the female top boundary loop count and the male wig height.

C5 VERIFY, raw output: `(npx tsc --noEmit 2>&1 | Select-String "error TS").Count` (36 expected); test_costume_pieces; check_no_duplicate_builder; node scripts/verify-glb-models.mjs. Do not run expo export. Add a short plain-language Task COSTUME-6C entry to CHANGELOG.md with a NOT TESTED list (phone, visual check). Commit and push.

FINAL REPORT (max 15 lines): 0. DEVIATIONS first, then STATUS per part (C0 to C5). 1. Facts (a) to (e) confirmed or rejected with line numbers. 2. H1, H2, H3 with numbers. 3. Coverage table per gender: wig back quadrants %, top shoulder cap L and R %, upper back %, before and after. 4. Full failure list. 5. Raw pass/fail of each command. 6. Files changed; which data fields are new. 7. BLOCKED; NOT TESTED; NEXT STEP.
