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


## CONTINUATION 1

TASK COSTUME-6C, CONTINUATION 1: verify C1 properly, then do C2 (evidence) and STOP. No fixes in this session. This message overrides docs/COSTUME6C_PROMPT.md where they differ.

R0: append this ENTIRE message verbatim to docs/COSTUME6C_PROMPT.md under the heading "CONTINUATION 1", commit and push. Then read COSTUME6_PROGRESS.md. All other ENVIRONMENT, CONTEXT, RULES and NOT-ALLOWED text in the saved prompt still applies (Windows PowerShell, no grep/tail/head/sort/cat; Grep tool and short reads only; branch task/costume4c-clip-and-coverage; no merges; BOTH genders on every part; paste RAW command output, never "all match" without numbers; DEVIATIONS first; no shortcuts).

ALREADY CONFIRMED BY THE PREVIOUS SESSION (re-confirm each with Grep and line numbers): (a) armYMax is never read; (b) clipTrianglesAtPlane keeps only whole triangles, no splitting (about lines 449-459); (c) selectTriangles filters by centroid label and centroid y band; (d) the data file has both yMin/yMax and clips; (e) selectTriangles has a wig face rule (about lines 363-367): `if (centroid.z < -0.05 && centroid.y < hairlineY) continue`. The -0.05 is an absolute world number, not relative to the head.

OVERRIDE, FORWARD DIRECTION: the saved prompt says the body faces +Z. That was NEVER measured. Do not assume it. For each gender, from the contract bones, compute forward = (toe.L head z - foot.L head z) and the same for the right side; also print the head bone's head x, y, z. Print the sign and values per gender. Use this MEASURED sign for the words "front" and "back" everywhere in this task. If male and female differ, report it.

PART 1: C1-VERIFY (small, mandatory)

 a. Extract the C0 numbers (per gender and piece: triangle count, pre-offset bbox min/max x y z, hash of sorted selected triangle indices) from COSTUME6_PROGRESS.md into docs/costume6c_before.json, copying the exact values.

 b. Write tools/compare_before.mjs. It must build each piece through the SAME exported function the app calls (selectPieceTriangles, then buildOffsetGeometry, exactly as buildCostumePiece does) and compare with docs/costume6c_before.json: counts equal, bbox within 1e-6, hash equal. Exit 1 on any mismatch. Paste the full raw output for both genders and all 5 pieces.

 c. Delete tools/diag_baseline_c0.mjs (or make it call selectPieceTriangles; it must not contain a second pipeline).

 d. Report: does the app read clips or yMin/yMax? Does tools/test_costume_pieces.mjs still read legacy yMin/yMax anywhere (it did in the bone probes)? Do not change either yet; just report with line numbers.

 If compare_before.mjs fails, STOP after committing the script and report the mismatch. Do not go to Part 2.

PART 2: C2 EVIDENCE (tools/diag_regions.mjs; it must use selectPieceTriangles; both genders)

 WIG

  - Region: body vertices with y >= head_top_y - 0.18. Split into four quadrants using the head bone's head position as the origin and the MEASURED forward sign (front/back by z, left/right by x).

  - For each quadrant print: total vertices, vertices inside selected wig triangles, % covered.

  - Face rule counters: how many triangles in the wig region does the face rule (lines 363-367) drop, split by front and back. Print the value of hairlineY, how it is computed (from which data field), and the head bone's head z, so the absolute -0.05 can be compared with it.

  - For unselected vertices in each quadrant print counts by owner-bone label, the gap between nearest and second-nearest bone segment (flag ties < 1e-4), and the REASON dropped (label not in group / outside y band / face rule / closure / other). If the builder cannot report reasons, add a small read-only debug return; no behavior change.

 TOP

  - Shoulder cap: body vertices within 0.06 m of each upperarm bone head, left and right.

  - Upper back: body vertices with y between shoulder_y - 0.15 and neck_y + 0.06 on the measured BACK side of the spine_03 bone head.

  - For each region: total, inside selected top triangles, % covered; for unselected vertices, counts by label and by reason.

 End with H1, H2, H3 as CONFIRMED or REJECTED, with the numbers:

  H1: nearest-bone labeling gives back-of-skull vertices a label other than "head", so the wig drops them.

  H2: the wig face rule removes the back (or the wrong side) of the head.

  H3: the top's shoulder and upper-back holes are vertices labeled with bones that are not in the top's groups (clavicle, neck).

 Commit and push. Then STOP. Do not edit selection code, data values or thresholds in this session.

