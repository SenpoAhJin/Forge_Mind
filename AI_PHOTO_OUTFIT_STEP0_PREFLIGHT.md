# AI-PHOTO-1 STEP 0 — Preflight Report

## Branch & Git Status

**Current branch:** `feature/ai-photo-outfit`  
**Created from:** `task/costume7c-main-screens`

**Modified files (not committed):**
- src/components/OutfitControls.tsx
- src/components/V2CostumeDemo.tsx
- src/screens/cosplayer/CharacterBrowseScreen.tsx
- src/screens/cosplayer/ProjectDashboardScreen.tsx
- src/screens/cosplayer/ProjectPlanningScreen.tsx

**Untracked files:**
- .tsc-errors.txt
- CHARACTER_DELETE_TOAST_FEATURE.md
- COSTUME_VIEWER_CRITICAL_FIX.md
- COSTUME_VIEWER_FIX_REPORT.md

## TypeScript Check

```
npx tsc --noEmit error count: 36 errors
```

**Baseline:** 36 TypeScript errors before starting work.

## Test Results

### test_costume_pieces.mjs

**Status:** 1 failure (pre-existing, not in scope)

```
Male test: ALL PASSED
Female test: FAILED - top: 5 boundary loops, expected 4
```

This is a known 3D garment topology issue, not related to photo extraction feature.

### test_outfit_store.mjs

**Status:** ALL TESTS PASSED (75/75)

All outfit storage operations work correctly:
- Scope isolation
- Save/load round trips
- Toggle/set operations
- Category/color mapping
- Apply item logic
- Wear/remove operations

## Reuse Candidates

### 1. photosRouter.ts (owned items)

**Location:** `forgemind-backend/src/inventory/photosRouter.ts`

**Relevant patterns:**
- multer setup with memoryStorage
- Magic byte verification (JPEG, PNG, WebP)
- 5 MB file size limit
- requireSession middleware
- Error codes: `no_file`, `unsupported_type`, `photo_too_large`
- UUID-based filenames
- UPLOADS_DIR pattern: `uploads/owned-items/`

**Reuse decision:** Copy the security patterns (magic bytes, file size, session auth) but create a NEW route that processes in-memory only and does NOT persist the image.

### 2. itemSlotMap.json

**Location:** `forgemind-mobile/src/data/itemSlotMap.json`

**Content:** Maps AttireCategory to costume piece slots:
```json
{
  "wig": "wig",
  "top": "top",
  "bottom": "bottom",
  "footwear": "shoes",
  "accessory": "belt",
  "fabric": null,
  "material": null,
  "other": null
}
```

**Reuse decision:** Direct reuse for matching owned items to extracted slots.

### 3. colorNames.json

**Location:** `forgemind-mobile/src/data/colorNames.json`

**Content:** 9 named colors + "unclear":
```json
{
  "white": "#FFFFFF",
  "black": "#000000",
  "red": "#EF4444",
  "blue": "#3B82F6",
  "pink": "#EC4899",
  "brown": "#92400E",
  "green": "#10B981",
  "purple": "#8B5CF6",
  "yellow": "#F59E0B",
  "unclear": null
}
```

**Reuse decision:** Expand into `outfitPalette.json` with CIELAB-friendly colors. Add more shades but keep it FIXED and VERSIONED.

### 4. useOutfit hook

**Location:** `forgemind-mobile/src/hooks/useOutfit.ts`

**Expected functions:**
- `loadOutfit(scope)`
- `togglePiece(slot, on)`
- `setColor(slot, hex)`
- `applyItem(item)`
- `wearFullCostume()`
- `removeAll()`

**Reuse decision:** Direct reuse. The target outfit will be stored in a separate scope (per-project) and applied via existing togglePiece/setColor.

### 5. OutfitControls component

**Location:** `forgemind-mobile/src/components/OutfitControls.tsx`

**Relevant patterns:**
- Fixed 5-piece grid layout (top, bottom, shoes, gloves, wig)
- Color picker with swatches
- Toggle on/off per slot
- Optional targetColorSwatches prop
- Icons per piece type

**Reuse decision:** Adapt layout patterns for the target-vs-worn comparison screen. Do NOT modify this component.

### 6. Existing Scoring Formula

**Search needed:** Will check if there's an existing scoring formula in the codebase during implementation. If found, preserve the weights.

## Evaluation Ground Truth

**Search results:** No `character_images` folders or `cosplay_matches` JSON found in the mobile workspace.

**Implication:** The evaluation data referenced in the task prompt exists elsewhere or must be created. For Step 4 evaluation, I will:

1. Check if test images exist in a different location
2. If not found, create a minimal test set (3-5 images) with hand-labeled ground truth
3. Document the small sample size limitation in the eval report

**Action:** Defer ground truth creation to Step 4. If no existing data is found, I will ask for approval to create a minimal test set or skip formal evaluation and rely on determinism tests only.

## Upload Serving

**Route:** `/uploads` (static express.static middleware)

**Security:**
- Served from `uploads/` directory
- Headers: `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=31536000`
- **No auth check** on read (public static files)
- **No ownership check** on read
- **No EXIF stripping** currently

**Implications for AI extraction:**
1. The extraction route will NOT persist images to `/uploads`
2. Images will be processed in-memory only
3. EXIF stripping will be added as part of Step 3
4. No privacy concerns from persistent storage

## Next Steps

Proceed to **Step 1** — Fixed data + contract:
1. Create `outfitPalette.json` (versioned, CIELAB-friendly)
2. Create `outfitKeywords.json` (fixed vocabulary per slot)
3. Define TypeScript types for `ExtractedOutfit`
4. Implement strict validator
5. Implement color utils (hex ↔ CIELAB, deltaE, snap-to-palette)
6. Write Node tests for determinism and validation

---

**Report date:** Saturday, October 31, 2026  
**Phase:** Phase 4 (AI/ML Layer) integrating with Phase 2 (CostumeViewer)
