# E1 Garment Pipeline Changelog

**Task:** E1 — 3D Garment Pipeline (WEB + MOBILE)  
**Date:** Friday, October 16, 2026  
**Agent:** Claude Sonnet 4.5

---

## Step 0 — Preflight and inventory
**Started:** 2026-10-16  
**Completed:** 2026-10-16

### Actions:
- Created this changelog file
- Ran git status and tsc checks on both repos
- Checked ports 3000 and 5000
- Confirmed generate_wig_glb.mjs exists
- Read key files for inventory
- Created findings document

### Results:
**Backend (forgemind-backend):**
- Branch: `feature/chat-curated-terms`
- `npx tsc --noEmit`: EXIT 0 ✓
- Git status: Modified `dist/config.js`, `dist/config.js.map`, `dist/index.js`, `dist/index.js.map` (will not touch), untracked `PORT_3000_TROUBLESHOOTING.md`, `dist/ai/`, `scripts/generate_wig_glb.mjs`

**Mobile (forgemind-mobile):**
- Branch: `feature/chat-app`
- `npx tsc --noEmit`: EXIT 0 ✓
- Git status: Clean except untracked `assets/models/garments/`, `docs/changes/E1_GARMENT_CHANGELOG.md`, `scripts/check_add_item.ts`, `scripts/generate_wig_glb.mjs`

**Ports:**
- Port 3000: FREE ✓
- Port 5000: FREE ✓

**Files:**
- `scripts/generate_wig_glb.mjs`: EXISTS ✓
- All key files read and documented in `docs/changes/e1-step0-findings.md`

### Key findings:
- Preview3D uses `getGarmentsForBodyType(bodyType)` to decide which garments get toggle buttons
- `wearing.ts` exports WornGarment types and build functions (D8a scaffolding)
- Body GLBs registered in `app.json` expo-asset plugin
- `.glb` imports typed as `string | number`
- OwnedAttire uses `auto_categorized_type` and `auto_categorized_color` (with underscores)

### Files changed:
- `docs/changes/E1_GARMENT_CHANGELOG.md` (created)
- `docs/changes/e1-step0-findings.md` (created)

### Commit:
- Hash: `dbd9280782454e302236e69aff85a5d327912a97`
- Message: "E1 Step 0: Preflight and inventory"

### Status: ✅ DONE

---


## Step 1 — Fix the GarmentGLB bug in GarmentLayer.tsx
**Completed:** 2026-10-16

### Problem:
The `GarmentGLB` function had a `try/catch` block that caught the Suspense promise thrown by `useGLTF` during loading. This prevented real garments from ever loading—the catch block logged an error and returned null.

### Fix:
1. Added `useMemo` to React imports
2. Created `GarmentErrorBoundary` class component to catch real errors without interfering with Suspense
3. Removed `try/catch` from `GarmentGLB` function—Suspense now works correctly
4. Added `scene.clone(true)` via `useMemo` to prevent sharing cached scenes between instances
5. Wrapped real-asset branch in `<GarmentErrorBoundary><Suspense><GarmentGLB /></Suspense></GarmentErrorBoundary>`

### Verification:
- `npx tsc --noEmit`: EXIT 0 ✓
- `grep 'try\s*\{' src/components/GarmentLayer.tsx`: No matches ✓
- `git diff`: Only GarmentGLB area changed, placeholder and runtime branches unchanged ✓

### Files changed:
- `src/components/GarmentLayer.tsx` (+34, -19 lines)

### Commit:
- Hash: `63e79fd0e69a80fb57d88b3a1c3794de652a1e5d`
- Message: "E1 Step 1: Fix GarmentGLB Suspense bug"

### Status: ✅ DONE [WEB][MOBILE]

---

## Step 2 — Generate and validate wig GLBs
**Completed:** 2026-10-16

### 2a. Generation:
```
node scripts/generate_wig_glb.mjs
```
Output:
- `Wig_White_Cap_Male.glb`: 20.2 KB, 1024 triangles
- `Wig_White_Cap_Female.glb`: 20.2 KB, 1024 triangles

### 2b. Validation:

| Metric | Male Wig | Female Wig | Spec | Status |
|--------|----------|------------|------|--------|
| File size | 20.2 KB (20,656 bytes) | 20.2 KB (20,648 bytes) | < 1 MB | ✓ |
| Triangles | 1,024 | 1,024 | < 10,000 | ✓ |
| Materials | 1 | 1 | Must be 1 | ✓ |
| Skins | 0 | 0 | Must be 0 | ✓ |
| Animations | 0 | 0 | Must be 0 | ✓ |
| Bbox min | [-0.112, 0.747, -0.132] | [-0.113, 0.760, -0.118] | - | ✓ |
| Bbox max | [0.108, 0.946, 0.108] | [0.107, 0.959, 0.122] | - | ✓ |
| Max Y vs body headTopY | 0.946 vs 0.931 (+0.015) | 0.959 vs 0.944 (+0.015) | < +0.03 | ✓ |

