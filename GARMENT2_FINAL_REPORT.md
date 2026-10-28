# GARMENT-2 Final Report

**Task**: Build standalone, unit-tested attach-by-bone module + audit 3D integration points  
**Branch**: task/garment2-attach-module  
**Status**: ✅ COMPLETE  
**Commit**: 3185ba2  
**Date**: Wednesday, October 28, 2026

---

## Summary

Built a standalone, fully-tested attach-by-bone module for rigid accessories (wigs, shoes) on V2 rigged body models. The module provides bone resolution, offset-based attachment, and automatic following with no app behavior changes. All 60 unit tests pass with real THREE.js and GLB parsing. Integration audit identified 5 critical issues blocking V2 adoption.

---

## Deliverables

### 1. attachToBone Module (`src/utils/attachToBone.ts`, 286 lines)

**Public API**:
```typescript
// Resolve bone with exact + sanitized fallback
function resolveBone(bodyScene: Object3D, boneName: string): THREE.Bone

// Get attach bones for slot with optional filter
function getAttachBones(
  contract: RigContract, 
  slot: string, 
  filter?: { side?: 'L'|'R', part?: 'foot'|'toe' }
): string[]

// Attach accessory to bone with offset
function attachAccessory({
  bodyScene: Object3D,
  boneName: string,
  accessory: Object3D,
  offset: AttachmentOffset
}): { detach: () => void }

interface AttachmentOffset {
  position: [number, number, number];    // metres
  rotation_deg: [number, number, number]; // Euler XYZ degrees
  scale: [number, number, number];        // multiplier
}
```

**Key Features**:
- Bone resolution handles both exact names ("foot.L") and sanitized names ("footL")
- Offset frame: position (m), rotation_deg (Euler XYZ), scale in model-space axes
- Relative to bone's head position at bind pose
- Detach is idempotent, creates no leaks
- No hard-coded bone/slot names (from contract JSON)

**Implementation**:
- Desired world matrix = bone world head + offset
- Accessory local = inverse(bone.matrixWorld) * desired world
- Sets accessory.matrixAutoUpdate = false, parents to bone

### 2. Attachment Offsets Data

**`src/data/attachmentOffsets.json` (58 lines)**:
- male/female structure
- wig → head: zero offset
- shoes → foot.L/R, toe.L/R: zero offsets
- Ready for tuning with real asset measurements

**`src/utils/loadAttachmentOffsets.ts` (166 lines)**:
- Validates position: ±1.0 m
- Validates scale: 0.1 to 10.0
- Validates rotation: ±360 deg
- Throws on invalid data at load time
- Provides getAttachmentOffset(), getSlotOffsets() accessors

### 3. Test Suite

**`tools/test_attach_module.mjs` (285 lines)**:
- 60 tests: 7 assertions per bone, both bodies
- Tests bone resolution, attachment, parenting, matrixAutoUpdate, detach, idempotent, re-attach
- Real THREE.js with GLB binary parser (no browser deps)
- Exit code 1 on any failure
- **Results**: 60/60 PASS ✅

**Additional Tests**:
- `test_attach_follow.js`: 10/10 PASS ✅
- `glb_inspect.js`: Both V2 GLBs PASS bind-pose verification ✅
- `npx tsc --noEmit`: 0 new TypeScript errors ✅

### 4. Integration Audit

**`docs/changes/garment2-integration-audit.md` (60 lines)**:

**5 Critical Findings**:

a. **V1 Asset Loading** (BLOCKING):
   - BodyModel.tsx:5-6 imports V1 GLBs (3D_Model_Male.glb, 3D_Model_Female.glb)
   - app.json:35-36 expo-asset plugin lists V1 only
   - NO V2 references in src/ (grep: 0 matches)
   - **Impact**: App cannot load V2 bodies until loader updated

b. **Centered Coordinate Frame** (HIGH):
   - bodyBounds.ts:17-28 assumes centered frame (min.y: -0.95, max.y: 0.93)
   - Preview3D.tsx:142 camera at [0, 0.2, 4] targets V1 center (head cut off with V2)
   - **Impact**: Camera, bounds, placeholders all positioned for V1

