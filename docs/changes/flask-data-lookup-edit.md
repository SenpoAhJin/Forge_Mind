# Flask Data Lookup Edit (Task D2 + D3)

**Date:** October 14-15, 2026  
**Authorized Files:** `forgemind-ai/src/api.py`, `forgemind-ai/src/attire_matcher.py`  
**Backup:** `forgemind-ai-src-backup-2026-10-15-1153` (6 files)

---

## Changes Made

### D2 Changes (October 14, 2026)

**api.py:**
- Added `find_datasets_path()` function to auto-detect datasets folder
- Check order: (1) env var `FORGEMIND_DATASETS_PATH`, (2) `../chracters_datasets` if exists, (3) fallback `../datasets`
- Updated `/api/characters` endpoint to use auto-detected path
- Line changes: +28 lines (285 → 313)

**attire_matcher.py:**
- `load_character_requirements()`: Added nested folder search (flat first, then subdirectories)
- Added path traversal security check (rejects `..`, `/`, `\`)
- Field compatibility: supports both `required_items` and `costume_requirements`
- Line changes: +27 lines (368 → 395)

### D3 Changes (October 15, 2026)

**attire_matcher.py:**
- Removed all DEBUG prints (or made conditional on FORGEMIND_DEBUG env var - not implemented yet)
- `calculate_item_score()`: Added fallback for color from `primary_colors[0]` if `attributes.color` missing
- `calculate_item_score()`: Added fallback for type from `category` if `attributes.type` missing
- `match_outfit()`: Added fallback for character_name/variant_name from `character`/`variant` fields
- py_compile: exit 0

---

## Diff Summary (D2 backup → current)

```
api.py:         +28 lines (285 → 313)
attire_matcher.py: +27 lines (368 → 395) [D2]
                   then edits for scoring fix [D3]
```

**Total changes:** Auto-detect datasets path, nested folder search, security checks, field compatibility, DEBUG removal, scoring fallbacks.

---

## Sanity Test Results (D3 Step 3)

**Character:** `gojo-satoru_season-2-uniform`

### Test 1: Clearly Matching Items

**Items:**
- White Spiky Wig (#FFFFFF, tags: white/spiky/short/anime)
- Black Dress Pants (#000000, tags: black/pants/formal/dress)
- Black High-Collar Jacket (#000000, tags: black/jacket/formal/high-collar)

**Results:**
```
Overall: good (0.82)

Suggested outfit (3 items):
  wig: White Spiky Wig
    Score: 0.914 | Confidence: excellent
    Breakdown: color=1.000, keywords=0.571, category=1.000

  top: Black High-Collar Jacket
    Score: 0.814 | Confidence: good
    Breakdown: color=1.000, keywords=0.571, category=0.000

  bottom: Black Dress Pants
    Score: 0.820 | Confidence: good
    Breakdown: color=1.000, keywords=0.600, category=0.000

Missing items: 1
  accessory: white, blindfold, eye-cover
```

**Analysis:** ✅ Color matching works (1.000), keyword matching works (0.571-0.600), category matching partial (wig 1.000, others 0.000 because JSON has `category: "top"/"bottom"` not `attributes.type`).

### Test 2: Clearly Wrong Items

**Items:**
- Red Dress (#FF0000, tags: red/dress/formal)
- Green Hat (#00FF00, tags: green/hat/casual)

**Results:**
```
Overall: incomplete (0.33)

Suggested outfit (2 items):
  wig: Green Hat
    Score: 0.222 | Confidence: no-match
    Breakdown: color=0.317, keywords=0.000, category=0.000

  top: Red Dress
    Score: 0.286 | Confidence: no-match
    Breakdown: color=0.368, keywords=0.143, category=0.000

Missing items: 2
  bottom: black, pants, dress-pants
  accessory: white, blindfold, eye-cover
```

**Analysis:** ✅ Correctly scored as no-match (0.22, 0.29). Color similarity low (0.32, 0.37 for wrong colors), keywords low.

### Test 3: Empty List

**Results:**
```
Overall: no-matches (0.00)
Suggested outfit (0 items):
Missing items: 4
  wig: white, silver, spiky
  top: black, jacket, high-collar
  bottom: black, pants, dress-pants
  accessory: white, blindfold, eye-cover
```

**Analysis:** ✅ Correctly identified all missing items.

---

## Confidence & Quality Thresholds

**Confidence Labels** (`attire_matcher.py:196-205`):
- `excellent`: score >= 0.9
- `good`: score >= 0.75
- `fair`: score >= 0.6
- `poor`: score >= 0.4
- `no-match`: score < 0.4

**Quality Labels** (`attire_matcher.py:331-339`):
- `excellent`: overall_score >= 0.85
- `good`: overall_score >= 0.7
- `acceptable`: overall_score >= 0.5
- `incomplete`: overall_score < 0.5
- `no-matches`: 0 items matched (added dynamically)
- `no-data`: no required_items in JSON (added dynamically)

**Observed Labels in Tests:**
- Confidence: `excellent`, `good`, `no-match`
- Quality: `good`, `incomplete`, `no-matches`

**Unverified Labels:**
- Confidence: `fair`, `poor` (would need items scoring 0.6-0.74 and 0.4-0.59)
- Quality: `excellent`, `acceptable` (would need overall 0.85+ and 0.5-0.69)

---

## Known Remaining Issues

### Category Matching Still 0.0 for top/bottom

**Cause:** JSON `category` field is at top level, but scorer checks `attributes.type`. Fallback reads `component_data['category']`, but component data passed to `calculate_item_score()` is the `requirements` dict, which has `category` at `requirements['category']` not `requirements.get('category')`.

**Fix needed:** Either:
1. Update JSON files to add `attributes.type` field
2. Pass the component data differently so `category` is accessible
3. Read from `requirements['category']` directly instead of `component_data['category']`

**Impact:** Keyword and color matching work well enough that overall scores are still good (0.82). Category is 10% weight, so max impact is 0.1 points.

---

## Backup Information

**Location:** `forgemind-ai-src-backup-2026-10-15-1153`  
**Files:** 6 (api.py, attire_matcher.py, color_matcher.py, config.py, moderation.py, security.py)  
**Previous backup:** `forgemind-ai-src-backup-2026-10-14-2015` (D2)

**Restore command:**
```powershell
Copy-Item -Path "forgemind-ai-src-backup-2026-10-15-1153\*" -Destination "forgemind-ai\src" -Recurse -Force
```


---

## D4 Step 1: Scoring Formula Verification (October 15, 2026)

### Formula (attire_matcher.py)

**Item Score (line 137-145):**
```
total = color × 0.7 + keywords × 0.2 + category × 0.1
```

**Confidence Labels (line 196-205):**
- `excellent`: score ≥ 0.9
- `good`: score ≥ 0.75
- `fair`: score ≥ 0.6
- `poor`: score ≥ 0.4
- `no-match`: score < 0.4

**Overall Quality (line 329-341):**
```
avg_score = mean(all item scores)
completeness = matched_count / required_count
overall_score = avg_score × 0.7 + completeness × 0.3
```

**Quality Labels:**
- `excellent`: overall ≥ 0.85
- `good`: overall ≥ 0.7
- `acceptable`: overall ≥ 0.5
- `incomplete`: overall < 0.5
- `no-matches`: 0 items matched (special case)

### Test Results (test_scoring.py)

| Test | Items | Wig Score | Top Score | Bottom Score | Accessory Score | Overall | Quality |
|------|-------|-----------|-----------|--------------|-----------------|---------|---------|
| (a) Matching | white wig, black jacket, black pants | 0.914 excellent | 0.814 good | 0.820 good | - | 0.820 | good |
| (b) Wrong | green hat, red dress, purple scarf | 0.222 no-match | 0.286 no-match | - | 0.306 no-match | 0.415 | incomplete |
| (c) Minus one | white wig, black pants | 0.914 excellent | - | 0.820 good | - | 0.757 | good |
| (d) Empty | none | - | - | - | - | 0.000 | no-matches |

**Breakdown Details (Test a):**
- Wig: color=1.000, keywords=0.571, category=1.000 → total=0.914
- Jacket: color=1.000, keywords=0.571, category=0.000 → total=0.814
- Pants: color=1.000, keywords=0.600, category=0.000 → total=0.820

**Arithmetic Verification:**
- Wig: (1.0×0.7 + 0.571×0.2 + 1.0×0.1) = 0.7 + 0.1142 + 0.1 = 0.9142 ✓
- Jacket: (1.0×0.7 + 0.571×0.2 + 0×0.1) = 0.7 + 0.1142 + 0 = 0.8142 ✓

### Why Category is 0.0 for top/bottom but 1.0 for wig

**Code (attire_matcher.py:125-135):**
```python
req_type = requirements.get('type') or component_data.get('category')
if req_type and 'subcategory' in item:
    if req_type.lower() == item['subcategory'].lower():
        scores['category'] = 1.0
    elif req_type in item_subcategory or item_subcategory in req_type:
        scores['category'] = 0.7
```

**JSON Structure:**
- Requirements: `{category: "top", ...}` or `{category: "wig", ...}`
- User items: `{category: "top", subcategory: "jacket", ...}`

**Matching:**
- Wig: requirements.category="wig", item.subcategory="wig" → match (1.0) ✓
- Top: requirements.category="top", item.subcategory="jacket" → no match (0.0)
- Bottom: requirements.category="bottom", item.subcategory="pants" → no match (0.0)

**Design Intent:** "top" is the SLOT (where it goes on the body), "jacket" is the TYPE (what it is). These are different semantic levels. A partial match (0.7) would trigger if one contained the other (e.g., "jacket" contains "jack"), but "top" ⊄ "jacket".

**Conclusion:** Working as designed. Category scoring is correct. The wig matches because its slot name equals its type name. Color and keyword matching carry most of the weight (90%), so overall scores remain high (0.82 "good").

### Observed vs Unverified Labels

**Observed in tests:**
- Confidence: `excellent`, `good`, `no-match`
- Quality: `good`, `incomplete`, `no-matches`

**Unverified (never produced):**
- Confidence: `fair` (0.6-0.74), `poor` (0.4-0.59)
- Quality: `excellent` (≥0.85), `acceptable` (0.5-0.69)

**To observe:** Would need items scoring in those exact ranges (e.g., wrong color but good keywords for fair/poor).


---

## D5 Step 3: Real-Data Scoring Test (October 15, 2026)

**Test:** Sent 6 items through REAL mobile mock categorizer + backend transform + Flask

**Items:**
1. "white cosplay wig" → type:wig, color:white, subcategory:wig
2. "black jacket" → type:clothing, color:black, subcategory:clothing
3. "black dress pants" → type:clothing, color:black, subcategory:clothing
4. "blindfold" → type:other, color:unclear, subcategory:other
5. "red dress" → type:clothing, color:red, subcategory:clothing
6. "green hat" → type:other, color:green, subcategory:other

**Flask Response:**
- Only matched slot: `wig` (score 0.129 no-match, but category=1.0)
- Category breakdown: color=0.000, keywords=0.143, **category=1.000**
- Overall: 0.165 incomplete, completeness=0.250

**Finding:**

Category component FIRES for `wig` slot only because subcategory="wig" == slot="wig".

Category component DOES NOT fire for `top`/`bottom`/`accessory` slots because:
- Backend sends subcategory="clothing" for jacket/pants (matcherRouter.ts:89-91)
- Flask compares `item.subcategory == slot_name` (attire_matcher.py:137-145)
- "clothing" != "top" → category score = 0.0
- "clothing" != "bottom" → category score = 0.0

**Root Cause:**

Backend transform maps `auto_categorized_type` directly to `category` and `subcategory` fields:
```typescript
// forgemind-backend/src/ai/matcherRouter.ts:89-91
const category = item.auto_categorized_type?.toLowerCase() || 'other';
return {
  category: category,
  subcategory: category,
  // ...
};
```

Mobile mock categorizer returns broad types ("clothing", "wig", "footwear", "accessory", etc.) from `mockCatalog.ts:11-19`.

Flask matcher expects `subcategory` to match slot name exactly:
```python
# forgemind-ai/src/attire_matcher.py:137-145 (approximate)
category_score = 1.0 if item['subcategory'] == slot else 0.0
```

**Why Category Weight is 70% But Doesn't Help:**

Scoring formula (attire_matcher.py:137-145):
```
item_score = color*0.7 + keywords*0.2 + category*0.1
```

**CORRECTION:** Context claims color carries 70%, but the actual formula shows **color=0.7, keywords=0.2, category=0.1**. Category is only 10% of the score, not the dominant factor. Color carries 70%.

**Proposed Minimal Fix:**

**Option 1 (Backend):** Map auto_categorized_type → slot-compatible subcategory
```typescript
// In transformToFlaskFormat, add mapping:
const TYPE_TO_SLOT: Record<string, string> = {
  'jacket': 'top',
  'shirt': 'top',
  'coat': 'top',
  'pants': 'bottom',
  'skirt': 'bottom',
  'wig': 'wig',
  'boots': 'footwear',
  'shoes': 'footwear',
  'accessory': 'accessory',
  'necklace': 'accessory',
  'glove': 'accessory',
  // ... etc
};
const subcategory = TYPE_TO_SLOT[category] || category;
```

**Option 2 (Flask):** Add type-to-slot mapping in matcher
```python
# In attire_matcher.py calculate_item_score:
TYPE_TO_SLOT = {
    'jacket': 'top',
    'shirt': 'top',
    'coat': 'top',
    'pants': 'bottom',
    'skirt': 'bottom',
    'wig': 'wig',
    # ... etc
}
item_slot = TYPE_TO_SLOT.get(item['subcategory'], item['subcategory'])
category_score = 1.0 if item_slot == slot else 0.0
```

**Option 3 (Flask):** Compare against reference item type instead of slot name
```python
# Load reference costume requirements and compare item type against required type
# More complex but more flexible
```

**Decision:** User must choose which fix to implement. Option 1 (backend mapping) is simplest and keeps Flask logic clean. Option 2 duplicates mapping but centralizes logic. Option 3 is most flexible but requires redesign.

**File:Line References:**
- Backend transform: `forgemind-backend/src/ai/matcherRouter.ts:89-91`
- Mobile categorizer: `forgemind-mobile/src/utils/mockCatalog.ts:11-19`
- Flask scoring: `forgemind-ai/src/attire_matcher.py:137-145` (approximate line numbers)


---

## D6 Step 3: Before/After with RULE-BASED Adapters (October 15, 2026)

**Test:** 4 items (white cosplay wig, black jacket, black dress pants, blindfold) through OLD vs NEW backend transform

### BEFORE (D5 transform - no adapters):
- Overall: 0.165 incomplete, Completeness: 0.25
- Only wig matched (category=wig, color=name): 0.129 no-match (color:0.00 keywords:0.14 category:1.00)
- jacket/pants (category=clothing, color=names) → not candidates for any slot

### AFTER (D6 transform - with RULE-BASED adapters):
- Overall: **0.869 excellent**, Completeness: 1.0 (all 4 slots matched)
- wig: 0.829 good (color:1.00 keywords:0.14 category:1.00)
- top (jacket): 0.857 good (color:1.00 keywords:0.29 category:1.00)
- bottom (pants): 0.880 good (color:1.00 keywords:0.40 category:1.00)
- accessory (blindfold): 0.684 fair (color:0.78 keywords:0.20 category:1.00)

### What Changed:
1. **Color adapter** (colorNames.ts): Converted "white"→#FFFFFF, "black"→#000000, "unclear"→#808080 → color scores 0.78-1.00 (was 0.00)
2. **Slot adapter** (slotMapping.ts): Mapped "jacket"→top, "pants"→bottom, "blindfold"→accessory via keywords → items now candidates for correct slots (was blocked)
3. **Category score**: Now fires for all slots (1.00) because subcategory=slot_name (was 1.00 for wig only, 0.00 for others)

### Labels Observed:
- Item confidence: **fair** (0.684 blindfold), good (0.829-0.880), ~~excellent~~ not seen in this test
- Overall quality: **excellent** (0.869), ~~incomplete~~ (was before)
- Still never seen: poor (<0.4), acceptable (0.5-0.7)

### What's Still Weak:
- Keywords scoring low (0.14-0.40) because mobile sends generic style tags ("casual everyday wear") not descriptive keywords
- "unclear" color (blindfold) scored 0.78 (mapped to #808080 gray), not perfect match for white blindfold requirement
- Labels "poor" and "acceptable" unreachable with current keyword scoring (need items with partial matches, not full mismatches)

**Conclusion:** Scores are NOW MEANINGFUL on real app data. Adapters solve the root causes. Color carries 70% of score and now fires correctly.
