TASK COSTUME-6B: continues TASK COSTUME-6 (Steps 0 and 1 are done). Costume geometry only. Do NOT do any merge, outfit-planning, ProjectPlanningScreen or other work.

SAVE FIRST (R0): before anything else, write this ENTIRE message verbatim to docs/COSTUME6_PROMPT.md, commit and push. Future sessions resume from it.

ENVIRONMENT: Windows PowerShell. Do NOT use grep, tail, head, sort, uniq, cat, sed or awk. Use Select-String, Select-Object -First/-Last, Sort-Object, Get-Content -TotalCount, or short node one-liners. Do not print whole files: read with line ranges. Keep tool output short to save context.

CONTEXT

- Branch: task/costume4c-clip-and-coverage. Run `git branch --show-current` and `git status`. If the branch differs, report and STOP. Do NOT merge any branch. Do NOT touch stashes. Do NOT stop or restart any processes. No force-push. If git or a file operation fails with a file-lock error, report the exact error and STOP.

- Done already: Step 0 (baseline), Step 1 (tests import the real src/utils/costumeBuilder.ts through tsx: run tests with `node --import tsx tools/test_costume_pieces.mjs`; tools/check_no_duplicate_builder.mjs exists; 8 builder functions are now exported). Commits e16f489 and 4a359c0.

- CORRECTION: the "NEXT STEP" note at the top of COSTUME6_PROGRESS.md contains WRONG numbers (hip_y-0.05, neck_y+0.03, wrist_y). IGNORE those numbers. The only source of truth for every numeric value is src/data/costumePieces.json as it is now. Remove or rewrite that note.

- Facts from src/data/costumePieces.json: (a) pieces use yMin / yMax / armYMax, no "clips" field; (b) the top's groupDetails.torso lists pelvis, spine_01..spine_03 but NOT clavicle.L/clavicle.R although boneGroups.torso has them; (c) wig band yMin = head_top_y - 0.18, yMax = head_top_y, hairlineDrop 0.02, uses only the "head" bone; (d) shoes use foot/toe bones and have no clip at their top edge; (e) belt has only yPosition (hip_y + 0.10) and tubeRadius 0.012, ring size comes from the builder; (f) schema is inconsistent (top and wig have groupDetails but no "groups"; bottom and shoes have both; gloves use bone names as group names).

- Facts from the last run (real builder, male only): top 5834 tris, bottom 4967, shoes 2164, gloves 3286; one failure: wig height 0.215 > 0.2. Female did not run. 0.215 equals 0.18 + 0.02 + 0.015 (hypothesis, not confirmed).

- Facts from screenshots: ragged edges at neckline and shoulder tops, wavy shirt hem, back of the head bare, feet/toes bare, ragged top edge on the female shoes, belt ring wider than the waist, "Front" camera showing the back, "Remove All" cut off at phone width.

- COSTUME_MASTER_REPORT.md (untracked) is NOT reliable. Do not copy numbers from it.

- HYPOTHESES (UNCONFIRMED; prove or reject with printed data): (1) nearest-bone labeling drops vertices behind the bone line (heel, back of skull); (2) missing clavicle bones in the top's torso group cause the ragged shoulder tops.

- ALLOWED: data-file structure, group lists, bands, offsets, selection method, builder internals. NOT ALLOWED: raising a tolerance, lowering a threshold, disabling a check, adding an exemption to check_no_duplicate_builder.mjs.

RULES

1. STATUS is INCOMPLETE if any check fails or a step is skipped. A DEVIATIONS section goes first in every report (include the diag_coverage.mjs exemption from Step 1 until it is removed).

2. Max 3 attempts on any one check; then mark it FAILING and continue.

3. After EACH step: update COSTUME6_PROGRESS.md, commit and push. If running low on context, STOP right after a commit and write the exact next step at the top of the progress file, with numbers copied from the data file, never from memory.

4. No hard-coded body numbers in code; piece values live in costumePieces.json. UI changes must work at phone width; you cannot run a phone, so mark it NOT TESTED.

STEPS

