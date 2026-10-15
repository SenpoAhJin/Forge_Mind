# D8a FINAL REPORT: WEARING STEP 1 - Data + Rendering

**Task:** Implement wearing system data layer and dynamic garment rendering
**Date:** Thursday, October 15, 2026
**Repo:** forgemind-mobile (branch: feature/chat-app)
**Commits:** d291eae, 987ac5b, 51b1bfd

---

## STATUS: finished

All 3 steps executed. Slot map, color map, buildWornGarments implemented. Dynamic garment rendering with placeholder shapes. Proof script 21/21 tests PASS, exit 0. tsc exit 0 after each step.

---

## STEP 1: Slot Map + Color Map (Pure Functions)

**File:** `src/utils/wearing.ts` (new, 171 lines)

### matcherSlotToGarmentSlot
Maps matcher slots to renderer slots:
- `wig` → `head`
- `top` → `torso`
- `bottom` → `legs`
- `accessory` → `prop`
- `footwear` → `prop` (spec: footwear under prop)
- Unknown → `null`

**Evidence:** src/utils/wearing.ts:18-31

### colorNameToHex
Duplicated from forgemind-backend/src/ai/colorNames.ts (D6 Step 2).
Maps 9 mobile color names + variations to hex:
- white, black, red, blue, pink, brown, green, purple, yellow
- unclear/unknown → `#808080` (neutral grey)

**Evidence:** src/utils/wearing.ts:33-78

### PlaceholderShape Types
PLACEHOLDER SHAPES (not real garments) per slot:
- `cap` (head): half-sphere sitting on head top
- `tube` (torso/legs): cylinders around body
- `block` (prop/hands): small boxes

**Evidence:** src/utils/wearing.ts:82-86

### buildWornGarments
Builds worn garments array from matcher result:
- Iterates `suggested_outfit` keys (wig/top/bottom/accessory/footwear)
- Maps matcher slot → garment slot
- Looks up owned item for color
- Generates placeholder shape per slot with body-bound positioning
- Returns only filled slots (missing slots excluded)

**Evidence:** src/utils/wearing.ts:98-156

**Commit:** d291eae "D8a Step 1: Add wearing data layer (slot map, color map, buildWornGarments)"

---

## STEP 2: Dynamic Garments in Renderer

### Extended GarmentLayer
**File:** `src/components/GarmentLayer.tsx` (modified)

**Changes:**
1. Added `runtimeGarment?: WornGarment` prop (optional, for dynamic mode)
2. Created `RuntimeGarmentPrimitive` component for worn garments
3. Updated main component to route: runtime mode → RuntimeGarmentPrimitive, registry mode → existing logic
4. Kept existing registry toggles working for Test screen

**RuntimeGarmentPrimitive positioning (from bodyBounds + GARMENT_SPEC.md):**
- **head (cap):** Y = headTop - radius * 0.3 (sits on head, not floating)
- **torso (tube):** Y = 0.35 (torso mid, Y ≈ 0.10 to 0.60)
- **legs (tube):** Y = -0.20 (mid-legs, Y ≈ -0.50 to 0.10)
- **prop (block):** X = 0.25, Y = 0 (hip position)
- **hands (block):** Y = 0.15 (wrist, not used by matcher yet)

**Evidence:** 
- Import WornGarment: src/components/GarmentLayer.tsx:5
- RuntimeGarmentPrimitive: src/components/GarmentLayer.tsx:52-93
- Main routing: src/components/GarmentLayer.tsx:142-164

### Extended Preview3D
**File:** `src/components/Preview3D.tsx` (modified)

**Changes:**
1. Added `wornGarments?: WornGarment[]` prop
2. Added `useWornMode` flag to switch between worn/registry modes
3. Worn mode: renders wornGarments array with GarmentLayer runtimeGarment prop
4. Registry mode: keeps existing toggles (unchanged)
5. Hides toggle row when wornGarments provided

**Evidence:**
- Import WornGarment: src/components/Preview3D.tsx:10
- Props interface: src/components/Preview3D.tsx:100-101
- useWornMode flag: src/components/Preview3D.tsx:122
- Worn mode rendering: src/components/Preview3D.tsx:203-211
- Registry mode rendering: src/components/Preview3D.tsx:213-221
- Toggle hide logic: src/components/Preview3D.tsx:234

### Extended bodyBounds
**File:** `src/data/bodyBounds.ts` (modified)

**Added:** `getTorsoMidY()` function returns 0.35 (torso band Y ≈ 0.10 to 0.60 from GARMENT_SPEC.md)

**Evidence:** src/data/bodyBounds.ts:51-54

**Commit:** 987ac5b "D8a Step 2: Dynamic garments (runtime descriptor, placeholder shapes, wornGarments prop)"

---

## STEP 3: Proof Script

**File:** `scripts/check_wearing.mjs` (new, 270 lines)

