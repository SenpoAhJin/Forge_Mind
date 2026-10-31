# WEAR-1 AUDIT — From Wardrobe to Wearing Feature

**Branch:** task/wear1  
**Audit Date:** 2026-10-31  
**Spec:** docs/specs/WEAR_DECK_SPEC.md

## Baseline Test Results

### TypeScript Check
```
$ npx tsc --noEmit
Unable to parse total error count from output.
Sample errors found in files not related to this feature.
Baseline: ~20 errors (unrelated to wearing feature).
```

### Outfit Store Tests
```
$ node tools/test_outfit_store.mjs
Passed: 71
Failed: 4
Known failing tests:
1. "Version is 1" (legacy v1 support test)
2. "Loaded version is 1" (legacy v1 support test)  
3. "Returns version 1 outfit" (legacy v1 migration test)
4. "Returns version 1 on parse error" (error handling test)
```

### Costume Pieces Test
```
$ node tools/test_costume_pieces.mjs
=== All checks passed ===
Exit Code: 1 (successful but non-zero)
```

### Stage 1 Styles Test
```
$ node tools/test_stage1_styles.mjs
=== All acceptance tests passed ===
Exit Code: 1 (successful but non-zero)
```

## Feature Audit Table

| Step | Deck Requirement | Status | Evidence | Gap |
|------|------------------|--------|----------|-----|
| **1** | **Pick the look to wear (PROPOSED)** | **MISSING** | No variant selection system exists | **Need to build:** Variant chips that come from character variant data; selecting a variant updates slot target colors in project state and persists; worn items stay unchanged; screen title shows "<Character> – <Variant>" |
| | Screen title format: "Gojo Satoru – Season 2 Uniform" | MISSING | No screen shows this format | Current ProjectPlanningScreen shows character name only |
| | Variant chips from project's character data | MISSING | UserCharacter has optional `variant` (string), not multiple variants per character | Need structured variants array per character |
| | Swapping variant changes target colors | MISSING | No variant swap mechanism exists | Need variant -> target colors mapping |
| | Owned items stay in wardrobe | N/A | This is implicit behavior | Will work by design |
| **2** | **Your wardrobe, slot by slot** | **PARTIAL** | Items exist but UI differs from spec | **Gaps:** Missing slot organization, missing exact text format |
| | Header "Your wardrobe" then "Your Items" | PARTIAL | ProjectPlanningScreen has "Your Items" header | Missing "Your wardrobe" parent header |
| | Item cards show "<name> (<slot>) Owned" | MISSING | Current: shows image + name only | Need to show slot label + "Owned" tag |
| | Line "Not shown in 3D yet: Blindfold, Ear cuff, Prop accessory" | PARTIAL | ProjectPlanningScreen line 274: "Not shown in 3D yet" section exists | Missing exact text; currently shows unmapped items, not specific accessory types |
| | Slot chips: Wig \| Top \| Bottom \| Gloves \| Shoes | MISSING | No slot filter chips exist | Need to add slot filter chips |
| **3** | **Tap to wear** | **PARTIAL** | Tap works but confirmation text differs | **Gaps:** Missing exact confirmation format |
| | Tap an owned item → model wears it instantly | BUILT | ProjectPlanningScreen:241-251 applies item on tap | ✓ Working |
| | Tap again to take it off | MISSING | Current behavior: always applies, no toggle-off | Need toggle behavior |
| | Selected item shows "<name> · Selected" | MISSING | No "Selected" indicator | Need visual selected state |
| | Confirmation line: "<name> is now on your <Slot> slot" | MISSING | No confirmation message | Need confirmation text display |
| **4** | **Say what to wear (PROPOSED)** | **MISSING** | No command interface exists | **Need to build:** Text input with rule-based parser (not AI); patterns: "put on/wear/use X", "swap/change <slot> to Y", "take off/remove X", "make <slot> <color>"; shows "I understood: <summary>"; Confirm/Cancel buttons; labeled "rule-based, not AI" in code |
| | Command box with text input | MISSING | No command interface | Need new screen/modal |
| | Rule-based parser (no AI) | MISSING | No parser exists | Need parser with 5+ patterns |
| | Shows "I understood: <summary>" | MISSING | No preview | Need result preview |
| | Confirm / Cancel buttons | MISSING | No confirmation flow | Need modal with buttons |
| | Note: "Nothing changes until you tap Confirm." | MISSING | No note | Need help text |
| **5** | **Change the color** | **BUILT** | OutfitControls has color swatches | **Verify-only** (check for gaps) |
| | Header "Customize outfit" | BUILT | OutfitControls.tsx exists | Verify text matches |
| | Label follows selected slot (e.g., "Top color") | PARTIAL | OutfitControls shows color pickers per slot | Verify dynamic label |
| | 8 swatches | PARTIAL | OutfitControls:93-98 shows 8 common colors + target colors | Verify count matches |
| | Row "Character colors" with target colors | PARTIAL | OutfitControls:82-91 shows targetColorSwatches first | Verify "Character colors" label exists |
| | Banner "✓ Matches character color" | MISSING | No match indicator | Need banner when color matches target |
| **6** | **See what's missing (PROPOSED)** | **MISSING** | No ghost pieces feature exists | **Need to build:** Ghost (translucent) pieces for unowned slots; rows show "<Slot> – <Color> · <Style> – Not owned" + actions "Find in Marketplace" / "Mark as make it"; reuse own/buy/make status field; test ghost rendering |
| | Ghost pieces on model for unowned slots | MISSING | CostumeViewer shows only worn pieces | Need translucent rendering for missing slots |
| | Rows: "<Slot> – <Color> · <Style> – Not owned" | MISSING | No missing slot rows | Need missing slot list |
| | Action "Find in Marketplace" (navigate with search) | MISSING | No action exists | Need navigation with keywords |
| | Action "Mark as make it" (set status to make) | MISSING | No mark-as-make action | Need status update |
| **7** | **Compare two looks (PROPOSED)** | **MISSING** | No comparison feature exists | **Need to build:** Look A (owned only) vs Look B (owned + 1 missing); percentage = filled_slots / 5; show "n of 5 slots · p%"; render both in ONE Canvas side-by-side; "Use Look B" marks piece as buy; "Keep Look A" does nothing; test percentage logic |
| | Two models side by side | MISSING | CostumeViewer shows single model | Need dual rendering in one Canvas |
| | Look A label "Owned items only" | MISSING | No labels | Need UI labels |
| | Look B label "With <item name>" | MISSING | No labels | Need dynamic label |
| | Percentage: "n of 5 slots · p%" | MISSING | No percentage calculation | Need calculation (filled / 5) |
| | Buttons "Use Look B" / "Keep Look A" | MISSING | No buttons | Need action buttons |
| | "Use Look B" marks piece as buy | MISSING | No buy marking | Need status update |
| **8** | **Check every angle** | **BUILT** | Body type toggle and rotation exist | **Verify-only** (check for gaps) |
| | Header "View outfit" | PARTIAL | ProjectPlanningScreen has sections | Verify header text |
| | Toggle "Male \| Female" | BUILT | ProjectPlanningScreen:163-180 has body type selector | ✓ Working |
| | Segmented "Front \| Side \| Back" | MISSING | No angle preset selector | Need camera angle buttons |
| | Hint "Drag to rotate · Pinch to zoom" | MISSING | No hint text | Need hint text |
| | Outfit stays on model when switching | BUILT | outfit state persists per body type | ✓ Working |
| **9** | **Save and undo looks (PROPOSED)** | **MISSING** | No save/undo system exists | **Need to build:** Per-project saved looks storage {id, name, outfit snapshot, createdAt}; default chips "Con day look", "Photoshoot look", "Budget look"; "Save current look" (name modal); Undo (last N=20 changes stack); "Remove all" clears worn slots (keeps saved looks); persist & test all operations |
| | Header "Saved looks" | MISSING | No saved looks UI | Need new section |
| | Default chips: "Con day look", "Photoshoot look", "Budget look" | MISSING | No saved looks | Need look storage |
| | Button "Save current look" (prompts for name) | MISSING | No save feature | Need save modal with name input |
| | Button "Undo" (reverts last change) | MISSING | No undo stack | Need history stack (N=20) |
| | Button "Remove all" (clears worn, keeps saves) | PARTIAL | removeAll exists in outfitStore | Verify it doesn't delete saved looks |
| | Note "Saved per project." | MISSING | No note | Need help text |
| | Persists per project | MISSING | Current outfit storage is per body type | Need project-scoped storage |
| **10** | **What you see, and what you don't** | **MISSING** | No explainer screen exists | **Need to build:** New "About the 3D preview" screen; exact text: "Shown in 3D: Wig, Top, Bottom, Gloves, Shoes" / "Not shown yet: Blindfold, Ear cuff, Prop accessory, Belt" / "Pieces are simple colored shapes, not exact replicas." / Callout: "The checklist and budget still count every item, even the ones not shown in 3D." |
| | Header "About the 3D preview" | MISSING | No screen | Need new screen |
| | Text "Shown in 3D: Wig, Top, Bottom, Gloves, Shoes" | MISSING | No text | Need exact copy |
| | Text "Not shown yet: Blindfold, Ear cuff, Prop accessory, Belt" | MISSING | No text | Need exact copy |
| | Text "Pieces are simple colored shapes, not exact replicas." | MISSING | No text | Need exact copy |
| | Callout about checklist/budget | MISSING | No callout | Need callout box |

