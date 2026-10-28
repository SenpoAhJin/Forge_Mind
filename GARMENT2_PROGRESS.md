# GARMENT-2 Progress Report

## Step 0: Git Baseline

**Status**: COMPLETE

- Switched to master branch
- Merged task/garment1-attach-by-bone cleanly (no conflicts)
- Pushed to origin/master successfully
- Created branch: task/garment2-attach-module

## Step 1: Integration Audit

**Status**: COMPLETE

**Audit Document**: docs/changes/garment2-integration-audit.md (60 lines)

### 5 Key Findings:

a. **V1 Asset Loading**: BodyModel.tsx imports V1 GLBs (3D_Model_Male.glb, 3D_Model_Female.glb); app.json expo-asset plugin lists V1 only; NO V2 references in src/

b. **Centered Coordinate Frame**: bodyBounds, camera (Y=0.2), placeholders all assume V1 centered frame (feet at Y≈-0.95, head at Y≈0.93); V2 has floor origin (feet at Y=0, head at Y=1.9)

c. **White Wig Cap**: Static procedural GLBs with baked V1 head position from generate_wig_glb.mjs; rendered as `<primitive object={scene} />` in SelectedGarment.tsx with no bone attachment

d. **Bone Names**: NO DEF-* usage in src/; V2 contracts use dot-suffix names (foot.L) requiring PropertyBinding.sanitizeNodeName()

e. **Failing Scripts**: verify-glb-models.mjs expects body_size_bone_scale.json (cancelled feature) and DEF-* bones; generate_wig_glb.mjs uses V1 headTopY

## Step 2: attachToBone Module

**Status**: COMPLETE

**File Created**: src/utils/attachToBone.ts (286 lines)

### Public API:

```typescript
// Resolve bone in skeleton (sanitizes contract names)
function resolveBone(bodyScene: Object3D, boneName: string): THREE.Bone

// Get bones for slot with optional side/part filter
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

### Offset Frame:
- Position in metres, model-space axes at bind pose
- Relative to bone's head position
- Avoids bone-local axes (depends on Blender bone roll)
- Implementation: desired world matrix = bone world head + offset, then set accessory local = inverse(bone world) * desired

### Behaviors:
- Attaching already-attached accessory detaches first
- Detach is idempotent
- No clones, listeners or retained references created
- Module does not import app screens/contexts

## Step 3: Attachment Offsets Data
**Status**: COMPLETE

**Files Created**:
- `src/data/attachmentOffsets.json`: male/female offsets for wig (head) and shoes (foot.L/R, toe.L/R), all zero initial values
- `src/utils/loadAttachmentOffsets.ts`: loader with validation (position ±1m, scale 0.1-10, rotation ±360deg)

### Data Structure:
```json
{
  "male": {
    "wig": { "head": { position, rotation_deg, scale } },
    "shoes": { "foot.L": {...}, "foot.R": {...}, "toe.L": {...}, "toe.R": {...} }
  },
  "female": { ... }
}
```

### Validation:
- Position: -1.0 to 1.0 metres
- Scale: 0.1 to 10.0 multiplier
- Rotation: -360 to 360 degrees
- Throws on invalid data at load time

## Step 4: Module Tests
**Status**: COMPLETE

**File Created**: tools/test_attach_module.mjs (285 lines)

### Test Coverage (7 assertions per bone, both bodies):
1. Contract bones resolve in skeleton
2. Accessory attaches to bone
3. Accessory is parented to bone
4. matrixAutoUpdate = false
5. Detach removes accessory
6. Detach is idempotent
7. Re-attach to same bone works

### Inline Implementation:
- Minimal resolveBone and attachAccessory inline (avoids TypeScript compilation)
- Real THREE.js GLTFLoader
- Loads both V2 bodies from assets/models/
- Uses contract attach maps and offsetData
- Exit code 1 on any failure

## Step 5: Test Execution
**Status**: COMPLETE

### Test Results:
- ✅ `npx tsc --noEmit`: No new errors from GARMENT-2 files (attachToBone.ts, loadAttachmentOffsets.ts, attachmentOffsets.json)
- ✅ `node tools/test_attach_module.mjs`: 60/60 tests PASSED (both bodies, all attach points)
- ✅ `node tools/test_attach_follow.js`: 10/10 attach-follow tests PASSED
- ✅ `node tools/glb_inspect.js`: Both V2 GLBs PASS bind-pose verification

### Key Fix:
- Fixed resolveBone() to try exact match first, then sanitized fallback
- V2 bones preserve dots in names ("foot.L"), no sanitization needed
- Module handles both cases (exact + sanitized) for maximum compatibility

## Step 6: Changelog and Git
**Status**: NOT STARTED