**Tests (all use REAL functions from src/utils/wearing.ts, no copied logic):**

### Test 1: Slot Map (5 matcher slots)
- ✓ wig → head
- ✓ top → torso
- ✓ bottom → legs
- ✓ accessory → prop
- ✓ footwear → prop

### Test 2: Unknown Slot
- ✓ unknown-slot → null

### Test 3: Color Map (9 colors + unclear)
- ✓ white → #FFFFFF
- ✓ black → #000000
- ✓ red → #FF0000
- ✓ blue → #0000FF
- ✓ pink → #FFC0CB
- ✓ brown → #8B4513
- ✓ green → #008000
- ✓ purple → #800080
- ✓ yellow → #FFFF00
- ✓ unclear → #808080

### Test 4: buildWornGarments (3 slots filled, accessory missing)
- ✓ Count: 3 garments
- ✓ head: black wig (#000000)
- ✓ torso: red clothing (#FF0000)
- ✓ legs: blue clothing (#0000FF)

### Test 5: Empty Result
- ✓ Empty result → [] (length 0)

**Summary:** 21/21 tests PASS, exit 0

**Evidence:** scripts/check_wearing.mjs:1-270

**Commit:** 51b1bfd "D8a Step 3: Add wearing proof script (21/21 tests PASS, exit 0)"

---

## check_wearing PASS/FAIL List

All 21 checks PASS:
1. ✓ wig → head
2. ✓ top → torso
3. ✓ bottom → legs
4. ✓ accessory → prop
5. ✓ footwear → prop
6. ✓ unknown-slot → null
7. ✓ white → #FFFFFF
8. ✓ black → #000000
9. ✓ red → #FF0000
10. ✓ blue → #0000FF
11. ✓ pink → #FFC0CB
12. ✓ brown → #8B4513
13. ✓ green → #008000
14. ✓ purple → #800080
15. ✓ yellow → #FFFF00
16. ✓ unclear → #808080
17. ✓ Count: 3 garments
18. ✓ head: black wig (#000000)
19. ✓ torso: red clothing (#FF0000)
20. ✓ legs: blue clothing (#0000FF)
21. ✓ Empty result → []

**Exit code: 0**

---

## NEEDS YOU

1. **Visual Testing:** Pass wornGarments prop to Preview3D with matcher result, verify placeholder shapes render on body (cap on head, tube on torso/legs, block at hip)
2. **Color Verification:** Check placeholder colors match owned_attire auto_categorized_color (black → #000000, red → #FF0000, etc.)
3. **Slot Coverage:** Verify all 5 matcher slots (wig/top/bottom/accessory/footwear) map correctly when present in suggested_outfit
4. **Missing Slots:** Confirm empty slots don't render (e.g., if matcher returns only wig+top, should see 2 garments not 5)
5. **Toggle Hide:** Verify registry toggle row hidden when wornGarments prop provided (worn mode vs test mode)
6. **Body Type:** Test both male and female bodies, verify placeholder positioning works for both (headTop differs: male 0.931, female 0.944)

---

## GAPS: 0

All 3 steps finished. No partial steps.

---

## FILES CHANGED

1. `src/utils/wearing.ts` - new (slot map, color map, buildWornGarments, placeholder shape types)
2. `src/components/GarmentLayer.tsx` - extended (runtime garment support, RuntimeGarmentPrimitive)
3. `src/components/Preview3D.tsx` - extended (wornGarments prop, worn/registry mode switch)
4. `src/data/bodyBounds.ts` - extended (getTorsoMidY function)
5. `scripts/check_wearing.mjs` - new (proof script, 21 tests)

---

## TECHNICAL NOTES

### Placeholder Shapes Are Not Real Garments
All shapes in RuntimeGarmentPrimitive are PLACEHOLDER GEOMETRY until real GLB assets exist:
- Cap (head): half-sphere using sphereGeometry with theta range 0 to π/2
- Tube (torso/legs): cylinderGeometry
- Block (prop/hands): boxGeometry

Shapes sized slightly larger than body to avoid z-fighting and ensure visibility.

### Color Duplication Is Intentional
COLOR_NAME_TO_HEX duplicated from forgemind-backend/src/ai/colorNames.ts because:
- Repos are separate (mobile doesn't import from backend)
- Mobile needs local access for rendering
- Backend version is source of truth (copied exactly)
- Comment in code documents this is intentional duplication

### Body Type Parameter Reserved
buildWornGarments accepts `bodyType` but doesn't use it yet. Reserved for future per-body-type positioning or scaling adjustments if male/female body proportions require different offsets.

### Registry Mode Still Works
GarmentLayer's existing registry entry path unchanged:
- Test screen can still toggle placeholder hat from garmentRegistry
- Worn mode (runtimeGarment prop) bypasses registry lookup
- Both modes coexist without conflicts

---

**End of D8a Final Report**
