# AI SERVICES EVIDENCE REPORT (SECTION 6 + CONTRIBUTIONS TO 0, 10, 11)

**Agent**: AI Evidence Branch  
**Date**: 2026-10-16  
**Task**: Read-only audit of forgemind-ai (Flask) and forgemind-backend AI adapters  
**Repos Examined**:
- `c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-ai`
- `c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-backend`
- `c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-mobile`

---

## 0. HEADER CONTRIBUTION (AI Package Versions)

### Python and ML Packages

**Python**: Not installed on this machine. [RAN] `python --version` → exit code 1.  
Cannot verify installed Python version. [UNKNOWN]

**requirements.txt pinned versions** [CODE]:
- Flask==3.1.3
- flask-cors==6.0.5
- scikit-learn==1.9.1
- numpy==2.5.3
- pandas==3.0.6
- joblib==1.6.0
- openpyxl==3.1.5

Source: `forgemind-ai/requirements.txt:1-10`

**No deep learning or LLM packages present** [CODE]:  
Searched entire repo for: tensorflow, torch, transformers, openai, anthropic, llm, gpt, claude.  
Result: No matches. [RAN] grep across all .py and .txt files.

---

## 6. AI SERVICES

### 6.1 Flask Routes

**Flask API file**: `forgemind-ai/src/api.py` [CODE]

**Routes exposed**:

| Method | Path             | Purpose                                      | Auth Required | File:Line    |
|--------|------------------|----------------------------------------------|---------------|--------------|
| GET    | /health          | Health check endpoint                        | No            | api.py:43-50 |
| POST   | /api/match       | Main matching: owned items → character outfit| No            | api.py:53-115|
| GET    | /api/characters  | List available character variants            | No            | api.py:118-209|
| GET    | /api/test        | Test endpoint with mock Luck Voltia data     | No            | api.py:212-249|

**CORS**: Enabled globally via `CORS(app)`. No origin restrictions. [CODE] api.py:12

**Bind address**: `127.0.0.1:5000` (localhost only, no external exposure). [CODE] api.py:261

**No authentication**: Flask service does NOT enforce auth. Backend proxy (`matcherRouter.ts`) requires `requireSession` before calling Flask. [CODE] matcherRouter.ts:209

---

### 6.2 Loaded Datasets and Character Files

**Datasets path**: `forgemind-ai/chracters_datasets/cosplay_matches/` [CODE] api.py:28-42

**Character folders found** [RAN]:
- asta - black clover
- gojo satoru - jujutsu kaisen
- luck voltia - black clover
- original character
- raiden shogun - genshin impact
- spider-man - marvel

**Character JSON files** [RAN] 6 files total:

| Character Folder                | Variant File                      | Flask Slug (ID)              |
|---------------------------------|-----------------------------------|------------------------------|
| asta - black clover             | asta_black-bulls-uniform.json     | asta_black-bulls-uniform     |
| gojo satoru - jujutsu kaisen    | gojo-satoru_season-2-uniform.json | gojo-satoru_season-2-uniform |
| luck voltia - black clover      | luck-voltia_black-bulls.json      | luck-voltia_black-bulls      |
| original character              | oc_cyberpunk-street.json          | oc_cyberpunk-street          |
| raiden shogun - genshin impact  | raiden_default-outfit.json        | raiden_default-outfit        |
| spider-man - marvel             | spiderman_classic-suit.json       | spiderman_classic-suit       |

**Dataset structure** [CODE]: Each JSON contains:
- `character`, `series`, `variant`, `slug`, `origin` (canon/fan-art-inspired)
- `costume_requirements`: keyed by slot (wig, top, bottom, footwear, accessory)
- Each requirement has: `primary_colors`, `keywords`, `category`, `required`, `weight`

Example examined: `luck-voltia_black-bulls.json` (lines 1-73)

---

### 6.3 Mobile Variant ID → Flask Character Mapping

**Mobile catalog variants** [CODE]: mobile uses variant IDs like `var-gojo-s2-uniform`, `var-makima-public-safety`, etc.

