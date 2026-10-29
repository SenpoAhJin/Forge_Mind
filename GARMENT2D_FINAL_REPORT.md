# GARMENT-2d: Follow Test Fix - Final Report

## Git State
- Branch: task/garment2b-real-loader
- Last commit: 6ff3dbe (GARMENT-2d fix), pushed to origin
- No uncommitted changes

## Diagnostic Results (tools/diag_follow.mjs)
| Bone   | Bone World Scale         | Shear Diff | L0 vs Matrix | L0 vs PostRot |
|--------|--------------------------|------------|--------------|---------------|
| head   | (1.0000, 1.0000, 1.0000) | 1.05e-8    | 0.00e+0      | 0.00e+0       |
| foot.L | (1.0000, 1.0000, 1.0000) | 2.37e-7    | 0.00e+0      | 0.00e+0       |
| foot.R | (1.0000, 1.0000, 1.0000) | 2.37e-7    | 0.00e+0      | 0.00e+0       |

**Decision:** CASE A (stale L0). Local matrix doesn't change after bone rotation because matrixAutoUpdate=true means three.js rebuilds it from position/quaternion/scale, which stay constant in bone-local space. The TEST was wrong, not the module.

## Test Results (tools/test_attach_module.mjs)
**Male V2:** 44/44 PASS (5 bone resolution, 15 offset, 15 follow, 3 detach, 2 error, 4 filter)
**Female V2:** 44/44 PASS (5 bone resolution, 15 offset, 15 follow, 3 detach, 2 error, 4 filter)
**Cross-body:** 1/1 PASS
**Grand Total:** 89/89 PASS

## Exit Codes
- npx tsc --noEmit: 1 (39 pre-existing errors in unrelated files, NO NEW errors in touched files)
- node tools/test_attach_module.mjs: 0 (89/89 PASS)
- node tools/glb_inspect.js (male): 0
- node tools/glb_inspect.js (female): 0

## Summary
Fixed follow test by removing stale L0 reference. Test now uses `expected = delta * oldWorld` formula where `delta = newBoneWorld * inverse(oldBoneWorld)`. All 89 tests pass with real GLTFLoader.
