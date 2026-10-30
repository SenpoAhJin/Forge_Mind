# COSTUME-7C IMPLEMENTATION PLAN

## STEP 1: Shared Viewer (DONE - CostumeViewer already exists)
- CostumeViewer component exists at src/components/CostumeViewer.tsx
- Takes: bodyType, enabledPieces (Set), pieceColors (Map), debugMode, showCameraControls, onDebugInfo
- Returns: Canvas with V2CostumeDemo + camera controls
- Used by: Preview3DTestScreen (demo)
- VERIFICATION: Demo must keep working identically

## STEP 2: Project Screen (ProjectDashboardScreen)
Replace ThreeDPreview with:
1. Import: useOutfit hook, CostumeViewer, costume pieces data
2. Get outfit state: `const { outfit, isLoading, togglePiece, setColor, wearFull, removeAll } = useOutfit(bodyType, projectId)`
3. Replace ThreeDPreview with CostumeViewer (bodyType, outfit pieces as Set, outfit colors as Map)
4. Add piece controls ABOVE the viewer:
   - Per-piece row: [Piece Name] [Toggle] [Color Picker]
   - Slots: top, bottom, shoes, gloves, wig, belt
   - Wrap at phone width
   - Wear full costume button
   - Remove all button
5. Remove garmentRegistry imports and placeholder buttons
6. Body-type switch stays, drives CostumeViewer bodyType

## STEP 3: Outfit Planning Screen (ProjectPlanningScreen)
Same as Step 2 but:
1. Replace Canvas + BodyModel + GarmentLayer with CostumeViewer
2. Use same outfit state (useOutfit hook with bodyType, no projectId unless linked)
3. Remove black placeholder shape
4. Keep character info, AI suggestions, readiness indicator
5. Outfit controls go in the UI (not just in 3D)

## STEP 4: V1 Cleanup
1. Do NOT delete V1 assets or bodyAssets.ts V1 entries
2. Do NOT change activeBodySetId default (stays 'v1')
3. Only these two screens use V2:
   - ProjectDashboardScreen: Local override in component (setActiveBodySet('v2') on mount, restore on unmount)
   - ProjectPlanningScreen: Same pattern
   - Preview3DTestScreen: Already has V2 toggle
4. Report remaining V1 users

## STEP 5: Verification
- node --import tsx tools/test_costume_pieces.mjs
- node tools/check_no_duplicate_builder.mjs
- tools/test_outfit_state.mjs or test_outfit_store.mjs
- tools/test_attach_module.mjs
- node scripts/verify-glb-models.mjs
- npx expo export --platform web
- tsc (count errors, compare)
- CHANGELOG entry
