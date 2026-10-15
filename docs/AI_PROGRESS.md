# AI/ML Features Progress Tracker
**Created:** October 14, 2026  
**Last Updated:** October 15, 2026 (D4 consolidation)  
**Repos:** forgemind-mobile (feature/chat-app), forgemind-backend (feature/chat-curated-terms), forgemind-ai  
**Purpose:** Track implementation status of all 7 AI/ML features in ForgeMind

---

## Feature Inventory

### 1. Attire Matching (Character components → Owned items)

**Status:** ✅ **CONNECTED** (Flask + Backend + Mobile end-to-end)  
**Last Updated:** D3 (October 14, 2026) + D4 verification (October 15, 2026)

**Evidence:**
- Flask API: `forgemind-ai/src/api.py:218-248` (`/api/attire-matcher/suggest` endpoint)
- Flask Matcher: `forgemind-ai/src/attire_matcher.py` (scoring formula, nested folder search)
- Backend Proxy: `forgemind-backend/src/ai/matcherRouter.ts:138-188` (`POST /api/ai/match`)
- Mobile Service: `forgemind-mobile/src/services/AiMatcherService.ts:22-60` (requestMatch function)
- Mobile Screen: `forgemind-mobile/src/screens/cosplayer/MatchResultsScreen.tsx` (real API call, loading/error states)

**Connection Flow:**
1. Mobile: `AiMatcherService.requestMatch()` → transforms OwnedAttire to backend format
2. Backend: `POST /api/ai/match` → session auth, validation, proxies to Flask with 8s timeout
3. Flask: `POST /api/attire-matcher/suggest` → loads character reference, scores items, returns matches
4. Mobile: Displays suggested_outfit, missing_items, match_quality

**Auth:** Session-only (`requireSession` middleware, no marketplace verification)

**Validation:**
- character/variant/slot IDs: regex `^[a-z0-9][a-z0-9_-]{0,100}$`
- Max 100 attire items per request
- Timeout: 8000ms

**Error Handling:**
- Flask 404 → Backend 404 "character variant not found"
- Flask timeout/crash → Backend 503 "matcher service unavailable"
- Flask 500 → Backend 502 "bad response from matcher"

**Scoring Formula (verified D4 Step 1, D5 Step 3):**
- **Item score:** `color * 0.7 + keywords * 0.2 + category * 0.1` (color carries 70% of item score)
- **Item confidence:** excellent ≥0.9, good ≥0.75, fair ≥0.6, poor ≥0.4, no-match <0.4
- **Overall score:** `avg_score * 0.7 + completeness * 0.3`
- **Overall quality:** excellent ≥0.85, good ≥0.7, acceptable ≥0.5, incomplete <0.5

**Test Results (D4 Step 1):**
- Matching items: wig 0.914 (excellent), jacket 0.814 (good), pants 0.820 (good), overall 0.820 (good)
- Wrong items: 0.222-0.306 (no-match), overall 0.415 (incomplete)
- Minus-one: 0.757 (good)
- Empty: 0.0 (no-matches)

**Observed Labels:** excellent, good, fair, no-match, incomplete, no-matches (verified in D4/D5/D6 tests)  
**Never Observed Labels:** poor (≥0.4), acceptable (≥0.5) — defined but not seen in D4/D6 tests

**Real-Data Test (D5 Step 3, D6 Step 3):**
- D5 identified root causes: (1) color names sent but Flask uses hex, (2) category test requires item.category==slot_name but backend sends broad types
- D6 added RULE-BASED adapters: colorNames.ts (name→hex mapping), slotMapping.ts (keyword→slot mapping)
- **BEFORE adapters:** Overall 0.165 incomplete, only wig 0.129 no-match (c:0.00 k:0.14 cat:1.00), other slots rejected by candidate test
- **AFTER adapters:** Overall 0.869 excellent, wig 0.829 good, top 0.857 good, bottom 0.880 good, accessory 0.684 fair (all color:0.78-1.00, category:1.00)
- Color carries 70% of item score, category's 10% now fires consistently with slot mapping
- **New labels observed:** fair (0.684), good (0.829-0.880), excellent (0.869)
- Proposed fix: Add TYPE_TO_SLOT mapping (see flask-data-lookup-edit.md for 3 options)

**Mapping Coverage (D4 Step 3):**
- Total mobile variants: 12
- Total Flask files: 6
- Confirmed mappings: 1 (var-gojo-s2-uniform → gojo-satoru_season-2-uniform.json)
- Unmapped mobile variants: 11 (91.7%)
- Unmapped Flask files: 5 (83.3%)

**Mobile Field Mapping:**
- `attire_id` → Flask `id` ✅
- `original_input_text` → Flask `name` ✅
- `auto_categorized_type` → Flask `type` ✅
- `auto_categorized_color` → Flask `primary_color` ✅
- `keywords` → Flask `keywords` ✅
- ~~`user_body_settings`~~ removed (Flask never uses it)

