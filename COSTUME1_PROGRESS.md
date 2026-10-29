# COSTUME-1 Progress

## Step 0: Git setup
- [x] Branch created: task/costume1-v2-derived from task/garment3b-v2-garments
- [x] Baseline tsc errors: 39

## Step 1: Piece definitions data
- [x] Created src/data/costumePieces.json
- [x] Bone groups defined from contract
- [x] 6 pieces: top, bottom, shoes, gloves, wig, belt

## Step 2: Builder utility
- [x] Created src/utils/costumeBuilder.ts
- [x] Pure functions, Node-testable
- [x] Triangle selection by bone + y-band
- [x] Normal-offset geometry
- [x] Belt torus builder

## Step 3: Render in app
- [x] V2CostumeDemo component created
- [x] Preview3DTestScreen updated with demo section
- [x] Enter/exit demo (preserves previous body set)
- [x] Piece toggles and color picker
- [x] Committed and pushed (tsc: 39 -> 36)

## Step 4: Node check
- [x] Created tools/test_costume_pieces.mjs
- [x] All pieces build successfully
- [x] All checks pass (triangles, vertices, bbox, offset, belt radii, bone assignments)

## Step 5: Verification
- [x] tsc --noEmit: 36 errors (3 fewer than baseline 39)
- [x] node tools/test_attach_module.mjs: PASS (99/99)
- [x] node scripts/verify-glb-models.mjs: PASS
- [x] npx expo export --platform web: SUCCESS
- [x] V2 GLBs present in export (Male: 568KB, Female: 568KB)

## Step 6: Changelog and git
- [x] Update CHANGELOG.md
- [x] Commit and push
- [x] Final report created
