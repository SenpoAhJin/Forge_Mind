# COSTUME-7C PROGRESS

## NEXT STEP

STEP 1: SHARED VIEWER - Already complete. CostumeViewer exists at src/components/CostumeViewer.tsx and is working in Preview3DTestScreen.

STEP 2: PROJECT SCREEN (ProjectDashboardScreen at src/screens/cosplayer/ProjectDashboardScreen.tsx)

Replace line 384-387 ThreeDPreview with CostumeViewer + outfit controls:

1. Import: `import { useOutfit } from '../../hooks/useOutfit';`
2. Import: `import CostumeViewer from '../../components/CostumeViewer';`
3. Import costume pieces: `const costumePiecesData = require('../../data/costumePieces.json');`
4. Add outfit hook after line ~95: `const { outfit, isLoading: outfitLoading, togglePiece, setColor, wearFull, removeAll } = useOutfit(bodyType, projectId);`
5. Convert outfit to Sets/Maps for CostumeViewer:
   ```typescript
   const enabledPieces = useMemo(() => {
     if (!outfit) return new Set<string>();
     return new Set(Object.entries(outfit.pieces).filter(([_, p]) => p.on).map(([slot]) => slot));
   }, [outfit]);
   
   const pieceColors = useMemo(() => {
     if (!outfit) return new Map<string, string>();
     return new Map(Object.entries(outfit.pieces).map(([slot, p]) => [slot, p.color]));
   }, [outfit]);
   ```
6. Replace <ThreeDPreview /> section (lines ~370-397) with costume controls + CostumeViewer:
   - Piece toggles + color pickers (wrap for phone width)
   - "Wear full costume" and "Remove All" buttons
   - CostumeViewer with bodyType, enabledPieces, pieceColors
7. Remove garment-related imports if any

Files to modify:
- src/screens/cosplayer/ProjectDashboardScreen.tsx

VERIFICATION after Step 2:
- Run `node --import tsx tools/test_costume_pieces.mjs` - demo should still pass with same numbers
- Screen should show V2 body + pieces at phone width
- Commit and push

## COMPLETED

R0: Branch created task/costume7c-main-screens, pushed
Progress note updated per user acceptance of wig
Outfit files imported from task/costume4d1-outfit-planning
STEP 0 MAP: Completed, documented in COSTUME7C_STEP0_MAP.md
STEP 1: CostumeViewer already exists and works