c. **White Wig Cap** (MEDIUM):
   - Static procedural GLBs from generate_wig_glb.mjs with baked V1 headTopY (0.931, 0.944)
   - Rendered as `<primitive object={scene} />` in SelectedGarment.tsx with no bone attachment
   - **Impact**: Wig cap doesn't follow head bone, baked at wrong height for V2

d. **Bone Names** (RESOLVED):
   - NO DEF-* usage in src/ (grep: 0 matches)
   - V2 contracts use dot-suffix names (foot.L, toe.L)
   - **Resolution**: resolveBone() handles both exact ("foot.L") and sanitized ("footL") names

e. **Failing Scripts** (LOW):
   - verify-glb-models.mjs:60 expects body_size_bone_scale.json (cancelled feature)
   - generate_wig_glb.mjs:18-21 uses V1 headTopY constants
   - **Impact**: Scripts fail with V2 but don't block app development

---

## Technical Decisions

### Offset Frame
- **Model-space axes** at bind pose, not bone-local axes
- Avoids dependency on Blender bone roll (which varies between exports)
- Position in metres relative to bone head position
- Rotation as Euler XYZ degrees (converted to quaternion)
- Scale as [x, y, z] multiplier

### Bone Resolution Strategy
1. Try exact match first (V2 bones preserve dots: "foot.L")
2. Fall back to sanitized match (handles loaders that strip special chars)
3. Helpful error with closest matches if not found

### Data-Driven Design
- No hard-coded bone names or slot names in code
- All bone mappings from contract JSON
- Offsets are data (JSON), not constants
- Enables easy tuning without code changes

---

## Test Results

```
✅ tools/test_attach_module.mjs:     60/60 tests PASS
✅ tools/test_attach_follow.js:      10/10 tests PASS  
✅ tools/glb_inspect.js:             Both V2 GLBs PASS bind-pose verification
✅ npx tsc --noEmit:                 0 new TypeScript errors
```

---

## Files Created

- `src/utils/attachToBone.ts` (286 lines)
- `src/data/attachmentOffsets.json` (58 lines)
- `src/utils/loadAttachmentOffsets.ts` (166 lines)
- `tools/test_attach_module.mjs` (285 lines)
- `docs/changes/garment2-integration-audit.md` (60 lines)
- `GARMENT2_PROGRESS.md` (progress tracking)
- `GARMENT2_FINAL_REPORT.md` (this document)

---

## Git History

```
3185ba2 (HEAD -> task/garment2-attach-module, origin/task/garment2-attach-module)
    GARMENT-2: Standalone attach-by-bone module + integration audit
    - 8 files changed, 1377 insertions(+), 1 deletion(-)
```

---

## Next Steps (GARMENT-3)

The module is ready for integration. Next task will:

1. **Switch app to V2 bodies**:
   - Update BodyModel.tsx imports
   - Update app.json expo-asset plugin
   - Update bodyBounds for floor origin
   - Update camera positioning

2. **Integrate attachAccessory in SelectedGarment.tsx**:
   - Replace `<primitive object={scene} />` with attachAccessory call
   - Load offsets from attachmentOffsets.json
   - Clone useGLTF scenes before attaching

3. **Generate procedural wigs at V2 head height**:
   - Update generate_wig_glb.mjs with V2 headTopY
   - Regenerate wig cap GLBs

4. **Test in-app**:
   - Verify wig follows head bone
   - Verify shoes follow foot/toe bones
   - Verify detach on garment change

---

## Conclusion

GARMENT-2 is complete with a fully-tested, standalone attach-by-bone module. All 60 tests pass, 0 new TypeScript errors, and the integration audit provides a clear roadmap for V2 adoption. The module is data-driven, offset-based, and handles bone name variations automatically.

**Branch**: task/garment2-attach-module (pushed to origin)  
**Ready for**: Code review and merge to master  
**Blocks**: GARMENT-3 (V2 integration)