1B. HOUSEKEEPING (small).

   a. Run `git show e16f489 --stat` and `git diff e16f489~1 e16f489 -- src/utils/costumeBuilder.ts`. Report whether the diff contains ONLY added `export` keywords. If it contains anything else (it may include earlier uncommitted edits that existed before Step 1), list those changes in plain words. Do not revert anything.

   b. Make the test harness collect ALL failures and run BOTH genders even when the male body fails (no exit at the first failure; print the full list, then exit 1). Paste the full failure list now. This is the baseline.

   c. TypeScript count: run `(npx tsc --noEmit 2>&1 | Select-String "error TS").Count` and report it next to the old line count of 72.

   Commit and push.

2. PER-GROUP CLIPS. Add to the data file per piece: "clips": [{"groups":["torso"],"landmark":"...","offset":0.0,"keep":"above"}, ...]. A clip applies ONLY to triangles whose centroid label is in its "groups" ("*" = all). Plane y = landmark + offset; keep "above" = y >= plane, "below" = y <= plane. Triangles crossing the plane are split exactly on the plane (reuse the existing clipping code). Convert each piece's CURRENT yMin / yMax / armYMax into equivalent clips: FIRST read how costumeBuilder.ts currently applies yMin, yMax and armYMax (which groups, which side) and preserve exactly that behavior, with the landmark and offset values copied from the data file. Do NOT change any numeric value. Normalize the schema so every piece has the same "groups"/"groupDetails" shape.

   EQUIVALENCE CHECK (required): before editing, record per piece and per gender the selected triangle count and the pre-offset bounding box; after the conversion they must match (counts equal, bbox within 1e-6). If they do not match, the conversion is not equivalent: fix it, do not accept it. Paste the before/after table.

   Add a test per clip: every pre-offset vertex of the affected triangles is on the kept side within 1e-4. Arm probes must pass. Paste the full failure list before and after. Commit and push.

3. EVIDENCE. Create NEW file tools/diag_regions.mjs (do not overwrite tools/diag_coverage.mjs). It must import the real builder. Both genders, for: shoes, wig, top shoulders. For each region (shoes: y <= ankle_y + 0.05; wig: head_top_y - 0.18 up to head_top_y; shoulders: body vertices within 0.06 m of each upperarm bone head) print how many region vertices are inside selected triangles, split into four quadrants (x and z signs relative to the body centre). For unselected vertices print their label (owner bone) and the gap between nearest and second-nearest bone segment (flag ties < 1e-4). Write CONFIRMED or REJECTED for both hypotheses, with numbers. Then delete the old tools/diag_coverage.mjs (it stays in git history) and remove the exemption from tools/check_no_duplicate_builder.mjs so it has zero exemptions; the checker must still pass. Commit and push.

4. FIXES FROM EVIDENCE.

   a. If hypothesis 2 is confirmed, add the clavicle bones to the top's torso group. If rejected, do not change it.

   b. Add "selection": "band" to the piece schema: the piece takes every triangle whose centroid is in its region, with no bone labels. Use it for shoes and wig (and for gloves, top or bottom only if Step 3 shows labels drop front or back triangles).

   c. Slanted wig: extend the clip schema with a slanted plane {"groups":"*","landmark":"head_top_y","offset":-0.125,"slope_z":0.5,"z_ref":"head_bone","keep":"above"}, meaning y(z) = landmark + offset + slope_z*(z - z_ref), z_ref = the head bone's head z, body faces +Z. These numbers are STARTING VALUES (not measured): put them in the data file so the user can tune them. Keep the wig offset_m at its current data value unless a check forces a change. The wig must cover the back of the head down toward the nape and stay high at the forehead.

   d. Shoes: add a clip at ankle_y + 0.05, keep "below", so the top edge is exact.

   Commit and push.

5. BELT. Replace the circular torus with an ELLIPTICAL ring. At the belt height, use only torso-label vertices within +-0.01 m of the belt y (never arm or hand vertices). centre = middle of their x and z extents; rx = half the x extent + tube radius; rz = half the z extent + tube radius. Print rx, rz and the measured torso half-extents. Commit and push.

6. CAMERA + UI. The body faces +Z in glTF: "Front" must show face/chest, "Back" the back, "Side" a side view. Fix the presets and add a check that the Front camera z has the same sign as the body's forward direction. Make "Remove All" fully visible at phone width (wrap the button row). Add COSTUME_BUILD_TAG = 'costume6' at the bottom of the Debug panel. Commit and push.