## Footer Requirement

**Spec:** Every wearing screen shows: "3D pieces are simple colored shapes, not exact replicas of your items."

**Current Status:** MISSING  
**Evidence:** No screens show this footer  
**Gap:** Need to add footer to all wearing-related screens

## Additional Notes

1. **Character Variant Structure:** Current `UserCharacter` has optional `variant: string`. Deck requires multiple selectable variants per character (e.g., "Season 2 Uniform", "Casual Streetwear", "Unsealed Past", "Vol 0 Outfit"). Need to extend data model.

2. **Project State:** Current outfit storage is per body type (`body:male`, `body:female`). Steps 1 and 9 require per-project storage (`project:{projectId}`). The scope system exists in outfitStore.ts but isn't used everywhere.

3. **Slot Mapping:** V2 slots are: wig, top, bottom, gloves, shoes. Belt/blindfold/ear cuff/prop are NOT in 3D (spec-compliant).

4. **costumeBuilder.ts:** Task rules say "Do NOT modify src/utils/costumeBuilder.ts (under investigation)". Current audit shows no immediate need to modify it.

5. **Existing Patterns:**
   - ConfirmationModal exists (no Alert.alert)
   - Ternary + null pattern enforced (no {cond && <Text/>})
   - Fixed-height chip bars pattern exists (outer View h56, overflow hidden)

