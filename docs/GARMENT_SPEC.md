# Garment Asset Specification for ForgeMind
**Created:** October 14, 2026  
**Purpose:** Guidelines for creating 3D garment assets that align with ForgeMind body models

---

## Body Measurements

| Property | Male Body | Female Body | Notes |
|----------|-----------|-------------|-------|
| **File** | `3D_Model_Male.glb` | `3D_Model_Female.glb` | |
| **File Size** | 1370.62 KB | 1224.05 KB | |
| **Triangles** | 19,451 | 19,882 | Target <10k for garments |
| **Bounding Box (units)** | 0.876 × 1.881 × 0.324 | 0.804 × 1.895 × 0.374 | Width × Height × Depth |
| **Height** | 1.881 units | 1.895 units | ~1.9 units tall |
| **Width** | 0.876 units | 0.804 units | Shoulder width |
| **Depth** | 0.324 units | 0.374 units | Front-to-back |
| **Min (X, Y, Z)** | [-0.440, -0.950, -0.174] | [-0.404, -0.951, -0.185] | Bottom-left-back corner |
| **Max (X, Y, Z)** | [0.436, 0.931, 0.150] | [0.399, 0.944, 0.189] | Top-right-front corner |
| **Rig Type** | Skinned (706 joints) | Skinned (707 joints) | Rigify armature |
| **Animations** | 0 | 0 | Static pose (T-pose) |
| **Materials** | 0 | 0 | Exported without materials |

**Origin Match:** NO - Bodies have different center positions  
**Coordinate System:** Both use glTF standard (+Y up, -Z forward, +X right)

---

## Coordinate System

All ForgeMind bodies follow the **glTF 2.0 standard:**

- **Up Axis:** +Y (positive Y points upward)
- **Forward Axis:** -Z (negative Z points forward, toward viewer)
- **Right Axis:** +X (positive X points right)
- **Origin:** World origin (0, 0, 0) at body center
- **Units:** Generic units (~1.9 units = full body height, interpret as meters for real-world reference)

---

## Blender Export Settings (CRITICAL)

To ensure your garment aligns with the body models with no code adjustments:

### 1. Coordinate System
- **Blender Scene:** Use Blender's default (+Z up, +Y forward)
- **Export Transform:** GLB exporter handles Blender → glTF conversion automatically
- **Do NOT** manually rotate objects to match glTF axes in Blender

### 2. Origin and Position
- **Body Import:** Import the body GLB into Blender first (`File > Import > glTF 2.0`)
- **Garment Modeling:** Create your garment around the imported body at its exact position
- **Origin Location:** Keep garment origin at (0, 0, 0) world origin (same as body)
- **World Position:** Model garment at body's world position, not relative to body root bone

### 3. Scale and Units
- **Scene Unit:** Blender Generic units (no specific unit system)
- **Scale:** 1:1 scale (1 Blender unit = 1 glTF unit)
- **Apply Transforms:** Before export, select garment → `Object > Apply > All Transforms` (Ctrl+A → All)
- **Target Height:** Body is ~1.9 units tall; use this as reference

### 4. Geometry
- **Triangle Count:** Target <10,000 triangles per garment (bodies are ~20k)
- **File Size:** Target <1 MB per garment GLB
- **Topology:** Clean quad or tri topology (no n-gons)
- **Normals:** Consistent face normals (no inverted faces)
- **Manifold:** Watertight mesh (no holes, no duplicate vertices)

### 5. Materials
- **Single Material:** One material per garment (simplifies rendering)
- **Base Color:** Set in Blender's Principled BSDF
- **Export:** glTF exporter embeds material in GLB
- **No Textures:** Simple solid colors preferred (optional: single texture <512x512)

### 6. Rigging (OPTIONAL)
Bodies are **skinned/rigged** with 706-707 Rigify bones.

**For STATIC garments** (wigs, hats, rigid props):
- **No rigging needed** - garment will be parented to body root or specific bone
- **Advantage:** Simpler workflow, no weight painting
- **Limitation:** Garment won't deform with body (fine for rigid items)

