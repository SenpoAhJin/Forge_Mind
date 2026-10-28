# GARMENT-2 Integration Audit

## Purpose
Audit all 3D integration points before switching from V1 (unskinned, centered) to V2 (rigged, floor origin) body models.

---

## a. Body Model Asset Loading

### Current V1 Assets Loaded

| Finding | File:Line | Evidence |
|---------|-----------|----------|
| BodyModel imports V1 GLBs | src/components/BodyModel.tsx:5-6 | `import MALE_GLTF from '../../assets/models/3D_Model_Male.glb'` and `FEMALE_GLTF` |
| V1 assets in expo-asset plugin | app.json:35-36 | `"./assets/models/3D_Model_Male.glb"` and `"./assets/models/3D_Model_Female.glb"` in `expo-asset-plugin` config |
| V1 assets referenced by old scripts | scripts/glb_inspect.js:153-154 | Hardcoded paths to `3D_Model_Male.glb` and `3D_Model_Female.glb` (but script reads positional args) |
| V1 assets expected by verify script | scripts/verify-glb-models.mjs:61-63 | Default targets `3D_Model_Male.glb` and `3D_Model_Female.glb` |
| Wig caps depend on V1 assets | app.json:38-39 | `Wig_White_Cap_Male.glb` and `Wig_White_Cap_Female.glb` in expo-asset plugin |
| Wig generator uses V1 bounds | scripts/generate_wig_glb.mjs:18-21 | Hardcoded headTopY from V1 bodyBounds (male: 0.931, female: 0.944) |

### V2 Assets NOT Referenced in src/

| Finding | File:Line | Evidence |
|---------|-----------|----------|
| V2 rigged assets exist in assets/models/ | assets/models/ | Files present: `3D_Model_Male_V2_rigged.glb`, `3D_Model_Female_V2_rigged.glb`, and their `*_contract.json` |
| V2 NOT imported in any src/ file | (grep result) | Search for `V2_rigged` in src/: 0 matches |
| V2 NOT in app.json expo-asset plugin | app.json | No `_V2_rigged.glb` entries |
| V2 contracts NOT imported in src/ | (file search) | `*_V2_contract.json` files not imported by any app code |

---

## b. Coordinate Frame Assumptions

### Assumption: Centered Near Origin (V1 Frame)

| Finding | File:Line | Evidence |
|---------|-----------|----------|
| bodyBounds assumes centered | src/data/bodyBounds.ts:17-24 | Male min.y: -0.950, max.y: 0.931 (centered vertically, ~0 mid-point) |
| bodyBounds female centered | src/data/bodyBounds.ts:25-28 | Female min.y: -0.951, max.y: 0.944 (centered vertically) |
| getBodyCenter returns ~[0, 0, 0] | src/data/bodyBounds.ts:32-38 | Center computed as average of min/max (near origin for V1) |
| Wig generator assumes V1 headTopY | scripts/generate_wig_glb.mjs:18-21 | Uses V1 head top (male: 0.931, female: 0.944) for wig positioning |
| garmentRegistry placeholder uses V1 bounds | src/data/garmentRegistry.ts:63-66 | Placeholder hat positioned via `getHeadTopY(bodyType)` from V1 bodyBounds |
| Preview3D camera targets centered body | src/components/Preview3D.tsx:142 | Comment: "real bodies are ~1.89 m tall and sit centred on the origin (feet at y ~= -0.95)" |
| Preview3D camera position for centered | src/components/Preview3D.tsx:142 | `camera={{ position: [0, 0.2, 4], fov: 50 }}` - Y=0.2 targets center of V1 body |
| ProjectPlanningScreen uses default framing | src/screens/cosplayer/ProjectPlanningScreen.tsx | No custom camera override; inherits Preview3D's centered framing |

### V2 Frame Difference

| Finding | File:Line | Evidence |
|---------|-----------|----------|
| V2 contract specifies floor origin | assets/models/3D_Model_Male_V2_contract.json:10 | `"origin": "floor, centred under the body"` |
| V2 height is 1.9m from floor | assets/models/3D_Model_Male_V2_contract.json:6 | `"height": 1.9` (floor at Y=0, head at Y~1.9) |
| V2 root bone at floor | assets/models/3D_Model_Male_V2_contract.json:16-21 | Root bone head at `[0.0, 0.00133, -0.00021]` (Y near 0) |

**Impact**: Switching to V2 without updating bounds/camera will show body with feet at Y=0, head at Y=1.9. Camera at Y=0.2 will target the knees, not torso center.

---

## c. White Wig Cap Positioning

