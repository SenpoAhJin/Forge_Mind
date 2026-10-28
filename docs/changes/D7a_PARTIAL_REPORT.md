# D7a PARTIAL REPORT: Item Save + Photos

**Date:** October 15, 2026  
**STATUS:** NOT finished - Steps 1-2 finished, Step 3 partial, Steps 4-6 not started

---

## What Was Done

### Step 1: Find Every Cause ✅
**File:** `docs/changes/d7a-item-save-causes.md`

| File:Line | What It Assumes | Breaks When photo_urls Missing |
|-----------|-----------------|-------------------------------|
| `OwnedAttireContext.tsx:102` | Copies `input.photo_urls` directly | NO |
| `OwnedAttireContext.tsx:111` | Reads `input.photo_urls[0]` for condition history | **YES - crashes** |
| `OwnedAttireContext.tsx:137` | Reads `item.photo_urls[0]` when updating | **YES - crashes** |
| `ItemConfirmationScreen.tsx:81` | Passes `draft.photo_urls` from input | NO |
| `PhotoEntryScreen.tsx:162` | Creates `photo_urls: [photoUrl]` array | NO |
| `TextEntryScreen.tsx` | Does NOT provide photo_urls | **Caller breaks** |
| `VoiceEntryScreen.tsx` | Does NOT provide photo_urls | **Caller breaks** |

**Root Cause:** Text/voice entry don't provide `photo_urls`, so `addItem()` gets `undefined` and crashes at line 111 trying to read `[0]`.

**Commit:** Auto-committed as d7a-item-save-causes.md

---

### Step 2: Fix the Source ✅
**Files Changed:**
- `src/contexts/OwnedAttireContext.tsx` (added normalizePhotoUrls, fixed 3 places)
- `src/types/owned-attire.ts` (made photo_urls optional in NewOwnedAttireInput)

**Fix:**
1. Added `normalizePhotoUrls()` function: turns undefined → []
2. Fixed `addItem()`: normalize input.photo_urls before using
3. Fixed `updateItem()`: normalize item.photo_urls before reading [0]
4. Fixed load from AsyncStorage: normalize old items missing photo_urls
5. Made `photo_urls?: (string | null)[]` optional in NewOwnedAttireInput type

**tsc exit code:** 0

**Commit:** a641d4d "D7a Step 2: Fix photo_urls crash with normalizer (text/voice safe, old items load)"

---

### Step 3: Own-Item Photos - PARTIAL ⚠️
**Files Changed:**
- `src/screens/cosplayer/ItemConfirmationScreen.tsx` (added photo picker logic, UI incomplete)

**What Was Built:**
- Imported expo-image-picker and Platform
- Added `photos` state (initialized from draft.photo_urls)
- Added `pickPhoto()` function (gallery/camera with permission check)
- Added `removePhoto()` function
- Updated `handleSave()` to pass photos to addItem

**What Was NOT Built:**
- Photo section UI (gallery/camera buttons, thumbnail grid, remove buttons)
- Photo styles
- Size cap validation (700 KB limit)
- Data URI conversion for web persistence
- My Items list thumbnail display
- Item Detail photo display/swipe
- Edit mode photo add/remove

**Why Incomplete:** Context limit approaching (100k tokens used). Step 3 requires significant UI work.

**tsc exit code:** 0 (logic compiles, UI missing)

**Commit:** 7713108 "D7a Step 3 PARTIAL: Add photo picker logic (UI incomplete due to context limit)"

---

### Steps 4-6: Not Started ❌
- Step 4: Error popups (ConfirmationModal on save/delete/etc) - NOT DONE
- Step 5: Proof script (check_add_item.ts) - NOT DONE
- Step 6: CHANGELOG entry - NOT DONE

---

## Files Changed

1. `docs/changes/d7a-item-save-causes.md` (new, Step 1 findings table)
2. `src/contexts/OwnedAttireContext.tsx` (Step 2, normalizer + 3 fixes)
3. `src/types/owned-attire.ts` (Step 2, optional photo_urls)
4. `src/screens/cosplayer/ItemConfirmationScreen.tsx` (Step 3 PARTIAL, logic only)

---

## DONE BY AGENT

1. ✅ Root cause analysis (Step 1) - Documented crash at line 111, text/voice missing field
2. ✅ Normalizer fix (Step 2) - photo_urls always array, old items load without crash
3. ⚠️ Photo picker PARTIAL (Step 3) - Logic wired, UI incomplete

---

## NEEDS YOU (Human Must Do)

### HIGH PRIORITY: Finish Step 3 (Own-Item Photos)
**Reason:** Photo picker logic exists but no UI to trigger it

**What to add to ItemConfirmationScreen.tsx:**
1. Photo section UI after "Original input" section:
   - Thumbnail grid showing `photos` array
   - "Gallery" and "Camera" (native only) buttons
   - Remove button (X) on each thumbnail
   - Notice: "Photos stored locally only. Not sent to matcher."
2. Photo styles (photoSection, photoGrid, photoThumb, photoImage, photoRemove, photoActions, photoButton, photoButtonText, photoNotice)
3. Size cap: check each picked photo < 700 KB, show error modal if too large
4. Web persistence: convert blob: URI to data: URI (base64) before saving
5. My Items list: show first photo as thumbnail (fixed height cards)
6. Item Detail: show photos at top (swipeable or row, tap to enlarge)
7. Edit mode: let user add/remove photos

**Check packages:**
- expo-image-picker: ✅ installed (57.0.18)
- expo-file-system: ✅ installed (57.0.7)
- expo-image-manipulator: ❌ NOT installed (don't use)

### MEDIUM PRIORITY: Finish Step 4 (Error Popups)
**Reason:** Errors still only show in terminal, user sees nothing

**What to do:**
1. Wrap `handleSave()` in try/catch, show ConfirmationModal on failure
2. Same for edit save, delete, commit, release, photo pick failures
3. Web-only: global uncaught error handler (max 1 modal per 5sec)
4. DEV-only button on Profile screen: "Trigger test error"

### MEDIUM PRIORITY: Finish Step 5 (Proof Script)
**Reason:** No automated check that normalizer works

**What to do:**
1. Create `scripts/check_add_item.ts`
2. Import REAL normalizer/addItem (no copied logic)
3. Check 5 cases: text input (no photo_urls), photo input (1 and 3 photos), old item loads, failure surfaced, photo over cap rejected
4. Print PASS/FAIL, exit non-zero on any FAIL
5. Run it: `npx tsx scripts/check_add_item.ts`

### LOW PRIORITY: Finish Step 6 (CHANGELOG)
**Reason:** Changes not documented

**What to do:**
1. Add dated entry to CHANGELOG.md
2. Include: cause (text/voice crash), normalizer fix, photo picker partial, what NOT tested

---

## GAPS: 4

1. Finish Step 3 UI (photo section, thumbnails, size cap, persistence, list/detail display)
2. Finish Step 4 (error modals on all owned-item actions)
3. Finish Step 5 (proof script check_add_item.ts)
4. Finish Step 6 (CHANGELOG entry)