PART 3: VERIFY (raw output): `node --import tsx tools/test_costume_pieces.mjs`, `node tools/check_no_duplicate_builder.mjs`, `node tools/compare_before.mjs`. For tsc, run in the background with a long timeout or skip it and write NOT RUN; do not retry it more than once.

FINAL REPORT (max 15 lines): 0. DEVIATIONS first, then STATUS per part. 1. Forward sign and values per gender. 2. compare_before raw result. 3. Facts (a) to (e) re-confirmed with line numbers; what the app and test read (clips vs yMin/yMax). 4. Wig table per gender and quadrant: total, covered, %; face-rule counts front vs back; hairlineY and how it is computed. 5. Top table per gender: shoulder cap L and R %, upper back %; labels and reasons for unselected vertices. 6. H1, H2, H3 with numbers. 7. Raw pass/fail of each command; files changed. 8. BLOCKED; NOT TESTED; NEXT STEP.


## CONTINUATION 2

TASK COSTUME-6C, CONTINUATION 2: reconcile C1 with proof, then run the C2 evidence. No behavior fixes in this session. This message overrides docs/COSTUME6C_PROMPT.md where they differ.

R0: append this ENTIRE message verbatim to docs/COSTUME6C_PROMPT.md under the heading "CONTINUATION 2", commit and push. Then read COSTUME6_PROGRESS.md. All ENVIRONMENT, CONTEXT, RULES and NOT-ALLOWED text in the saved prompt and in CONTINUATION 1 still applies (Windows PowerShell, no grep/tail/head/sort/cat; Grep tool and short reads only; branch task/costume4c-clip-and-coverage; no merges; BOTH genders on every part; paste RAW command output with the actual numbers, never "mismatch" or "all match" alone; DEVIATIONS first, including anything you skip or only partly do).

KNOWN FROM CONTINUATION 1 (do not redo): forward = +Z for both genders (measured). tools/compare_before.mjs fails for every piece. The report did not say why. Two explanations are open: (X) selectPieceTriangles behaves differently from the pipeline the app ran before C1; (Y) docs/costume6c_before.json was measured or transcribed with different definitions. Do NOT regenerate docs/costume6c_before.json from current code, do NOT change selection code, data values or thresholds, and do NOT edit compare_before.mjs to make it pass.

PART 1: RECONCILE (decide X or Y with numbers)

 a. Find the commit that introduced selectPieceTriangles (git log --oneline on src/utils/costumeBuilder.ts). Call its parent PRE_C1. Print both hashes and the one-line messages.

 b. Print, as raw excerpts, the exact lines in COSTUME6_PROGRESS.md that the C0 numbers came from, and the exact code in tools/diag_baseline_c0.mjs that defines: what "count" counts (triangles before or after plane clipping), what the bbox is (pre-offset or post-offset), and what goes into the hash. Then print the same three definitions from tools/compare_before.mjs. State whether they are identical.

 c. Write a temporary tools/reconcile_c1.mjs. Extract the builder as it was at PRE_C1 with `git show PRE_C1:src/utils/costumeBuilder.ts` into a temporary file tools/_old_builder.ts (it must never be committed; delete it before committing; if it fails to import because sibling files changed, report the exact error and use PRE_C1 copies of those siblings the same way). Run the OLD app path (the selection the old buildCostumePiece used) and the NEW selectPieceTriangles on the same GLBs, for both genders and all 5 pieces, through ONE shared metrics function defined once in this script: triangle count after clipping, pre-offset bbox, hash of sorted selected source-triangle indices. Print both sides raw, with all numbers.

 d. For every piece where old and new differ: print how many triangles are only in old and only in new; for the first 5 of each print centroid x y z and owner-bone label. Print that piece's clips and yMin/yMax/armYMax from the data file, and state whether the new path ignores yMin/yMax when clips exist, and whether the clips reproduce the old yMin/yMax planes exactly.

 e. Verdict per piece, with numbers: SAME PIPELINE (baseline was measured differently) / C1 CHANGED APP BEHAVIOR (name the cause and line numbers) / UNKNOWN. Delete tools/_old_builder.ts. Do not commit reconcile_c1.mjs unless it passes check_no_duplicate_builder.mjs; otherwise paste its output into COSTUME6_PROGRESS.md and delete it. Also delete tools/diag_baseline_c0.mjs now that the shared metrics replace it. Commit and push.

 f. Re-confirm fact (b) properly: read the body of clipTrianglesAtPlane and say with line numbers whether it splits triangles or only keeps whole triangles, and why the previous session said lines 449-459 while this one says 523. Re-confirm the face rule's current line numbers.

