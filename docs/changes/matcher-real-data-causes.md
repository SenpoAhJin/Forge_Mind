# Matcher Real-Data Causes (D6 Step 1)

**Date:** October 15, 2026

## Mobile Categorizer Vocabulary

**Source:** `forgemind-mobile/src/utils/mockCatalog.ts:10-33`

**Types (line 10-19):**
- wig, footwear, fabric, armor, weapon, prop, accessory, **clothing**, material, other

**Colors (line 21-30):**
- white, black, red, blue, pink, brown, green, purple, yellow, **unclear** (fallback)

**Styles (line 32-37):**
- anime-inspired costume piece
- casual everyday wear
- formal dress piece
- streetwear accessory
- handcrafted prop-like item
- replica uniform piece

## Backend Transform Output

**Source:** Backend transform (matcherRouter.ts) for 6 D5 items

```json
[
  {"id": "item-001", "name": "white cosplay wig", "category": "wig", "subcategory": "wig", "color": "white", "tags": ["casual everyday wear", "white", "cosplay", "wig"]},
  {"id": "item-002", "name": "black jacket", "category": "clothing", "subcategory": "clothing", "color": "black", "tags": ["anime-inspired costume piece", "black", "jacket"]},
  {"id": "item-003", "name": "black dress pants", "category": "clothing", "subcategory": "clothing", "color": "black", "tags": ["formal dress piece", "black", "dress", "pants"]},
  {"id": "item-004", "name": "blindfold", "category": "other", "subcategory": "other", "color": "unclear", "tags": ["casual everyday wear", "unclear", "blindfold"]},
  {"id": "item-005", "name": "red dress", "category": "clothing", "subcategory": "clothing", "color": "red", "tags": ["handcrafted prop-like item", "red", "dress"]},
  {"id": "item-006", "name": "green hat", "category": "other", "subcategory": "other", "color": "green", "tags": ["casual everyday wear", "green", "hat"]}
]
```

## Flask Data Color Format

**Source:** `forgemind-ai/chracters_datasets/cosplay_matches/gojo satoru - jujutsu kaisen/gojo-satoru_season-2-uniform.json`

**Sample (wig):** `"primary_colors": ["#ffffff", "#f0f0f0"]` (HEX format)  
**Sample (top):** `"primary_colors": ["#000000"]` (HEX format)  
**Sample (bottom):** `"primary_colors": ["#000000", "#1a1a1a"]` (HEX format)  
**Sample (accessory):** `"primary_colors": ["#ffffff", "#f5f5f5"]` (HEX format)

All Flask data files use HEX format for colors.

## Flask Slot Names

**Source:** All Flask data files in `chracters_datasets/cosplay_matches/*/*`

**Slots found across all files:**
- wig
- top
- bottom
- footwear
- accessory

## Flask Candidate Test

**Source:** `forgemind-ai/src/attire_matcher.py:169-171`

```python
# Filter items by category
category_items = [
    item for item in owned_items
    if item.get('category', '').lower() == category.lower()
]
```

**Meaning:** Item is candidate for a slot ONLY if `item['category']` equals slot name (wig, top, bottom, accessory, footwear).

**Example:**
- Slot "wig", item category "wig" → candidate ✓
- Slot "top", item category "clothing" → NOT candidate ✗
- Slot "bottom", item category "clothing" → NOT candidate ✗
- Slot "accessory", item category "other" → NOT candidate ✗

## Flask Category Score

**Source:** `forgemind-ai/src/attire_matcher.py:130-138`

```python
if req_type and 'subcategory' in item:
    req_type = req_type.lower()
    item_subcategory = item['subcategory'].lower()
    
    if req_type == item_subcategory:
        scores['category'] = 1.0
    elif req_type in item_subcategory or item_subcategory in req_type:
        scores['category'] = 0.7
```

**Meaning:** Category score compares requirement type (slot name) with item subcategory. Only fires when item passes candidate test.

## Flask Color Handling

**Source:** `forgemind-ai/src/color_matcher.py:166-206`

Function `match_color_by_name(color_name: str, item_color: str)` accepts BOTH hex and name formats:
- Line 180: If item_color starts with '#', converts to category via `get_color_category(item_color)`
- Line 182: Otherwise, uses item_color as name directly
- Line 185: Exact match returns 1.0
- Lines 189-203: Similar colors mapping (e.g., "white" matches "light-gray")

**Conclusion:** Flask CAN handle color names, BUT color scoring uses `color_similarity()` which calls `color_distance()` expecting HEX (line 64-96), so names may score lower than hex matches.

## Findings Table

| Hypothesis | Status | Evidence |
|------------|--------|----------|
| **Color names score 0.0** | **PARTIALLY CONFIRMED** | Backend sends names ("white", "black", "unclear"). Flask has `match_color_by_name` fallback (color_matcher.py:166), but primary color scoring uses hex-based `color_similarity` (color_matcher.py:102). Names may score lower than hex. Check attire_matcher.py to see which function is called. |
| **Broad types never reach slots** | **CONFIRMED** | Candidate test (attire_matcher.py:171) requires `item.category == slot_name`. Backend sends category="clothing" (mockCatalog.ts:18), but Flask slots are "top"/"bottom" (not "clothing"). Items with category "clothing" NEVER become candidates for top/bottom slots. |
| **Subcategory must match slot** | **CONFIRMED** | Category score (attire_matcher.py:134) compares `req_type` (slot name from component_data['category']) with `item['subcategory']`. Backend sends subcategory="clothing" (same as category), which != "top" or "bottom". |

## Root Causes

1. **Candidate filter blocks most items:**
   - Mobile categorizer returns broad types: "clothing", "other", "wig", "accessory" (mockCatalog.ts:10-19)
   - Flask requires `item.category == slot_name` (attire_matcher.py:171)
   - Only "wig" and "accessory" from mobile vocab match Flask slots
   - "clothing" never matches "top" or "bottom" slots → jacket/pants never reach those slots

2. **Color names vs hex:**
   - Backend sends color names: "white", "black", "unclear", "red", "green", "purple", "yellow", "pink", "brown" (mockCatalog.ts:21-30)
   - Flask data has hex: "#ffffff", "#000000", "#f0f0f0", etc.
   - `match_color_by_name` fallback exists but primary scoring may use hex-based `color_similarity`
   - Need to check attire_matcher.py to see which color function is actually called

3. **"unclear" color:**
   - Mobile sends "unclear" when no color keyword matches (mockCatalog.ts:62)
   - Flask has no mapping for "unclear" → likely scores 0.0

## Next Steps (D6 Step 2)

1. **Add color name→hex mapping** in backend for mobile categorizer's 9 colors + "unclear" fallback
2. **Add keyword-based slot mapping** in backend: jacket/shirt/coat→"top", pants/skirt→"bottom", blindfold/glove/belt/hat→"accessory", wig→"wig"
3. Both adapters are **RULE-BASED**, not AI