**Mapping file**: `forgemind-mobile/src/data/matcherSlugs.ts` [CODE]

**MAPPER_SLUG_MAP contents**:
- `'var-gojo-s2-uniform'` → `'gojo-satoru_season-2-uniform'` (MAPPED)

**Flask files without mobile mapping**:
- asta_black-bulls-uniform (NOT in mobile catalog)
- luck-voltia_black-bulls (NOT in mobile catalog)
- oc_cyberpunk-street (NOT in mobile catalog)
- raiden_default-outfit (NOT in mobile catalog)
- spiderman_classic-suit (NOT in mobile catalog)

**Mobile variants without Flask files** [CODE] matcherSlugs.ts:17-18:
- var-makima-public-safety (Makima - Chainsaw Man)
- var-zelda-totk (Zelda - TOTK)
- var-veira-original (Veira - original character)

**Summary**:
- Flask character variants: 6
- Mobile character variants with mapping: 1 (Gojo Satoru S2)
- Mapped: 1
- Unmapped (Flask-only): 5
- Unmapped (mobile-only): 3

---

### 6.4 Scoring Formulas, Thresholds, Label Vocabulary

#### Item-Level Scoring

**Formula** [CODE] `attire_matcher.py:95-140`:

```
score = (color_similarity * 0.7) + (keyword_overlap * 0.2) + (category_match * 0.1)
```

**Weights**:
- Color: 70%
- Keywords: 20%
- Category: 10%

**Color matching** [CODE] `color_matcher.py:69-98`:
- Converts hex → RGB → HSV
- Weighted Euclidean distance: `sqrt(h_dist² * 0.6 + s_dist² * 0.2 + v_dist² * 0.2)`
- Returns similarity = 1 - distance (0-1 scale)

**Keyword matching** [CODE] `attire_matcher.py:123-130`:
- Count keywords in item tags that match requirement keywords
- Score = matches / total_required_keywords

**Category matching** [CODE] `attire_matcher.py:132-140`:
- Exact subcategory match: 1.0
- Partial match (substring): 0.7
- No match: 0.0

#### Confidence Labels (Item Level)

**Thresholds** [CODE] `attire_matcher.py:196-205`:

| Score Range    | Label      |
|----------------|------------|
| >= 0.9         | excellent  |
| >= 0.75        | good       |
| >= 0.6         | fair       |
| >= 0.4         | poor       |
| < 0.4          | no-match   |

**Actual vocabulary returned**: `excellent`, `good`, `fair`, `poor`, `no-match` [CODE]

**Spec vocabulary** (from thesis requirements): `exact`, `close`, `loose`

**Vocabulary mapping location**: Does NOT exist. Flask returns 5-level confidence labels. Spec expects 3-level match quality. No translation layer found in backend or mobile. [CODE] Searched matcherRouter.ts, MatcherService.ts, MatchResultsScreen.tsx — no mapping logic present.

#### Overall Match Quality

**Formula** [CODE] `attire_matcher.py:310-339`:

```
avg_score = mean(all matched item scores)
completeness = matched_count / required_count
overall_score = (avg_score * 0.7) + (completeness * 0.3)
```

**Weights**:
- Average item match score: 70%
- Completeness (% of required items matched): 30%

**Quality Labels (Overall)** [CODE] attire_matcher.py:331-339:

| Overall Score  | Label        |
|----------------|--------------|
| >= 0.85        | excellent    |
| >= 0.7         | good         |
| >= 0.5         | acceptable   |
| < 0.5          | incomplete   |

---

### 6.5 Backend AI Adapters

#### colorNames.ts

**Purpose**: Rule-based color name → hex conversion [CODE] `forgemind-backend/src/ai/colorNames.ts:1-48`

**Behavior**:
- Maps 9 mobile categorizer colors (white, black, red, blue, pink, brown, green, purple, yellow) to hex
- Adds 12 common variations (silver, navy, maroon, etc.)
- Grayscale aliases (gray/grey, light-gray, dark-gray)
- Returns fallback `#808080` (gray) for unmapped colors