**For DEFORMABLE garments** (shirts, pants, capes):
- **Rig to body skeleton** - use Blender's Armature modifier
- **Weight Painting:** Paint vertex weights to match body deformation
- **Bone Names:** Must match body bone names exactly (see inspection script output for list)
- **Complexity:** High - requires understanding of Rigify armature
- **Note:** Body bone names start with `DEF-` prefix (e.g., `DEF-spine`, `DEF-shoulder.L`)

**Recommendation for first garment:** Start with a static wig (no rigging needed)

### 7. Export Process

1. **Select** garment mesh only (do NOT export body)
2. **File > Export > glTF 2.0 (.glb)**
3. **Format:** glTF Binary (.glb) - NOT glTF Separate (.gltf + .bin)
4. **Include:**
   - ☑ Selected Objects
   - ☑ Apply Modifiers
   - ☑ Materials: Export
   - ☐ Animations (uncheck - not needed)
   - ☐ Cameras (uncheck)
   - ☐ Lights (uncheck)
5. **Transform:**
   - ☑ +Y Up (glTF standard)
   - Transform: Use default (Blender → glTF conversion)
6. **Geometry:**
   - ☑ Apply Modifiers
   - ☑ Normals (if using smooth shading)
7. **Export**

### 8. Verification

After export, verify your garment:
- **File Size:** <1 MB
- **Triangle Count:** <10,000 (run `node scripts/glb_inspect.js your_garment.glb`)
- **Bounding Box:** Within body bounds (see measurement table above)
- **Materials:** 1 material present
- **Skins:** 0 (for static) or 1 (for rigged)

---

## File Naming and Placement

### Naming Convention
Format: `[Slot]_[Description]_[BodyType].glb`

Examples:
- `Wig_White_Spiky_Male.glb` - White spiky wig for male body
- `Hat_Witch_Female.glb` - Witch hat for female body
- `Shirt_Black_Tshirt_Unisex.glb` - Black t-shirt for both bodies

**Rules:**
- PascalCase (no spaces or special characters except underscore)
- Descriptive (color, style, type)
- Body type suffix: `_Male`, `_Female`, or `_Unisex`
- Extensions: `.glb` only (not `.gltf`)

### File Location
Place garment GLB files in:
```
forgemind-mobile/
  assets/
    models/
      garments/    ← Create this directory
        Wig_White_Spiky_Male.glb
        Hat_Witch_Female.glb
        ...
```

### Registry Entry

After creating and placing your garment file, add it to the garment registry at `src/data/garmentRegistry.ts`:

```typescript
{
  id: 'wig-white-spiky-male',
  label: 'White Spiky Wig',
  slot: 'head',
  bodyTypes: ['male'],
  asset: require('../../assets/models/garments/Wig_White_Spiky_Male.glb'),
  placeholder: null,
  isPlaceholder: false,
}
```

**Fields:**
- `id`: Unique kebab-case identifier
- `label`: Human-readable display name
- `slot`: One of: `head`, `torso`, `legs`, `hands`, `feet`, `prop`
- `bodyTypes`: Array of `'male'`, `'female'`, or both
- `asset`: `require()` statement pointing to GLB file (Metro bundler resolves)
- `placeholder`: null (only used when asset is null)
- `isPlaceholder`: false (true only for placeholder entries)

---

## Slot Anchor Points

Garments attach to the body at these approximate positions (verified from body bounding boxes):

**Male body:** Y range -0.950 (feet) to +0.931 (head)  
**Female body:** Y range -0.951 (feet) to +0.944 (head)

| Slot | Anchor Point (Y coordinate) | Description |
|------|---------------------------|-------------|
| **head** | Y ≈ 0.65 to 0.94 | Top of head to neck (male max 0.931, female max 0.944) |
| **torso** | Y ≈ 0.10 to 0.60 | Chest, shoulders, upper body |
| **legs** | Y ≈ -0.50 to 0.10 | Waist to knees |
| **hands** | Y ≈ 0.00 to 0.30 | Wrist, palm area (X ±0.35 for left/right) |
| **feet** | Y ≈ -0.95 to -0.75 | Ankle, foot (min is -0.950 male, -0.951 female) |
| **prop** | Variable | Held items, backpacks, accessories |