**Flask Fixes (D3 Step 3):**
- Added fallbacks: `primary_colors[0]` for color, `category` field for type, character/variant for names
- Removed DEBUG prints
- All Flask JSON files now use consistent schema

**Known Gaps:**
- 11 mobile variants have no Flask attire data (Makima/Veira/Zelda, plus 3 more Gojo variants)
- 5 Flask files unreachable from mobile (Asta, Luck Voltia, Raiden, Spider-Man, OC)
- `auto_categorized` fields use mock pattern matching (NOT real AI)
- No budgeting logic (price_paid_php field unused)
- 3 label values untested (fair, poor, acceptable)

**Related Docs:**
- [flask-data-lookup-edit.md](./changes/flask-data-lookup-edit.md) - D2+D3+D4 changes
- [mapping-coverage-table.md](./changes/mapping-coverage-table.md) - Variant mapping coverage
- [matcher-connectivity-labels.md](./changes/matcher-connectivity-labels.md) - Flow, data sources, gaps
- [ai-progress-cleanup.md](./changes/ai-progress-cleanup.md) - Contradictions fixed

---

### 2. Attire Suggestions (AI-recommended items to buy/make)

**Status:** ❌ **MISSING**  
**Evidence:** No implementation found in any repo. No suggestion UI in MatchResultsScreen or any other screen.

**Where it should run:** Flask (requires trained model) OR Backend (simpler rule-based)  
**App screen:** Would integrate into MatchResultsScreen or ProjectDashboardScreen

---

### 3. Budgeting Suggestions (Cost forecasting for a project)

**Status:** ⚠️ **RULE-BASED** (Device-side static JSON, no ML)  
**Evidence:**
- Data: `src/data/budget_items.json` (static budget line items)
- Type: `src/types/projects.ts:51` (BudgetLineItem interface)
- Context: `src/data/index.ts:40-51` (budgetItems exported, getBudgetForProject filter function)
- Utils: `src/utils/readiness.ts:45` (projectBudget param used in readiness formula)

**Where it runs:** Device (JSON file, no AI/ML or forecasting)  
**App screens:** ProjectDashboardScreen, BudgetScreen (if exists)

**Current:** Device-side JSON, no ML cost prediction

---

### 4. Readiness Forecast (Project completion prediction)

**Status:** ⚠️ **RULE-BASED** (Device-side formula, NOT ML)  
**Evidence:**
- Utils: `src/utils/readiness.ts:1-80` (computeReadiness function with explicit formula documented)
- Utils: `src/utils/readinessAggregate.ts:1-90` (computeEventReadinessAggregate for organizers)
- Formula: `readiness = (taskCompletion*0.4 + itemMatch*0.3 + budgetHealth*0.3)` where task/match/budget are 0-1 scores
- Screen: `src/screens/organizer/EventDetailScreen.tsx:44` (Group Readiness display)
- Screen: `src/screens/cosplayer/ProjectDashboardScreen.tsx` (individual readiness percentage)

**Where it runs:** Device (TypeScript calculation, no ML)  
**App screens:** ProjectDashboardScreen (cosplayer), EventDetailScreen (organizer aggregate)

**Current:** Device-side formula, no ML forecasting

---

### 5. Listing Screener (Marketplace content moderation)

**Status:** ⚠️ **RULE-BASED** (Backend term lists + language rules)  
**Evidence:**
- Backend: `forgemind-backend/src/moderation/index.ts:31-35` (VULGAR_TERMS, ADULT_TERMS, HATE_TERMS, PROHIBITED_ITEM_TERMS, UNRELATED_TERMS imported from rules)
- Backend: `forgemind-backend/src/marketplace/screener.ts:24-131` (calls moderateListing, merges violations, has AI second layer hook but deliberately no-op)
- Backend: `forgemind-backend/src/marketplace/listingsRouter.ts:60` (imports checkListingContent from screener, calls it on every listing write)
- Mobile: `src/utils/listingScreener.ts:32` (BLOCKLISTED_TERMS word list, 48 terms, client-side pre-check only)
- Mobile: `src/screens/cosplayer/MarketplaceCreateListingScreen.tsx` (calls screenListing before submit)

**Where it runs:** Backend (Node.js rule-based screener) + Mobile (device-side word list pre-check)  
**App screens:** MarketplaceCreateListingScreen (mobile pre-check), then server-side on POST

**Current:** Rule-based screener (SCREENER_VERSION 2), trained classifier exists but not loaded

---

### 6. Photo Categorization (Auto-tag uploaded listing photos)

**Status:** ❌ **MISSING**  
**Evidence:** No implementation found in any repo. Category selection is manual via chip buttons in `src/screens/cosplayer/CreateListingScreen.tsx:330-352` (MARKETPLACE_CATEGORIES array, user taps one category).