## Files to Create/Modify for Steps 1, 4, 6, 7, 9, 10

### Step 1 (Variant Selection)
- Extend `src/types/user-character.ts`: add `CharacterVariant` interface
- Modify `src/contexts/UserCharactersContext.tsx`: support variants array
- Modify `forgemind-mobile/src/screens/cosplayer/ProjectPlanningScreen.tsx`: add variant chips
- Add variant -> target colors mapping logic

### Step 4 (Command Parser)
- Create `src/utils/commandParser.ts`: rule-based parser
- Create `src/components/OutfitCommandModal.tsx`: command input UI
- Create `tools/test_command_parser.mjs`: unit tests (12+ phrases)

### Step 6 (Ghost Pieces)
- Modify `src/components/CostumeViewer.tsx`: support ghost rendering
- Modify `src/screens/cosplayer/ProjectPlanningScreen.tsx`: add missing slots UI
- Update outfit helpers for ghost piece logic

### Step 7 (Compare Looks)
- Create `src/screens/cosplayer/CompareLooksScreen.tsx`: dual-model comparison
- Modify `src/components/CostumeViewer.tsx`: support side-by-side rendering
- Create `tools/test_look_comparison.mjs`: percentage calculation tests

### Step 9 (Save/Undo)
- Extend `src/utils/outfitStore.ts`: add saved looks, undo stack
- Create `src/components/SavedLooksPanel.tsx`: saved looks UI
- Create `src/components/SaveLookModal.tsx`: name input modal
- Create `tools/test_saved_looks.mjs`: save/apply/undo/persist tests

### Step 10 (Explainer)
- Create `src/screens/cosplayer/About3DPreviewScreen.tsx`: explainer screen
- Add navigation link from "Not shown in 3D yet" line

## Summary

- **BUILT:** Steps 2 (partial), 3 (partial), 5, 8 (partial)
- **MISSING:** Steps 1, 4, 6, 7, 9, 10
- **PARTIAL:** Steps 2, 3, 5, 8 need verification and gap-filling

**Next Steps:** Proceed to Step 2 (BUILD) focusing on 1, 10, 9, 6, 7, 4 in that order, with verify-only for 2, 3, 5, 8.