7. TESTS (each makes the script exit 1 on failure), both genders, on top of all existing checks. Constants live at the top of the test file, NOT read from the data file:

   - band coverage: for shoes and wig, >= 0.99 of region vertices (region from the data file) are inside selected triangles, overall AND in each of the four quadrants;

   - front/back balance: top and bottom selected-triangle counts with centroid z above vs below the body centre within 25% of each other;

   - wig: height in [0.07, 0.20]; top within 0.02 of head_top_y; face clear: every wig vertex with z > head z_ref + 0.06 has y >= head_top_y - 0.10; nape: some wig vertex with z < head z_ref - 0.05 has y <= head_top_y - 0.14;

   - shoes: pre-offset max y <= ankle_y + 0.05 + 1e-4; toe and heel quadrant coverage >= 0.99;

   - belt: rx and rz each within 0.03 of measured torso half-extent + tube radius; rx <= torso half-width + 0.04;

   - top max y <= neck_y + 0.08; neck and hem pre-offset vertices within 1e-4 of their planes;

   - shoulder cap: body vertices within 0.06 m of each upperarm bone head are >= 0.95 inside selected top triangles (left AND right);

   - boundary loops after welding vertices by quantized position (1e-5): top 4, bottom 3, wig 1, gloves 2, shoes 2; if different, print the counts and fail.

   Paste the full failure list. Commit and push.

8. VERIFY, raw output: tsc error count vs Step 1B; test_costume_pieces; check_no_duplicate_builder; node tools/test_attach_module.mjs; node scripts/verify-glb-models.mjs; `npx expo export --platform web` (RUN it). If headless Chrome is available, save Front/Side/Back screenshots (male and female, all pieces on, Debug ON and OFF) to docs/screenshots/costume6/; otherwise NOT TESTED.

9. CHANGELOG + MASTER REPORT. Update CHANGELOG.md with a plain-language Task COSTUME-6 entry and a NOT TESTED list. Then correct COSTUME_MASTER_REPORT.md using ONLY facts verified in this work (printed test output, files you read). Do not copy numbers from the old report.

   - First run `git branch --show-current` and `git log --oneline -5 -- COSTUME_MASTER_REPORT.md`, and put the branch and commit at the top of the report.

   - Rewrite the Executive Summary so it matches the Timeline and these results. Remove all old COSTUME-3 numbers from it.

   - Make every piece specification match src/data/costumePieces.json exactly (wig band, head group, top groups, clips). Where the old text disagrees with the file, the file wins.

   - Add missing timeline entries for COSTUME-4A2, 4C and 6 from the progress files and git log. If an entry cannot be verified, write "unverified".

   - Replace every coverage percentage with the output of the tests that import the real builder, and state the region definition used.

   - Put the tsc error count and test counts from raw output, and name which outfit test file exists `Get-ChildItem tools/test_outfit*.mjs`).

   - Keep the "Not tested" list (device, touch, phone layout, visual appearance) and add anything new.

   Commit and push.

FINAL REPORT (max 20 lines)

0. DEVIATIONS first, then STATUS (name every FAILING check).

1. Step 1B: the e16f489 diff result; tsc error count.

2. Equivalence table (before/after per piece and gender).

3. Hypotheses 1 and 2: CONFIRMED/REJECTED with numbers.

4. Full failure list before and after Step 2.

5. Table per piece and gender: quadrant coverage %, loops, wig top and nape vs head_top_y (cm), belt rx/rz vs torso half-extents (cm).

6. Raw pass/fail of each command.

7. Files changed.

8. BLOCKED (exact reason); NOT TESTED; NEXT STEP.


---

TASK COSTUME-7A: WIG ONLY. Find what the dots on the back of the head are, then fix the wig so it covers the back of the head down to the nape, stays off the face, and has no dots. Do not touch any other piece, the camera, compare_before, or thresholds.