PART 2: C2 EVIDENCE. Do it exactly as written in CONTINUATION 1, PART 2 (wig four quadrants, face-rule counters front vs back, hairlineY and how it is computed, unselected vertices by label, nearest/second-nearest gap, reason dropped; top shoulder cap L and R, upper back; H1, H2, H3 CONFIRMED or REJECTED with numbers), with these changes: use forward = +Z (measured), so front is z > head bone z and back is z < head bone z; run it on the CURRENT selectPieceTriangles (what the app runs now) and label the output "CURRENT PIPELINE"; additionally print, for the wig, how many triangles with centroid z < -0.05 and y < hairlineY exist in the wig region and what share of the back-quadrant triangles that is. If Part 1 ends UNKNOWN for any piece, still do Part 2 but say so in the report.

PART 3: VERIFY (raw output): `node --import tsx tools/test_costume_pieces.mjs`, `node tools/check_no_duplicate_builder.mjs`, `node --import tsx tools/compare_before.mjs`. tsc: NOT RUN is acceptable.

FINAL REPORT (max 18 lines): 0. DEVIATIONS first, then STATUS per part. 1. PRE_C1 hash and the metric definitions side by side (old baseline vs compare_before). 2. Old vs new table per gender and piece (count, bbox, hash). 3. Verdict X or Y per piece, the cause, and what differs (only-old, only-new counts). 4. Fact (b) answer and line numbers. 5. Wig quadrant table per gender, face-rule counts front vs back, hairlineY and its source. 6. Top table per gender: shoulder cap L and R %, upper back %; labels and reasons. 7. H1, H2, H3 with numbers. 8. Raw pass/fail of each command; files changed. 9. BLOCKED; NOT TESTED; NEXT STEP.


## CONTINUATION 3

TASK COSTUME-6C, CONTINUATION 3: fix the broken evidence, then resolve three contradictions with numbers. No behavior fixes. This message overrides docs/COSTUME6C_PROMPT.md and earlier continuations where they differ.

R0: append this ENTIRE message verbatim to docs/COSTUME6C_PROMPT.md under "CONTINUATION 3", commit and push. Read COSTUME6_PROGRESS.md. All ENVIRONMENT, RULES and NOT-ALLOWED text still applies (Windows PowerShell, no grep/tail/head/sort/cat; Grep tool and short reads; branch task/costume4c-clip-and-coverage; no merges; BOTH genders; RAW command output with real numbers; DEVIATIONS first, including anything partly done). A command that exits non-zero is FAILING. Never write "PASS (expected failures)" or "FAIL (EXPECTED)".

KNOWN: forward = +Z for both genders (measured, do not redo). Do NOT regenerate docs/costume6c_before.json from current code, do NOT edit compare_before.mjs to make it pass, do NOT change selection code, data values or thresholds. Read-only debug additions to the builder are allowed (optional debug argument that returns reasons; default behavior must be byte-identical).

PART 1: CONTRADICTIONS (Grep and short reads; paste the lines)

 a. Print the full current body of selectPieceTriangles and selectTriangles with line numbers (short reads). Say whether ANY wig face rule exists today (search: "hairline", "isWig", "-0.05", "z <"), with line numbers. Say whether the previous session's quote (lines 447-452) is in the file now. Run `git log -S"-0.05" --oneline -- src/utils/costumeBuilder.ts` and `git log -S"hairlineY" --oneline -- src/utils/costumeBuilder.ts` and print them: which commit added and which removed the rule, if any.

 b. Print the full body of clipTrianglesAtPlane with line numbers. Does it split triangles on the plane, or keep only whole triangles? Is there a second clip function (search "clip", "split", "plane")? Which one does the app call for each piece today?

 c. Print where the C0 baseline numbers were captured: the commit hash that was checked out when docs/costume6c_before.json's numbers were recorded (see COSTUME6_PROGRESS.md and git log of that file).