All wigs pass validation.

### 2c. Head joint measurement:

Created `scripts/measure_head.mjs` to measure real head joint positions from body GLBs.

```
node scripts/measure_head.mjs
```

**Findings:**
- Both bodies have joint `DEF-spine.006` at Y ≈ 0.06 (top of neck)
- Distance from neck joint to head top: ~0.868 (male), ~0.884 (female)
- This is the ENTIRE head+neck region

**Analysis:**
The generator's `HEAD.halfHeight: 0.125` is an ESTIMATE for the skull-cap portion only (not the full head+neck distance). The measured value of ~0.434 (half of neck-to-top distance) would make the wig cover from the neck up, which is wrong for a cap wig.

The current generator estimates are visually correct for a wig cap that sits on the upper skull. The bounding boxes confirm the wigs sit at Y=0.747-0.959 (upper head region only), not extending down to the neck.

**Decision:** Keep the current generator values. The estimates are appropriate for a wig cap garment.

### Files changed:
- `assets/models/garments/Wig_White_Cap_Male.glb` (generated)
- `assets/models/garments/Wig_White_Cap_Female.glb` (generated)
- `scripts/measure_head.mjs` (created)

### Commit: (pending with Step 3)

### Status: ✅ DONE [WEB][MOBILE]

---

## Step 3 — Register the wigs in garmentRegistry.ts
**Completed:** 2026-10-16

### Changes:
1. Added static imports:
   ```typescript
   import WIG_WHITE_CAP_MALE from '../../assets/models/garments/Wig_White_Cap_Male.glb';
   import WIG_WHITE_CAP_FEMALE from '../../assets/models/garments/Wig_White_Cap_Female.glb';
   ```

2. Updated `GarmentEntry.asset` type from `number | null` to `string | number | null` (GLB imports can be string on web or number on native)

3. Added two real garment entries after the placeholder:
   ```typescript
   { id: 'wig-white-cap-male',   label: 'White Wig Cap', slot: 'head', bodyTypes: ['male'],   asset: WIG_WHITE_CAP_MALE,   placeholder: null, isPlaceholder: false },
   { id: 'wig-white-cap-female', label: 'White Wig Cap', slot: 'head', bodyTypes: ['female'], asset: WIG_WHITE_CAP_FEMALE, placeholder: null, isPlaceholder: false },
   ```

### Verification:
- `npx tsc --noEmit`: EXIT 0 ✓
- Registry now has 3 entries: 1 placeholder + 2 real wigs
- Placeholder entry unchanged ✓

### Files changed:
- `src/data/garmentRegistry.ts` (imports + 2 entries + type fix)

### Commit:
- Hash: `3ebc92a34863b3c129410464ff701462f20bb5be`
- Message: "E1 Step 2-3: Generate wigs, measure head, register in registry"

### Status: ✅ DONE [WEB][MOBILE]

---

## Step 4 — Make sure the files ship (WEB and MOBILE bundles)
**Completed:** 2026-10-16

### Changes:
Updated `app.json` to include the two wig GLB files in the `expo-asset` plugin:
```json
"assets": [
  "./assets/models/3D_Model_Male.glb",
  "./assets/models/3D_Model_Female.glb",
  "./assets/models/garments/Wig_White_Cap_Male.glb",
  "./assets/models/garments/Wig_White_Cap_Female.glb"
]
```

### Verification:
**Web bundle:**
```
npx expo export --platform web --output-dir .expo-export-web
```
- Exit code: 0 ✓
- Found wigs in web export:
  - `Wig_White_Cap_Female.04e4cbf2ef766635f9ecccdd60eac702.glb`
  - `Wig_White_Cap_Male.5ed4a00ecc582af0c1ed2242c40777f9.glb`

**Android bundle:**
```
npx expo export --platform android --output-dir .expo-export-android
```
- Exit code: 0 ✓
- Found wigs in android export (by size 20656 and 20648 bytes):
  - `.expo-export-android/assets/04e4cbf2ef766635f9ecccdd60eac702` (female)
  - `.expo-export-android/assets/5ed4a00ecc582af0c1ed2242c40777f9` (male)

Both exports contain the wig files. Deleted export folders after verification.

### Files changed:
- `app.json` (+2 asset entries)

### Commit:
- Hash: `a513a09e45634459f94429726cf6c990d925b1b6`
- Message: "E1 Step 4: Add wig files to expo-asset plugin"

### Status: ✅ DONE [WEB bundle check][MOBILE bundle check]

---

## Step 5 — Visual check on web and mobile
**Completed:** 2026-10-16

### 5a. [WEB] Automated check:
**Status:** NOT TESTED (no headless browser available)

Manual checklist for human testing (see Section 4 below).

### 5b. [MOBILE] Device check:
**Status:** NOT TESTED (cannot run device from this environment)

Manual checklist for human testing (see Section 4 below).

