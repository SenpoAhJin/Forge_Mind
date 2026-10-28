# E1 Step 0 Findings

## (a) How does Preview3D decide which garments get a toggle button?

**File:** `src/components/Preview3D.tsx:114`

```typescript
const availableGarments = getGarmentsForBodyType(bodyType);
```

**Answer:** Yes, `Preview3D` calls `getGarmentsForBodyType(bodyType)` from the garment registry. This function is imported from `../data/garmentRegistry` and filters the registry entries that support the given body type ('male' or 'female').

The filtered garments are then mapped to toggle buttons (lines 186-209), but ONLY when NOT in `wornGarments` mode (line 184 checks `!useWornMode`).

---

## (b) What does src/utils/wearing.ts export and who calls it?

**File:** `src/utils/wearing.ts`

**Exports:**
- Type: `GarmentSlot` ('head' | 'torso' | 'legs' | 'hands' | 'prop')
- Type: `PlaceholderShape` (runtime-generated geometry descriptors)
- Type: `WornGarment` (worn garment descriptor for renderer)
- Function: `matcherSlotToGarmentSlot(matcherSlot: string): GarmentSlot | null`
- Function: `colorNameToHex(colorName: string): string`
- Function: `buildWornGarments(matchResult, ownedItems, bodyType): WornGarment[]`

**Who calls it:**
- `Preview3D.tsx` imports the `WornGarment` type (line 11) for props
- The `buildWornGarments` function is designed to be called by matcher result screens, but grep shows it's not yet called anywhere in the codebase (D8a scaffolding only)

---

## (c) How are the two body GLBs registered in app.json?

**File:** `app.json:27-34`

```json
"plugins": [
  "@react-native-community/datetimepicker",
  "expo-sharing",
  [
    "expo-asset",
    {
      "assets": [
        "./assets/models/3D_Model_Male.glb",
        "./assets/models/3D_Model_Female.glb"
      ]
    }
  ]
]
```

**Answer:** The two body GLBs are listed in the `expo-asset` plugin's `assets` array. This tells Expo to bundle them with the app and make them available via `Asset.fromModule()`.

---

## (d) Does glb.d.ts type a .glb import as number?

**File:** `src/types/glb.d.ts:13-15`

```typescript
declare module '*.glb' {
  const assetModule: string | number;
  export default assetModule;
}
```

**Answer:** Yes, a `.glb` import is typed as `string | number`. On native it's a numeric asset ID, on web it's a dev-server URL string.

---

## (e) Exact OwnedAttire field names for type and color

**File:** `src/types/owned-attire.ts:42-43`

```typescript
auto_categorized_type: AttireCategory;
auto_categorized_color: string;
```

**Answer:** The field names are exactly `auto_categorized_type` and `auto_categorized_color` (with underscores, not camelCase). Confirmed in multiple files:
- `src/types/owned-attire.ts` (type definition)
- `src/utils/wearing.ts:136-137` (usage)
- `src/data/owned-attire-seed.ts` (seed data)

---

## File inventory

| File | Lines | Purpose |
|------|-------|---------|
| `src/data/garmentRegistry.ts` | 85 | Registry of available garments (currently 1 placeholder entry) |
| `src/components/GarmentLayer.tsx` | 203 | Renders individual garments (placeholder or GLB) |
| `src/data/bodyBounds.ts` | 53 | Body bounding boxes for male/female models |
| `src/utils/wearing.ts` | 185 | Worn garment data layer (D8a scaffolding) |
| `src/components/Preview3D.tsx` | 236 | Main 3D preview with toggles |
| `src/components/BodyModel.tsx` | 67 | Renders base body GLBs |
| `src/components/ThreeDPreview.tsx` | 56 | Wrapper for production preview |
| `src/types/glb.d.ts` | 16 | TypeScript declaration for .glb imports |
| `app.json` | 35 | Expo config with expo-asset plugin |
| `metro.config.js` | 17 | Metro bundler config (includes glb extension) |
| `scripts/check_garment_registry.js` | 144 | Validation script for garment registry |
| `scripts/glb_inspect.js` | 198 | GLB binary inspector (no dependencies) |
| `docs/GARMENT_SPEC.md` | ? | Garment specification document |
| `docs/AI_PROGRESS.md` | ? | Wearing section status |

---