**Where it should run:** Flask (image classification model) OR Backend (if using external API)  
**App screens:** Would integrate into CreateListingScreen photo upload flow

---

### 7. Voice Input / Transcription (Voice-to-text for item descriptions)

**Status:** ❌ **MISSING**  
**Evidence:** No implementation found in any repo. Text inputs (title, description) are manual TextInput fields in `src/screens/cosplayer/CreateListingScreen.tsx` with no voice input UI or transcription hooks.

**Where it should run:** Device (expo-speech-recognition or external API like Whisper)  
**App screens:** Would integrate into any text input (marketplace descriptions, project notes, chat)

---

## Summary Table (7 AI/ML Features)

| Feature | Status | Evidence | Runs Where | Connected to Screen |
|---------|--------|----------|------------|-------------------|
| 1. Attire Matching | ✅ CONNECTED | `forgemind-ai/src/api.py:218`, `backend/src/ai/matcherRouter.ts:138`, `mobile/src/services/AiMatcherService.ts:22` | Flask→Backend→Mobile | ✅ MatchResultsScreen (real API) |
| 2. Attire Suggestions | ❌ MISSING | No implementation | N/A | ❌ Not built |
| 3. Budgeting | ⚠️ RULE-BASED (Device) | `src/data/budget_items.json`, `index.ts:40-51` | Device JSON | ✅ ProjectDashboardScreen |
| 4. Readiness Forecast | ⚠️ RULE-BASED (Device) | `src/utils/readiness.ts:1-80` (formula) | Device calc | ✅ ProjectDashboardScreen, EventDetailScreen |
| 5. Listing Screener | ⚠️ RULE-BASED (Backend + Mobile) | `backend/src/moderation/index.ts:31`, `mobile/src/utils/listingScreener.ts:32` | Backend + Device | ✅ CreateListingScreen + backend POST |
| 6. Photo Categorization | ❌ MISSING | No implementation, manual category chips at `CreateListingScreen.tsx:330` | N/A | ❌ Not built |
| 7. Voice Transcription | ❌ MISSING | No implementation, manual TextInput only | N/A | ❌ Not built |

**Status Counts:**
- **✅ CONNECTED (end-to-end working):** 1 (attire matcher)
- **⚠️ RULE-BASED (working, not ML):** 3 (budgeting, readiness, listing screener)
- **❌ MISSING:** 3 (suggestions, photo categorization, voice)

---

## Test Status Summary (D4 Step 1)

| Test Type | Status | Evidence |
|-----------|--------|----------|
| Scoring formula | ✅ Verified | test_scoring.py (a)-(d), arithmetic checks pass |
| Matching items | ✅ Pass | wig 0.914 excellent, jacket/pants 0.814/0.820 good |
| Wrong items | ✅ Pass | 0.222-0.306 no-match as expected |
| Minus-one test | ✅ Pass | 0.757 good (still good with 1 wrong item) |
| Empty test | ✅ Pass | 0.0 no-matches (all zeros) |
| fair/poor labels | ⚠️ Unverified | Defined (≥0.6, ≥0.4) but not seen in tests |
| acceptable label | ⚠️ Unverified | Defined (≥0.5) but not seen in tests |
| Flow checks | ✅ Verified | check_match_flow.ts (backend), check_match_adapter.ts (mobile) |
| Mapping coverage | ✅ Documented | mapping-coverage-table.md (1/12 variants mapped) |

---

## NEEDS YOU (User Decisions Required)

1. **Unmapped variants:** Create Flask attire files for Makima/Veira/Zelda OR add Asta/Luck/Raiden/Spider-Man to mobile catalog?
2. **Mock categorization:** Replace mock pattern matching with real AI categorization service?
3. **Budgeting:** Build ML cost forecasting OR keep static JSON?
4. **Screener classifier:** Deploy trained model (81% recall) or keep rules-only (48% recall)?

---

## D3/D4 Task References

- **D2:** Flask data lookup fixes (nested folders, field compatibility, path security)
- **D3 Step 1:** Variant mapping (created matcherSlugs.ts, 1 confirmed pair)
- **D3 Step 2:** Backend route fixes (session-only auth, validation, 8s timeout, error mapping, removed user_body_settings)
- **D3 Step 3:** Flask scoring fixes (fallbacks for color/category, removed DEBUG)
- **D4 Step 1:** Scoring formula verification (test_scoring.py, arithmetic checks, category 0.0 explained)
- **D4 Step 2:** Flow checks (backend transform, mobile adapter, error paths)
- **D4 Step 3:** Mapping coverage table (1/12 mobile variants, 6 Flask files)
- **D4 Step 4:** Connectivity/label verification (flow documented, data sources, gaps listed)
- **D4 Step 5:** AI_PROGRESS.md consolidation (removed contradictions, updated status)

**Full change logs:** See `forgemind-mobile/docs/changes/` directory.
