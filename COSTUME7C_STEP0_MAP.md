# COSTUME-7C STEP 0 MAP

## (a) Main Screen Files

### Project Screen (ProjectDashboardScreen)
- **File**: `src/screens/cosplayer/ProjectDashboardScreen.tsx`
- **Line 384-387**: Renders `<ThreeDPreview bodyType={bodyType} width={300} height={400} />`
- **Line 371**: Comment says "Variant garments are not shown here yet"
- **Currently**: Shows V1 body (via bodyAssets.ts default), no garments/pieces rendered

### Outfit Planning Screen (ProjectPlanningScreen)
- **File**: `src/screens/cosplayer/ProjectPlanningScreen.tsx`
- **Currently**: Uses Canvas + BodyModel + GarmentLayer + SelectedGarment directly
- **No garments rendered**: Uses old V1 approach with garmentRegistry (Head Hat placeholder, White Wig Cap)

## (b) Current V2 Demo Viewer

### V2CostumeDemo Component
- **File**: `src/components/V2CostumeDemo.tsx`
- **How it works**:
  - Takes props: `bodyType`, `enabledPieces` (Set), `pieceColors` (Map), `debugMode`, `onDebugInfo`
  - Uses `getActiveBodyAsset(bodyType)` from bodyAssets.ts to get V2 body
  - Loads body via `useGLTF(bodyAsset.glb)`
  - Builds costume pieces at runtime using `buildCostumePiece()` from costumeBuilder.ts
  - Uses data from `src/data/costumePieces.json`

### V2 Costume Demo Screen (Preview3DTestScreen)
- **File**: `src/screens/Preview3DTestScreen.tsx`
- **Uses**: CostumeViewer component (wraps V2CostumeDemo)
- **Renders**: V2 body + per-piece toggles + color pickers + "Wear full costume" + "Remove All" + Debug mode
- **Outfit state**: Saved to AsyncStorage per body type (male/female)

## (c) V1/V2 Body Selection

### bodyAssets.ts
- **File**: `src/config/bodyAssets.ts`
- **Current default**: `activeBodySetId = 'v1'` (line ~73)
- **V1 bodies**: 3D_Model_Male.glb, 3D_Model_Female.glb (old, feet at y=-0.95)
- **V2 bodies**: 3D_Model_Male_V2_rigged.glb, 3D_Model_Female_V2_rigged.glb (floor origin, 1.9m tall, 23 bones)
- **Function**: `setActiveBodySet(setId)` switches active set (dev-only)

### Screens using V1 body (via BodyModel):
1. **ProjectDashboardScreen** (line 384): Uses ThreeDPreview → Preview3D → BodyModel
2. **ProjectPlanningScreen** (line ~180+): Uses Canvas + BodyModel directly
3. **ThreeDPreview** component (src/components/ThreeDPreview.tsx): Wraps Preview3D
4. **Preview3D** component (src/components/Preview3D.tsx): Uses BodyModel

### BodyModel usage:
- **BodyModel** (src/components/BodyModel.tsx) uses `getActiveBodyAsset(bodyType)` from bodyAssets.ts
- Currently all screens get V1 because activeBodySetId='v1'

## (d) "Head Hat (placeholder)" and "White Wig Cap"

### garmentRegistry.ts
- **File**: `src/data/garmentRegistry.ts`
- **Head Hat (placeholder)**:
  - id: `'placeholder-head-hat'`
  - label: `'Head Hat (placeholder)'`
  - slot: `'head'`
  - asset: `null` (uses placeholder shape)
  - placeholder: `{ type: 'cylinder', position: (bodyType) => [0, headTop + 0.06, 0], scale: [0.12, 0.12, 0.12], color: '#FF6B6B' }`
  - **Attachment**: Position computed from `getHeadTopY(bodyType)` - uses V1 body bounds
  
- **White Wig Cap**:
  - id: `'wig-white-cap-male'` / `'wig-white-cap-female'`
  - label: `'White Wig Cap'`
  - slot: `'head'`
  - asset: `WIG_WHITE_CAP_MALE` / `WIG_WHITE_CAP_FEMALE` (real GLB files)
  - **Attachment**: Likely uses old bone attach code with V1 bone names

### These are V1-era garments
- Both use V1 body bounds and V1 attachment system
- NOT compatible with V2 costume pieces system

## (e) Project Data - Slot and Color

### Project Type (types/projects.ts)
- **No garments field**: Project interface has no `garments: []` field
- **No per-item slot/color**: Projects only have metadata (name, character_id, variant_id, budget, dates, etc.)

### Character Type (types/user-character.ts)
- **targetColors**: `string[]` - array of color strings (e.g. ['Blue', 'White'])
- **No garment data**: Characters have colors but no slots or items

### Conclusion:
- **Projects do NOT store per-item slot mappings**
- **Projects do NOT store per-item colors**
- **targetColors exist at Character level** (for suggestions), not Project level

## (f) Outfit State Storage

### useOutfit Hook
- **File**: `src/hooks/useOutfit.ts`
- **Manages**: Outfit state for a given scope (body type or project)
- **Storage**: AsyncStorage via adapter pattern

### outfitStore.ts
- **File**: `src/utils/outfitStore.ts`
- **OutfitState structure**:
  ```typescript
  {
    version: number,
    pieces: {
      [slot: string]: {
        on: boolean,
        color: string,
        itemId?: string,
        source: 'user' | 'item' | 'suggestion'
      }
    }
  }
  ```
- **Scopes**:
  - `{ type: 'body', bodyType: 'male'|'female' }` - per body type
  - `{ type: 'project', projectId: string }` - per project
- **Storage key**: `@forgemind:outfit:body:male` or `@forgemind:outfit:project:{id}`

### Current State:
- **Outfit state IS saved** per scope (body or project)
- **Per-piece on/off, color, and source** are tracked
- **Starting colors**: From costumePieces.json `defaultColor` field
- **Project link**: IF `useOutfit(bodyType, projectId)` called with projectId, outfit is project-specific

### Where saved:
- AsyncStorage with keys like:
  - `@forgemind:outfit:body:male`
  - `@forgemind:outfit:body:female`
  - `@forgemind:outfit:project:abc123`
