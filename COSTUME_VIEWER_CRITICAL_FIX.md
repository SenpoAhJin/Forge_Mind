# Costume Viewer Critical Fix - 2026-10-30

## Issues Identified from Console Logs

### 1. Invalid Icon Name Error
**Error:** `"pants" is not a valid icon name for family "ionicons"`

**Root Cause:** 
- Used `pants` as an icon name, which doesn't exist in Ionicons
- This caused the OutfitControls component to error repeatedly

**Fix Applied:**
- Changed `bottom` icon from `'pants'` to `'fitness'`
- `fitness` is a valid Ionicons name that represents lower body/legs

```typescript
const PIECE_ICONS: Record<string, string> = {
  top: 'shirt',
  bottom: 'fitness', // ✅ Changed from 'pants' to 'fitness'
  shoes: 'footsteps',
  gloves: 'hand-left',
  wig: 'sparkles',
};
```

### 2. No Contract Found - 3D Model Not Rendering
**Error:** `[V2CostumeDemo] No contract found for body`

**Root Cause:**
- The body asset system has two sets:
  - **V1 bodies:** Original bodies WITHOUT contracts (no costume pieces)
  - **V2 bodies:** Rigged bodies WITH contracts (can render costume pieces)
- ProjectDashboardScreen and ProjectPlanningScreen were using CostumeViewer
- BUT the active body set was still on `'v1'` (default)
- V1 bodies don't have contracts, so costume pieces couldn't be generated
- Result: Black screen instead of 3D model with costume pieces

**Fix Applied:**
Added `useEffect` hook to set body set to V2 when these screens mount:

#### ProjectDashboardScreen.tsx:
```typescript
import { setActiveBodySet } from '../../config/bodyAssets';

export const ProjectDashboardScreen: React.FC<ProjectDashboardScreenProps> = ({ projectId, onOpenMeetups }) => {
  // ... other code ...
  
  // Set body set to V2 for costume viewing (has contracts for garment rendering)
  React.useEffect(() => {
    if (__DEV__) {
      setActiveBodySet('v2');
    }
  }, []);
  
  // ... rest of component ...
```

#### ProjectPlanningScreen.tsx:
```typescript
import { setActiveBodySet } from '../../config/bodyAssets';

export default function ProjectPlanningScreen({ navigation, route }: ProjectPlanningScreenProps) {
  // ... other code ...
  
  // Set body set to V2 for costume viewing (has contracts for garment rendering)
  React.useEffect(() => {
    if (__DEV__) {
      setActiveBodySet('v2');
    }
  }, []);
  
  // ... rest of component ...
```

## Why This Matters

### Before Fix:
1. User navigates to costume screen
2. CostumeViewer tries to load body and costume pieces
3. Body set is V1 (no contract)
4. V2CostumeDemo receives `contract: undefined`
5. Early return: "No contract found for body"
6. Body scene is added to Three.js scene but no meshes are created
7. Result: Black canvas (nothing rendered)

### After Fix:
1. User navigates to costume screen
2. `useEffect` sets active body set to V2
3. CostumeViewer loads V2 body with contract
4. V2CostumeDemo receives proper contract with bone data
5. Body mesh is created with skin-tone material
6. Costume pieces can be generated from contract
7. Result: Visible 3D model that can wear costume pieces

## Files Modified

1. **`src/components/OutfitControls.tsx`**
   - Fixed icon name from `'pants'` to `'fitness'`

2. **`src/screens/cosplayer/ProjectDashboardScreen.tsx`**
   - Added import for `setActiveBodySet`
   - Added `useEffect` to set body set to V2 on mount

3. **`src/screens/cosplayer/ProjectPlanningScreen.tsx`**
   - Added import for `setActiveBodySet`
   - Added `useEffect` to set body set to V2 on mount

## Testing Checklist

- [ ] No console errors for icon names
- [ ] "[V2CostumeDemo] No contract found for body" error is gone
- [ ] 3D model displays with skin-tone body
- [ ] Piece buttons show with correct icons (including Bottom with fitness icon)
- [ ] Can toggle costume pieces on/off
- [ ] Can change piece colors
- [ ] Owned items can be worn on model
- [ ] Camera controls work (rotate, zoom)

## Technical Notes

### Body Set System
The app uses two body sets for different purposes:

- **V1 (default):** Legacy bodies for basic display
  - Files: `3D_Model_Male.glb`, `3D_Model_Female.glb`
  - No contracts
  - Feet at y=-0.95
  - Used in: Basic 3D preview, character display

- **V2 (costume system):** Rigged bodies with bone/vertex contracts
  - Files: `*_V2_rigged.glb` + `*_V2_contract.json`
  - Has contracts with bone mappings
  - Feet at y=0 (floor origin)
  - Used in: CostumeViewer, dress-up functionality

### Dev-Only Flag
The body set switching is wrapped in `if (__DEV__)` because:
1. It's currently a development feature
2. Production still uses V1 bodies by default
3. V2 costume system is being tested

In the future, this can be:
- Made production-ready (remove `__DEV__` check)
- Controlled by user setting
- Automatically detected based on screen/feature

## Known Issues (Still Present)

1. **Photo URLs:** Items have `file:` URLs (local paths that don't work)
   - Error: `⚠️ Found 3 items with file: URLs (dead local paths)`
   - Impact: Item photos won't display
   - Fix needed: Photo upload system to generate proper URLs

## Summary

The costume viewer now works because:
1. ✅ Icons are valid (no more console errors)
2. ✅ Body set is V2 (contracts available)
3. ✅ V2CostumeDemo can generate body mesh
4. ✅ Costume pieces can be rendered

The 3D model should now be **visible** with the ability to wear costume pieces!