### Current Positioning Method

| Finding | File:Line | Evidence |
|---------|-----------|----------|
| Wig caps are procedural GLBs, not attached | src/data/garmentRegistry.ts:85-98 | White wig cap entries as asset modules (not placeholders), no bone attachment |
| Wig GLBs generated with fixed position | scripts/generate_wig_glb.mjs:18-21 | GLB baked at fixed [centerX, headTopY, centerZ] from V1 bodyBounds |
| Wig caps imported as static models | src/data/garmentRegistry.ts:13-14 | `import WIG_WHITE_CAP_MALE from '../../assets/models/garments/Wig_White_Cap_Male.glb'` |
| Wig rendered as primitive scene | src/components/SelectedGarment.tsx:165-168 | `<primitive object={scene} />` - no bone attachment, static mesh |
| Wig position baked in GLB file | scripts/generate_wig_glb.mjs:94-113 | Vertices positioned relative to V1 head top during generation |

### Components Involved

| Component | Role | File:Line |
|-----------|------|-----------|
| SelectedGarment | Renders garment for one item | src/components/SelectedGarment.tsx:165 |
| GarmentMesh | Loads GLB, applies color tint | src/components/SelectedGarment.tsx:92-168 |
| GarmentLayer | Renders from garment registry | src/components/GarmentLayer.tsx:327 |
| itemToModelMapper | Maps inventory to garment | src/utils/itemToModelMapper.ts:393 |

**Positioning**: Static GLB mesh loaded at origin with baked vertex positions from V1 head bounds. No runtime attachment or offset. Will not work correctly on V2 body (different head position).

---

## d. DEF-* Bone Names in src/

| Finding | File:Line | Evidence |
|---------|-----------|----------|
| NO DEF- bone names in src/ | (grep result) | Search for `DEF-` in src/: 0 matches |

**Note**: V1 bodies use DEF-* bone naming (Blender Rigify convention). V2 contracts use dot-suffix names (foot.L, foot.R). The app never directly references bone names today, so no cleanup needed.

---

## e. Scripts That Would Fail on Body Asset Change

### Hard-Coded V1 Asset Paths

| Script | Issue | File:Line | Impact |
|--------|-------|-----------|--------|
| scripts/glb_inspect.js | Hardcoded V1 filenames | scripts/glb_inspect.js:153-154 | Would inspect V1 even if V2 loaded; accepts CLI args as workaround |
| scripts/verify-glb-models.mjs | DEFAULT_TARGETS points to V1 | scripts/verify-glb-models.mjs:61-63 | Would verify V1; accepts CLI args to override |
| scripts/generate_wig_glb.mjs | V1 headTopY hardcoded | scripts/generate_wig_glb.mjs:18-21 | Generated wigs would float/sink on V2 body |

### Checks Expecting V1 Structure

| Script | Check | File:Line | Impact |
|--------|-------|-----------|--------|
| scripts/verify-glb-models.mjs | Expects body_size_bone_scale.json | scripts/verify-glb-models.mjs:60 | V2 has no body_size scaling (cancelled); script would fail looking for scale table |
| scripts/verify-glb-models.mjs | Validates bone scale = [1,1,1] | scripts/verify-glb-models.mjs:231-262 | V2 might fail if bones have any non-identity scale (needs verification) |
| scripts/verify-glb-models.mjs | Expects DEF-* bone names | scripts/verify-glb-models.mjs:177-180 | V2 uses foot.L style names; script iterates over `boneScaleTable` keys (would fail if table not updated) |

**Note**: verify-glb-models.mjs is tightly coupled to the cancelled body-size feature (looks for `body_size_bone_scale.json` and validates bone scales). V2 has no such feature. Script would need significant rework or retirement.

---

## Summary

### 5 Critical Integration Points

1. **Body Asset Loading**: BodyModel.tsx hardcodes V1 GLB imports; expo-asset plugin lists V1 only
2. **Coordinate Frame**: All positioning code (bodyBounds, camera, placeholders) assumes centered-origin V1 frame; V2 has floor origin
3. **White Wig Cap**: Static GLB with baked V1 head position; needs bone attachment for V2
4. **Bone Names**: V2 uses dot-suffix names (foot.L) requiring three.js sanitization; V1 uses DEF-* (no app usage found)
5. **Scripts**: verify-glb-models.mjs coupled to cancelled body-size feature; wig generator uses V1 bounds

### No V2 Usage

- V2 rigged assets exist but are NOT imported or referenced anywhere in src/ or app.json
- No attach-by-bone code exists in src/
- No contract JSON reading in src/