**Note:** Ranges verified against actual body bounding boxes (male min/max: [-0.440, -0.950, -0.174] / [0.436, 0.931, 0.150], female: [-0.404, -0.951, -0.185] / [0.399, 0.944, 0.189]). Import body GLB into Blender to verify exact bone positions for rigged garments.

---

## Attachment Behavior

The app uses **world-space positioning** with no runtime animations:
- Garment shares the body's transform (position, rotation, scale)
- **Bodies render in T-pose** (rest pose from Blender export, no animations applied at runtime)
- Static garments parented to the body root will follow the body's transform (position/rotation) but remain rigid
- No runtime bone-parenting code exists - attachment is world-space only

**This means:**
- If you model a wig on the body's head in Blender at (0, 0.8, 0), it exports at (0, 0.8, 0) and renders at (0, 0.8, 0) in the app
- **No extra code needed** to position the garment - it "just works" if modeled correctly
- Bodies remain in T-pose (no animations, no pose changes at runtime - verified in `BodyModel.tsx` and `Preview3D.tsx`)
- A static garment parented to the body root in this app will move/rotate with the body but stay rigid

**For rigged garments:**
- Bone weights drive deformation (if body were animated, garment would follow)
- Currently bodies render static (T-pose), so rigged garments appear same as static
- Rigging infrastructure exists (skinned meshes with 706-707 bones) but no runtime animation applied
- Future: if animations added, rigged garments will deform automatically; static garments will remain rigid

---

## Example: Creating a Simple Wig

**Step-by-step workflow:**

1. **Import body:** Import `3D_Model_Male.glb` into Blender
2. **Model wig:** Create mesh around head (at body's world position)
3. **Single material:** Add Principled BSDF material, set white base color
4. **Keep origin at (0,0,0):** Do not move garment away from body
5. **Apply transforms:** Select wig → Ctrl+A → All Transforms
6. **Verify poly count:** <10k triangles (check in Blender's scene stats)
7. **Export:** Select wig only → Export GLB with settings above
8. **Place file:** Move `Wig_White_Spiky_Male.glb` to `assets/models/garments/`
9. **Register:** Add entry to `src/data/garmentRegistry.ts`
10. **Test:** Launch app, toggle wig in 3D preview screen

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Garment floats away from body | Wrong origin or world position | Re-export with garment at body's position |
| Garment too large/small | Scale not applied before export | Apply All Transforms (Ctrl+A) in Blender |
| Garment rotated wrong | Axis mismatch | Use glTF export transform (auto-converts) |
| Garment invisible | Inverted normals | Recalculate normals outside (Alt+N) in Blender |
| File too large | High poly count or textures | Reduce polygons, use smaller textures |
| Body doesn't load | Accidentally exported body with garment | Export garment mesh only |

---

## Technical Notes

- **Bodies use Rigify armature:** Full humanoid rig with FK/IK chains, face bones, fingers
- **No animations:** Bodies export in T-pose (rest pose), no animation data
- **No materials:** Bodies export without materials (rendered with default shader)
- **Origin difference:** Male and female have slightly different center positions due to modeling; garments must be modeled per body type
- **GLB vs GLTF:** Use GLB (binary) format, not separate GLTF (JSON + BIN)

---

## References

- **glTF 2.0 Spec:** https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- **Blender glTF Exporter:** https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html
- **Rigify Documentation:** https://docs.blender.org/manual/en/latest/addons/rigging/rigify/index.html

---

**Last Updated:** October 14, 2026  
**Body Models Version:** Fixed-scale GLB (no runtime bone scaling)  
**Garments Available:** 0 real, 1 placeholder (code-generated sphere)
