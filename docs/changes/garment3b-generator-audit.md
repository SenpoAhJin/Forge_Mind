# GARMENT-3b Generator Audit

## Summary

Two generator scripts create garment GLB files for the ForgeMind system. Both use V1 body constants and bake garments in the V1 coordinate frame (body center near y=0).

## Generators

### 1. scripts/generate_wig_glb.mjs (Mobile Repo)

**Outputs:** 
- `assets/models/garments/Wig_White_Cap_Male.glb`
- `assets/models/garments/Wig_White_Cap_Female.glb`

**Body Constants Used:**
- HARD-CODED: `BODIES.male = { headTopY: 0.931, centerX: -0.002, centerZ: -0.012 }`
- HARD-CODED: `BODIES.female = { headTopY: 0.944, centerX: -0.003, centerZ: 0.002 }`
- HARD-CODED: `HEAD = { halfHeight: 0.125, halfWidth: 0.095, halfDepth: 0.105 }`
- HARD-CODED: `WIG_THICKNESS = 0.015`

**Method:** Procedurally generates ellipsoid cap meshes without Blender. Creates GLB structure directly in Node.js.

**Garment Naming:** `Wig_<Style>_<Gender>` (e.g., Wig_White_Cap_Male)

**Triangle Count:** ~512 triangles per wig (16 rings × 32 segments)

**File Size:** ~3-4 KB per wig

**Frame:** V1 (head top at y ≈ 0.93, centered near origin)

---

### 2. ../forgemind-backend/scripts/generate_procedural_garments.mjs

**Outputs (20 files in `assets/models/garments/procedural/`):**
- 5 wigs: Short_Cap, Medium_Bob, Long_Straight, Spiky_Short, Ponytail
- 5 tops: TShirt, Jacket, Hoodie, Tank, Crop
- 3 bottoms: Pants, Shorts, Skirt
- 2 footwear: Boots, Sneakers
- 5 accessories: Headband, Gloves, Belt, Backpack, Weapon

**Body Constants Used:**
- IMPLICIT: All garments use absolute Y=0 as origin or implicit body-center positioning
- NO explicit body bounds referenced in code
- Dimensions are HARD-CODED geometric primitives (cylinders, boxes, spheres)

**Method:** Three shape primitives:
- `createCylinder(radius, height)` for torso/leg garments
- `createBox(width, height, depth)` for rigid items
- `createSphere(radius)` for round accessories

**Garment Naming:** `<Slot>_<Style>` (e.g., Top_TShirt, Bottom_Pants)

**Triangle Counts:**
- Cylinders: 512 triangles (16 segments × 2 faces × 16 rings)
- Boxes: 12 triangles (6 faces × 2 triangles/face)
- Spheres: 512 triangles (16 lat × 16 lon × 2)

**File Sizes:** 2-4 KB per garment

**Frame:** V1 ASSUMED (all geometry positioned implicitly around y=0 body center, no contract-based positioning)

---

## V1 Frame Evidence

Examined bounding boxes from generated GLBs (via glb_inspect.js):

- **Wig_White_Cap_Male.glb**: Y range spans near head top (y ≈ 0.8-1.0), consistent with V1 male headTopY=0.931
- **Top_TShirt.glb**: Positioned in torso region around y=0 center (V1 frame)

V1 body bounds (from bodyBounds.generated.json):
- Male V1: Y ∈ [-0.950, 0.931], center ≈ -0.009
- Female V1: Y ∈ [-0.951, 0.944], center ≈ -0.004

V2 body bounds:
- Male V2: Y ∈ [-0.0002, 1.900], feet at floor (y≈0)
- Female V2: Y ∈ [-0.0001, 1.900], feet at floor (y≈0)

**Shift:** V2 is translated ~0.95m upward relative to V1.

---

## Parameterization Assessment

| Generator                     | Parameterizable | Reason                                                                 |
|-------------------------------|-----------------|------------------------------------------------------------------------|
| generate_wig_glb.mjs          | NO              | Hard-coded V1 head dimensions and positions; no contract input         |
| generate_procedural_garments  | NO              | Hard-coded primitive sizes with no body-relative positioning logic     |

**Rationale:** Both generators embed V1-specific constants and lack any mechanism to read body contracts or adjust to different coordinate frames. Full rewrites required for V2.