PART 2: OLD VS NEW (the app's own public function, one shared metrics script)

 a. Write ONE script OUTSIDE the repo, C:\temp\snap_pieces.mjs, that imports the repo's src/utils/costumeBuilder.ts from the current working directory, loads both rigged GLBs the way compare_before.mjs does, and for each gender and each of the 5 pieces calls the same top-level function the app calls (buildCostumePiece or its current equivalent; if the signature differs between commits, adapt only the call, and print it). It prints per piece: triangle count, vertex count, bbox min/max of the FINAL geometry, and a hash of the final position array. Output JSON to a file given on the command line.

 b. Create two temporary worktrees: `git worktree add C:\temp\wt_pre 11701a7` and `git worktree add C:\temp\wt_c1 9786025` (also run it on the current HEAD in the main repo). In each worktree, make node_modules available (junction to the main repo's node_modules with `cmd /c mklink /J node_modules <path>`), run `node --import tsx C:\temp\snap_pieces.mjs <outfile>` from inside that worktree. If a commit cannot run, report the exact error and try its parent or child; never skip silently.

 c. Compare the three JSON files in a small script and print one raw table per gender: piece, count PRE / C1 / HEAD, bbox PRE / C1 / HEAD, hash equal yes/no. Then: does 9786025 (C1) change any piece versus 11701a7? Does HEAD differ from C1? For every piece that differs, print triangles only-in-old and only-in-new (compare by sorted source-triangle index if the function can return it; otherwise by rounded centroid) and the first 5 centroids with owner label.

 d. Verdict per piece: C1 PRESERVED BEHAVIOR / C1 CHANGED BEHAVIOR (with the cause and line numbers) / UNKNOWN. If C0's recorded numbers (Part 1c) equal PRE's numbers, say the baseline was right and compare_before is wrong; if not, say which commit the baseline really matches.

 e. Remove both worktrees `git worktree remove --force`). Do not commit anything from C:\temp.

PART 3: EVIDENCE WITH VALID NUMBERS (tools/diag_regions.mjs, CURRENT pipeline, both genders)

 Fix the metric first: for a region, covered = number of UNIQUE body vertices that belong to at least one selected triangle; total = vertices in the region; covered <= total always; percent = covered/total. Add an assert that fails if covered > total.

 Wig: region = body vertices with y >= head_top_y - 0.18; four quadrants around the head bone head (front z > head z, back z < head z; left/right by x). Print covered/total/% per quadrant, plus the FINAL rendered wig mesh (after offset): triangle count and centroid z split front/back, and its height from min y to max y (explain the male 0.215).

 For every unselected region vertex, record ONE reason from this fixed list, using a debug return from the builder (no behavior change): LABEL_NOT_IN_GROUP, OUTSIDE_Y_BAND, FACE_RULE (only if Part 1a found a rule), CLOSURE, CLIP_REMOVED, OTHER. Print the counts per reason and quadrant, and the label split. If the builder cannot tell CLOSURE from the others, say so and show the code that decides.

 Top: shoulder cap (within 0.06 m of each upperarm bone head, L and R) and upper back (y between shoulder_y - 0.15 and neck_y + 0.06, behind the spine_03 head, z < its z): covered/total/% and the same reason counts and labels.

 End with H1, H2, H3 as CONFIRMED / REJECTED / OPEN with numbers. H2 may only be REJECTED if Part 1a proves no rule exists in the code the app runs.

PART 4: TESTS (raw)

 Run `node --import tsx tools/test_costume_pieces.mjs` and paste the COMPLETE output, then list every failing check by name with its values. Also run `node tools/check_no_duplicate_builder.mjs` and `node --import tsx tools/compare_before.mjs` (it may fail; report raw). tsc: NOT RUN is fine.

FINAL REPORT (max 18 lines): 0. DEVIATIONS first, then STATUS per part. 1. Contradictions: face rule exists yes/no with lines and commits; clip function behavior with lines; commit of the C0 baseline. 2. Old vs new table per gender and piece. 3. Verdict per piece and the cause. 4. Wig table per gender and quadrant (covered/total/%), reason counts, rendered wig front/back triangles, wig height. 5. Top table per gender: shoulder L and R, upper back, reasons, labels. 6. H1, H2, H3. 7. Full list of failing checks. 8. Files changed (confirm no data, threshold or selection changes). 9. BLOCKED; NOT TESTED; NEXT STEP.