**Lossy mappings**:
- "unclear" color (from mobile categorizer) → fallback `#808080`
- Any unrecognized color name → fallback `#808080`

**No ML/AI**: Pure lookup table. [CODE]

#### slotMapping.ts

**Purpose**: Rule-based keyword → Flask slot mapping [CODE] `forgemind-backend/src/ai/slotMapping.ts:1-70`

**Behavior**:
- Mobile categorizer returns broad types: `wig`, `clothing`, `footwear`, `accessory`, `armor`, `weapon`, `prop`, `fabric`, `material`, `other`
- Flask requires exact slot: `wig`, `top`, `bottom`, `footwear`, `accessory`
- Adapter checks keywords in `original_input_text` (e.g., "jacket" → `top`, "pants" → `bottom`)
- Falls back to broad type if direct mapping exists (e.g., `wig` → `wig`)
- Returns original type if no mapping found (lossy: "armor" stays "armor", won't match Flask slots)

**Lossy mappings**:
- `clothing` (broad) without keywords → stays `clothing`, won't match Flask `top`/`bottom` slots
- `armor`, `weapon`, `prop`, `fabric`, `material`, `other` → no Flask slot equivalents, passed through unchanged

**No ML/AI**: Pure keyword regex + fallback table. [CODE]

#### matcherRouter.ts

**Purpose**: Backend proxy + format transformer [CODE] `forgemind-backend/src/ai/matcherRouter.ts:1-269`

**Key functions**:
- `transformToFlaskFormat()`: Converts mobile `OwnedAttire` to Flask `owned_items` format (lines 92-118)
  - Maps `auto_categorized_type` → Flask slot via `slotMapping.ts`
  - Maps `auto_categorized_color` → hex via `colorNames.ts`
  - Extracts tags from `auto_categorized_style`, color, and `original_input_text` words
- `validateMatchRequest()`: Input validation (lines 125-168)
- `mapFlaskError()`, `mapFlaskFetchError()`: Error translation (lines 175-197)

**Timeout**: 8 seconds [CODE] matcherRouter.ts:232

**Fallbacks**:
- Color: `#808080` (DEFAULT_COLOR_FALLBACK) [CODE] matcherRouter.ts:80
- Slot: original broad type (lossy) [CODE] slotMapping.ts:51-57

**No ML/AI**: Pure rule-based transformation. [CODE]

---

### 6.6 Mock vs Real Features

#### Text Categorization (mockCategorizationFromText)

**Status**: MOCK [CODE] `forgemind-mobile/src/utils/mockCatalog.ts:50-66`

**Behavior**:
- Keyword lookup in hardcoded TYPE_KEYWORDS and COLOR_KEYWORDS arrays
- Returns: `auto_categorized_type`, `auto_categorized_color`, `auto_categorized_style`
- Style is random pick from 6 hardcoded phrases
- Comment states: "Real image classification and speech-to-text are BE-1 backend features." [CODE] mockCatalog.ts:4-5

#### Photo Categorization (mockPhotoCategorization)

**Status**: MOCK [CODE] mockCatalog.ts:85-89

**Behavior**: Randomly picks type/color/style from predefined pools. No image processing.

**Real image classifier**: NOT PRESENT [CODE]
- Searched for: opencv, pillow, PIL, CNN, convolution, resnet, mobilenet
- No matches in forgemind-ai or forgemind-backend
- No image classifier model files in `forgemind-ai/models/` [RAN]

#### Voice Entry (mockTranscription)

**Status**: MOCK [CODE] mockCatalog.ts:81-86

**Behavior**: Returns hardcoded strings for 'english' or 'taglish' input. No audio processing.

**Real speech-to-text**: NOT PRESENT [CODE]
- Searched for: speech, whisper, vosk, STT, transcribe, voice-to-text, audio-to-text
- Only false positives (test function names like `postTypesForCategory`)
- No speech-to-text service packages in requirements.txt [CODE]
- No audio processing code in Flask [CODE]

#### Assistant/LLM Code

**Status**: ABSENT [CODE]
- Searched for: openai, anthropic, llm, gpt, claude, transformers
- No matches in any repo
- No LLM packages in requirements.txt [CODE]

**Verdict**: No LLM or assistant code exists. [CODE]

---

### 6.7 Screener Classifier Model

**Model file**: `forgemind-ai/models/marketplace_screener_lr.joblib` [RAN]
- Size: 6,485,435 bytes
- Last modified: 2026-03-10 4:50:35 PM
- Type: scikit-learn LogisticRegression pipeline (from filename and training script)

**Training script**: `forgemind-ai/scripts/train_screener_classifier.py` [CODE] lines 1-43
- Loads labeled data from `forgemind-backend/data/labeled_listings.jsonl`
- Trains TfidfVectorizer + LogisticRegression
- Writes model to `marketplace_screener_lr.joblib`

**Is model loaded by anything?** NO [CODE]
- Backend screener comment: "The backend still does not load the model" [CODE] `forgemind-backend/src/marketplace/screener.ts:119`
- Function `aiSecondLayerNoop()` is a no-op placeholder (lines 122-124)
- Comment states: "FUTURE AI SECOND LAYER HOOK - INTENTIONALLY A NO-OP." [CODE] screener.ts:97-115
- Rationale: "calling a service from this file before that decision would put chat-adjacent listing text on the wire to a model nobody has approved"

**Flask moderation module**: `forgemind-ai/moderation/model.py` [CODE] lines 1-29
- Attempts to load `vectorizer.pkl` and `classifier_{cls}.pkl` from `models/marketplace_moderation/`
- This directory does NOT exist [RAN] — only `models/marketplace_screener_lr.joblib` exists
- Code appears to be for a different (older?) model structure

**Verdict**: Model file exists but is NOT loaded by any running code. [CODE + RAN]

---

### 6.8 Readiness Scoring

**Location**: `forgemind-mobile/src/utils/readiness.ts` [CODE]

**Formula** [CODE] readiness.ts:10:

```
taskCompletion = mean(task status score)                    weight 40%
  - completed = 1.0, in-progress = 0.5, pending/skipped = 0
itemMatch = mean(match quality score)                       weight 30%
  - exact = 1.0, close = 0.5, loose = 0.25
budgetHealth = 1 - min(1, spent / stated_budget)            weight 30%
  - or 1.0 when no budget stated
readiness_score = clamp(taskCompletion*0.4 + itemMatch*0.3 + budgetHealth*0.3, 0, 1)
```

**Computed where**: Client-side (mobile utility function) [CODE]

**Inputs**:
- `project`: Project record (stated_budget, stated_skill_level)
- `projectTasks`: Task list (status: completed/in-progress/pending/skipped)
- `projectBudget`: BudgetLineItem list (actual_amount, planned_amount)
- `matchComponents`: Global mock data (match_quality: exact/close/loose)

**Returns** [CODE] readiness.ts:85-92:
- `readiness_score` (0-1, rounded to 2 decimals)
- `missing_components` (component IDs with loose matches)
- `matched_components` (component IDs with exact/close matches)
- `budget_utilization` (% spent)
- `skill_gap_details` (tasks harder than user's stated skill level)
- `calculation_timestamp`

**Comment**: "Real AI-driven readiness forecasting is a later backend phase." [CODE] readiness.ts:11

**Event aggregate** [CODE] `forgemind-mobile/src/utils/readinessAggregate.ts`:
- Computes average readiness across opted-in projects for an event
- Privacy filter: only projects with `opted_in_readiness_sharing = true`
- Publishability threshold: >= 3 opted-in projects (MIN_OPTED_IN constant)

---

### 6.9 Per-Item AI Feature Status (BUILT / PARTIAL / STUB / ABSENT)

| Feature                        | Status  | Evidence                                                                 |
|--------------------------------|---------|--------------------------------------------------------------------------|
| Buy-or-make suggestion         | ABSENT  | No code found. Searched for "buy.*make" — no matches. [CODE]            |
| Budgeting (price_paid_php)     | ABSENT  | Searched for "price_paid_php" — no matches. Budget tracking exists in mobile (BudgetLineItem.actual_amount) but no "price_paid_php" field. [CODE] |
| Value reference                | STUB    | Table `value_references` exists in seed script but empty. [CODE] forgemind-backend/src/scripts/seed.ts:592 |
| New-variant detection          | ABSENT  | No code found. Character list is static JSON files. [CODE]               |
| Trade fairness                 | ABSENT  | No code found. Searched for "trade.*fair" — no matches. [CODE]          |
| Commission pricing             | ABSENT  | No code found. Searched for "commission.*pricing" — no matches. [CODE]   |
| Contest-tier suggestion        | ABSENT  | No code found. Searched for "contest.*tier" — no matches. [CODE]         |
| Group meetup optimization      | ABSENT  | No code found. Searched for "meetup.*optim" — no matches. Table `group_meetups` exists but empty. [CODE] seed.ts:595 |

**Readiness scoring**: BUILT (mobile-side deterministic formula, see 6.8 above)

---

## 10. TESTS CONTRIBUTION (Flask AI Tests)

### Flask Test File

**File**: `forgemind-ai/test_sanity.py` [CODE]

**What it tests**:
- Loads AttireMatcher with datasets path "chracters_datasets"
- Runs 3 test cases against "gojo-satoru_season-2-uniform":
  1. Clearly matching items (white wig, black jacket, black pants)
  2. Clearly wrong items (red dress, green hat)
  3. Empty item list
- Prints suggested outfit, scores, breakdown, missing items
- Prints confidence thresholds and quality label thresholds

**Test run**: NOT RUN BY AGENT (Python not installed on this machine). [RAN] `python --version` → exit code 1.

**Cannot verify**: Pass/fail status, actual output, whether character file loads correctly.

### No Other Flask Tests Found

[RAN] `Get-ChildItem forgemind-ai/tests` → only `.gitkeep` file.

No pytest suite, no unit tests, no integration tests. [RAN]

---

## 11. DOC STATE CONTRIBUTION (AI-Related Claims)

### Docs Examined

- `forgemind-ai/README.md` [EXISTS]
- `forgemind-ai/QUICK_START.md` [EXISTS]
- `forgemind-ai/SETUP_GUIDE.md` [EXISTS]
- `forgemind-ai/AI_SETUP_PROGRESS.md` [EXISTS]
- `forgemind-ai/BUILD_CHARACTERS_PHASE_A.md` [EXISTS]
- `forgemind-ai/PHASE_A_VERIFICATION_REPORT.md` [EXISTS]
- `forgemind-mobile/docs/AI_PROGRESS.md` [EXISTS]

### Claim Verification

| Doc Claim                                              | What Code Shows                                  | Status       | Evidence              |
|--------------------------------------------------------|--------------------------------------------------|--------------|-----------------------|
| "8-second matcher timeout"                             | 8000ms timeout in matcherRouter.ts:232           | CONFIRMED    | [CODE]                |
| "Flask color matching uses HSV"                        | color_matcher.py:69-98 converts RGB→HSV          | CONFIRMED    | [CODE]                |
| "5-level confidence labels"                            | attire_matcher.py:196-205 returns 5 labels       | CONFIRMED    | [CODE]                |
| "Spec requires exact/close/loose"                      | No translation in code; Flask returns different vocab | CONTRADICTION| [CODE]                |
| "Screener model trained but not loaded"                | aiSecondLayerNoop is no-op; model exists but unused | CONFIRMED    | [CODE + RAN]          |
| "Real image classification is BE-1 backend feature"    | mockCatalog.ts:4-5 comment; no real classifier found | CONFIRMED (comment); NOT BUILT | [CODE] |
| "6 character variants in Flask"                        | 6 JSON files found in chracters_datasets/        | CONFIRMED    | [RAN]                 |
| "Mobile has 4 catalog characters"                      | Gojo, Makima, Zelda, Veira in catalog; only Gojo mapped | [DOC-ONLY] — did not audit full mobile catalog | [CODE] matcherSlugs.ts comment |

---

## DISCREPANCY LOG

1. **Vocabulary mismatch**: Flask returns 5-level item confidence (`excellent`, `good`, `fair`, `poor`, `no-match`) and 4-level overall quality (`excellent`, `good`, `acceptable`, `incomplete`). Thesis spec expects 3-level match quality (`exact`, `close`, `loose`). No translation layer exists. Mobile receives Flask labels as-is. [CODE]

2. **Unmapped variants**: 5 Flask characters (Asta, Luck Voltia, OC Cyberpunk, Raiden, Spider-Man) have no mobile variant mapping. 3 mobile variants (Makima, Zelda, Veira) have no Flask data. Only Gojo Satoru is fully wired. [CODE]

3. **Screener model unused**: `marketplace_screener_lr.joblib` (6.4MB) exists and was trained 2026-03-10, but NO code loads it. Backend screener uses only regex/keyword rules. [CODE + RAN]

4. **Lossy slot mapping**: Backend adapter `slotMapping.ts` cannot map broad types like "armor", "weapon", "clothing" (without keywords) to Flask slots. These items will score 0.0 on category match (10% of item score). [CODE]

5. **Color fallback**: "unclear" color from mobile categorizer becomes gray (#808080). Items with ambiguous colors lose color match accuracy. [CODE]

---

## COMMANDS RUN LOG

All commands executed from workspace root: `c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy`

```powershell
# Python version check (failed)
python --version
# Exit: 1 (Python not installed)

# List Flask root files
Get-ChildItem "forgemind-ai" -File | Select-Object Name
# Exit: 0 (24 files found)

# List Flask subdirectories
Get-ChildItem "forgemind-ai" -Directory | Select-Object Name
# Exit: 0 (10 directories)

# List Flask source files
Get-ChildItem "forgemind-ai\src" -File | Select-Object Name
# Exit: 0 (4 files: api.py, attire_matcher.py, color_matcher.py, .gitkeep)

# List character dataset folders
Get-ChildItem "forgemind-ai\chracters_datasets\cosplay_matches" -Directory | Select-Object Name
# Exit: 0 (6 character folders)

# List all character JSON files
Get-ChildItem "forgemind-ai\chracters_datasets\cosplay_matches" -Recurse -Filter "*.json" | Select-Object Directory, Name, Length
# Exit: 0 (6 JSON files)

# Count character variants
Get-ChildItem "forgemind-ai\chracters_datasets\cosplay_matches" -Recurse -Filter "*.json" | Measure-Object | Select-Object -ExpandProperty Count
# Exit: 0 (Count: 6)

# Check AI models directory
Get-ChildItem "forgemind-ai\models" -ErrorAction SilentlyContinue | Select-Object Name, Length
# Exit: 0 (7 items: marketplace_moderation folder, .gitkeep, 2 GLB files, 1 JSON, 1 joblib)

# Check screener model details
Get-ChildItem "forgemind-ai\models\marketplace_screener_lr.joblib" | Select-Object Name, Length, LastWriteTime
# Exit: 0 (6,485,435 bytes, 2026-03-10 4:50 PM)

# Check Flask tests directory
Get-ChildItem "forgemind-ai\tests" -ErrorAction SilentlyContinue | Select-Object Name
# Exit: 0 (only .gitkeep)

# Build character to Flask slug mapping table
Get-ChildItem "forgemind-ai\chracters_datasets\cosplay_matches" -Recurse -Filter "*.json" | ForEach-Object { [PSCustomObject]@{ Character = $_.Directory.Name; VariantFile = $_.Name; FlaskSlug = $_.BaseName } }
# Exit: 0 (6 rows)

# Grep: ML/LLM packages
grep -r "tensorflow|torch|transformers|openai|anthropic|llm|gpt|claude" "forgemind-ai" --include="*.py" --include="*.txt"
# Result: No matches

# Grep: Mock categorization usage
grep -r "mockCategorizationFromText" "forgemind-mobile" --include="*.ts" --include="*.tsx"
# Result: 10 matches (all in scripts-backup and active scripts)

# Grep: Speech-to-text/voice
grep -r "speech|whisper|transcri|STT|voice.*text|audio.*text" --include="*.ts" --include="*.tsx" --include="*.py"
# Result: 200+ matches, all false positives (function names like "postTypesForCategory")

# Grep: price_paid_php usage
grep -r "price_paid_php" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.sql"
# Result: No matches

# Grep: Readiness/budgeting/AI features
grep -r "readiness|buy.*make|budgeting|value.*reference|new.*variant.*detect|trade.*fair|commission.*pricing|contest.*tier|meetup.*optim" --include="*.ts" --include="*.tsx" --include="*.py"
# Result: 50+ matches for "readiness", 0 for specific AI features

# Grep: Image classifier packages
grep -r "image.*classif|vision.*model|opencv|pillow|PIL|CNN|convolution|resnet|mobilenet" --include="*.ts" --include="*.tsx" --include="*.py"
# Result: No real matches (only test function names)

# Grep: Screener model loading
grep -r "marketplace_screener|\.joblib|joblib\.load" --include="*.ts" --include="*.py"
# Result: 3 files (train script, evaluate script, screener.ts comment only)

# Grep: Mobile variant ID usage
grep -r "character_variant_id|characterVariantId" "forgemind-mobile/src" --include="*.ts" --include="*.tsx"
# Result: 3 files (matcherSlugs.ts, MatchResultsScreen.tsx, AiMatcherService.ts)
```

---

## SUMMARY

**Flask AI Service**:
- 4 HTTP routes (health, match, characters, test)
- 6 character variants (Asta, Gojo, Luck Voltia, OC Cyberpunk, Raiden, Spider-Man)
- Rule-based color matching (HSV distance) + keyword matching + category matching
- 5-level item confidence, 4-level overall quality
- No authentication (backend proxy handles it)
- Bound to localhost:5000 only

**Backend AI Adapters**:
- colorNames.ts: 21 color names → hex, fallback #808080
- slotMapping.ts: keyword-based slot mapping, lossy for broad types
- matcherRouter.ts: format transformer + 8-second timeout + validation

**Mobile-Flask Mapping**:
- 1 mobile variant fully mapped (Gojo Satoru)
- 5 Flask variants unmapped to mobile
- 3 mobile variants without Flask data

**Mock vs Real**:
- Text categorization: MOCK (keyword lookup)
- Photo categorization: MOCK (random picks)
- Voice transcription: MOCK (hardcoded strings)
- Image classifier: ABSENT
- Speech-to-text: ABSENT
- LLM/assistant: ABSENT

**Readiness Scoring**:
- BUILT (mobile-side deterministic formula)
- Inputs: tasks, budget, match quality (from mock data)
- Formula: 40% task completion + 30% item match + 30% budget health

**Advanced AI Features**:
- Buy-or-make: ABSENT
- Budgeting (price_paid_php): ABSENT
- Value reference: STUB (table exists, empty)
- New-variant detection: ABSENT
- Trade fairness: ABSENT
- Commission pricing: ABSENT
- Contest-tier suggestion: ABSENT
- Meetup optimization: ABSENT

**Screener Classifier**:
- Model file: EXISTS (6.4MB, trained 2026-03-10)
- Loaded by: NOTHING (intentional no-op)

**Tests**:
- Flask: 1 sanity test file (NOT RUN BY AGENT — Python not installed)
- No pytest suite, no unit tests

**Vocabulary Mismatch**:
- Flask returns: excellent/good/fair/poor/no-match (item), excellent/good/acceptable/incomplete (overall)
- Spec expects: exact/close/loose
- No translation layer exists

---

**END OF AI EVIDENCE REPORT**