R0: append this ENTIRE message to docs/COSTUME6C_PROMPT.md under "COSTUME-7A", commit and push. Branch task/costume4c-clip-and-coverage; no merges; if a git command fails with a file-lock error, report the exact error and stop. Windows PowerShell: no grep/tail/head/sort/cat; use the Grep tool and short reads. BOTH genders in every step. Paste RAW command output with real numbers. A command that exits non-zero is FAILING (never "expected failure"). DEVIATIONS first, including anything partly done. Commit and push after each step.

FACTS (measured): body faces +Z in both genders. The wig face rule in src/utils/costumeBuilder.ts (about lines 447-452) is `centroid.z < -0.05 && centroid.y < hairlineY`; -0.05 is an absolute number and with +Z forward it drops the BACK of the head. hairlineY = head_top_y - hairlineDrop (0.02). The wig has front coverage 100%, back coverage about 75%; 74 (male) and 125 (female) unselected back vertices, all labeled "head". The male wig height is 0.215 and the existing test limit is 0.2 (do not change that limit). The app shows a coverage line in the Debug panel (female wig 715/840).

STEP 1, EVIDENCE (read-only; optional debug return in the builder is allowed, default behavior must be unchanged):

 a. Before any change, save per-gender triangle counts of top, bottom, shoes, gloves, wig to docs/costume7a_before.json (raw numbers).

 b. Wig: for the back half (z < head bone z) print: total region triangles, triangles dropped by the face rule, dropped by closure, dropped by other reasons (print the code that decides closure). Print the same for the front half.

 c. Count connected components of the SELECTED wig triangles (connected by shared vertices) and their sizes. Many small components = isolated floating triangles.

 d. Read the Debug panel code in Preview3DTestScreen.tsx and say exactly what Debug ON draws and whether it draws anything per uncovered vertex (dots, points, markers) with line numbers.

 e. Verdict in plain words: are the dots (1) debug markers, (2) isolated wig triangles, or (3) other. Give the numbers.

STEP 2, FIX (wig only):

 a. Wig uses band selection: every triangle whose centroid is in the wig region is taken, with NO bone labels and NO closure rule, so there are no holes.

 b. Remove the hard-coded -0.05 face rule. Replace it with a slanted lower edge defined in costumePieces.json and measured from the head bone: plane y(z) = head_top_y - drop_front + slope * (head_z - z), clipped exactly on the plane (use the existing clip code; if it only keeps whole triangles, the wig edge may be ragged: say so and use the exact splitting clip). Start values, to be tuned by eye later: about 0.08 m below the crown at the face side (hairline) and about 0.17 m below at the back (nape). All numbers in the data file, none in code or tests.

 c. Wig offset stays as it is in the data file.

STEP 3, TESTS (both genders; each exits 1 when it fails; constants at the top of the test file, not read from the data file):

 - at least 0.99 of body vertices inside the wig region are inside selected triangles, overall and in each of the four quadrants (front/back by z vs head bone z, left/right by x);

 - face clear: no wig vertex with z > head_z + 0.06 below head_top_y - 0.10;

 - nape: some wig vertex with z < head_z - 0.05 reaches y <= head_top_y - 0.14;

 - wig height <= 0.2 (existing limit, unchanged);

 - selected wig triangles form exactly 1 connected component (no floating dots) and 1 boundary loop.

 Paste the complete failure list.

STEP 4, VERIFY (raw): node --import tsx tools/test_costume_pieces.mjs (full output, then list every failing check by name with values; the female top 5 loops is a known, out-of-scope failure: still list it as FAILING), node tools/check_no_duplicate_builder.mjs. Print top, bottom, shoes, gloves counts per gender and compare with docs/costume7a_before.json: they must be identical. tsc: NOT RUN is fine. Update COSTUME6_PROGRESS.md and add a short CHANGELOG.md entry. Commit and push.

FINAL REPORT (max 12 lines): 0. DEVIATIONS first, then STATUS per step. 1. What the dots are, with numbers. 2. Back/front wig triangles dropped by reason. 3. Wig table per gender and quadrant: covered/total/% (covered never above total). 4. Wig height, top-to-nape drop in cm, component count, loops. 5. Other pieces' counts before vs after. 6. Raw pass/fail of each command, full list of failing checks. 7. Files changed. 8. BLOCKED; NOT TESTED; NEXT STEP.