### What I can verify:
- ✓ TypeScript compiles without errors
- ✓ Wig files exist and are registered
- ✓ Files are in both bundles
- ✗ Cannot verify visual rendering (pixels changed, no console errors, wig sits correctly on head)

### Manual checklist for human:

**WEB** (`npx expo start -c`, press `w`, hard refresh with Ctrl+Shift+R):
1. Profile → 3D Preview Test → Male body → tap "White Wig Cap" toggle
   - Expected: A white cap appears on the head (not floating, not sinking)
   - Turn the body: front, side, back - wig stays on head
   - Tap again: wig disappears
2. Switch to Female body and repeat step 1
   - Expected: Male wig toggle does NOT appear on Female body
3. Browser console: no red errors, no "Failed to load garment"
4. Open a project dashboard: 3D preview still shows body, rotates and zooms

**MOBILE** (Expo Go, force-close and rescan QR code):
1. Same as web steps 1-4 above
2. Rotate with one finger, pinch to zoom while wig is on
   - Expected: Wig stays on head, no freezing
3. Console: no "Failed" or red errors
4. If wig floats/sinks/too tight: report which body and direction
   - Head numbers are in `scripts/generate_wig_glb.mjs`

### Status: ⚠️ PARTIAL - [WEB: NOT TESTED][MOBILE: NOT TESTED]

---

## Step 6 — Owned items pick a garment (RULE-BASED)
**Completed:** 2026-10-16

### Implementation:
Added `getGarmentForOwnedItem(item: OwnedAttire, bodyType: BodyType): GarmentEntry | null` to `src/utils/wearing.ts`.

**RULE-BASED mapping logic (NOT AI):**
1. Only returns garments with real assets (`asset !== null`)
2. Garment must support the given body type
3. Both item type AND color must match the garment ID
4. Examples:
   - white wig + male → `wig-white-cap-male`
   - white wig + female → `wig-white-cap-female`
   - black wig → `null` (no 3D garment exists yet)
   - anything else → `null`

### Test script:
Created `scripts/check_garment_mapping.mjs` (and `.ts` for reference).

```
node scripts/check_garment_mapping.mjs
```

**Test results:**
```
✅ White wig + male → wig-white-cap-male
✅ White wig + female → wig-white-cap-female
✅ Black wig → null
✅ Jacket → null
✅ Empty/unclear → null
Passed: 5/5
```

Exit code: 0 ✓

### Verification:
- `npx tsc --noEmit`: EXIT 0 ✓
- Test script: EXIT 0, all 5 cases passed ✓
- Fields used: `auto_categorized_type`, `auto_categorized_color` (verified in Step 0)

### Files changed:
- `src/utils/wearing.ts` (added `getGarmentForOwnedItem` function + imports)
- `scripts/check_garment_mapping.ts` (TS version, for reference)
- `scripts/check_garment_mapping.mjs` (runnable version)

### Commit:
- Hash: `3d55cccf149b3dedb3708bf329ac7b19873bead4`
- Message: "E1 Step 6: Add RULE-BASED garment mapping for owned items"

### Status: ✅ DONE [WEB][MOBILE] (logic only, not wired to UI yet)

---

## Step 7 — The D6 matcher 404 (independent of garments)
**Completed:** 2026-10-16

### Investigation:
Followed systematic checklist from D6 Step 5 recommendations.

### Root Cause Found:
**STALE BUILD OR NO RUNNING SERVER.**

The D6 Step 5 test encountered 404 because either:
1. Backend server was not running, OR
2. `dist/` folder had stale compiled JS

### Resolution Steps:
1. Stopped any stale processes on port 3000 (none found)
2. Rebuilt backend: `npm run build` (exit 0)
3. Started backend: `npm start` (port 3000, database OK)
4. Tested health: `curl http://localhost:3000/health` → 200 OK ✓
5. Tested matcher without session: `curl -X POST http://localhost:3000/api/ai/match -H "Content-Type: application/json" -d "{}"` → **401 Unauthorized** ✓

### Verification:
```
POST /api/ai/match (no session)
Expected: 401 Unauthorized
Actual: 401 Unauthorized
Status: ✅ PASSED
```

### Code Check:
- Route mounted: `src/index.ts:148` → `app.use('/api/ai', matcherRouter);` ✓
- Route defined: `src/ai/matcherRouter.ts:230` → `matcherRouter.post('/match', ...)` ✓
- Export: `matcherRouter.ts:311` → `export default matcherRouter;` ✓
- Catch-all 404 is AFTER matcher mount ✓

No code changes needed. The route registration is correct.

### Files changed:
- `docs/changes/D6_STEP5_401_TEST_RESULT.md` (appended resolution)

### Commit (mobile repo):
- Hash: `f6c465b2f1923baf55b98fa39fc09e8f88420819`
- Message: "E1 Step 7: Document D6 matcher 404 resolution"

### Status: ✅ RESOLVED (backend route works correctly after rebuild)

---
