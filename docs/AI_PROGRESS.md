# ForgeMind AI Progress Tracker

**Created:** October 14, 2026  
**Purpose:** Track implementation status of all AI/ML features, their connections, and readiness for production

---

## Executive Summary

- **7 AI Features Tracked:** Attire matching, attire suggestions, budgeting suggestions, readiness forecast, listing screener, photo categorization, voice input
- **Status Distribution:**
  - BUILT (Flask): 1 (attire matcher)
  - MOCK (client-side): 5 (screener, photo categorization, voice transcription, readiness forecast, budgeting)
  - MISSING: 1 (attire suggestions)
- **Flask Connection:** NOT CONNECTED - Flask API exists but mobile app does not call it
- **Priority Gap:** Attire matching is built in Flask but hard-coded mock data is used in the app instead

---

## 1. Attire Matching (Character → Owned Items)

### Status: BUILT (Flask) / MOCK (Mobile)

**Flask Implementation:**
- **File:** `forgemind-ai/src/attire_matcher.py` (class AttireMatcher, line 12)
- **API Endpoint:** `/api/match` (POST)
- **Implementation:** Rule-based scoring algorithm using color, tags, categories
- **Input Fields (Flask expects):**
  - `character_variant_id` (string, required)
  - `owned_items` (array, required): each item has `id`, `name`, `category`, `subcategory`, `color`, `tags`
  - `user_body_settings` (optional): `height`, `size`
- **Output Fields (Flask returns):**
  - `suggested_outfit` (object): best match per costume component with `item_id`, `name`, `score`, `confidence`
  - `alternatives` (object): alternative matches per component
  - `missing_items` (array): components with no acceptable match
  - `match_quality`: `overall_score` (float), `quality_label` (string)

**Mobile Implementation:**
- **Status:** MOCK - uses hard-coded 3-item match in `src/data/match_components.json`
- **File:** `src/utils/readiness.ts:15` imports `matchComponents` from `src/data/index.ts:41`
- **Mock Data:** 3 components (wig, blindfold, shoes) with quality labels (exact/close/loose)
- **Called By:** `computeReadiness()` function in readiness scoring
- **Runs:** Client-side (device)

**Connection Status:** ❌ **NOT CONNECTED**
- Mobile app uses hard-coded JSON file
- Flask matcher exists but is never called by mobile app
- No API client code exists in mobile repo to call `/api/match`

**Field Name Mismatch:**
- Flask expects: `character_variant_id`, `owned_items` array with `id`, `name`, `category`, `subcategory`, `color`, `tags`
- Mobile has: OwnedAttire schema with `attire_id`, `auto_categorized_type`, `auto_categorized_color`, `flexibility_tag`
- **Mapping required:** OwnedAttire → owned_items array format

**Next Link to Build:** Create `src/services/AttireMatcherService.ts` that calls Flask `/api/match`, maps OwnedAttire to expected format, and replaces the hard-coded `matchComponents` import

---

## 2. Attire Suggestions

### Status: MISSING

**Evidence:** Grepped codebase for "suggestion|suggest.*attire" - found only:
- Flask matcher comment at `forgemind-ai/src/attire_matcher.py:194` describing match as "suggestion"
- Policy text referencing "accuracy of AI matching suggestions" (passive voice, no implementation)
- Marketplace price/fairness suggestions explicitly marked "out of scope" in `src/screens/cosplayer/MakeOfferScreen.tsx:4`

**Implementation:** None exists. Flask matcher returns matches, not suggestions for missing items to buy.

**Likely Design:** Would need to:
1. Take missing_items from attire match result
2. Query marketplace for listings matching those component types/colors
3. Rank by relevance + price + seller ratings
4. Return top 3-5 purchase suggestions per missing component

**Next Link to Build:** Requires attire matching to be connected first (step 1 above)

---

## 3. Budgeting Suggestions

### Status: MOCK (Mobile)

**Implementation:**
- **File:** `src/utils/readiness.ts:58-61`
- **Function:** `computeReadiness()` calculates `budgetHealth = 1 - min(1, spent / stated_budget)`
- **Runs:** Client-side (device)
- **Algorithm:** Deterministic formula: 30% weight in readiness score
- **Input:** `projectBudget` array (BudgetLineItem[] with `planned_amount`, `actual_amount`)
- **Output:** `budget_utilization` percentage in ProjectReadiness result

**Connection:** None - purely local math, no AI/ML

**Called By:**
- `src/screens/shared/ShareableCardScreen.tsx:58` for project cards
- `src/utils/readinessAggregate.ts:92` for event readiness aggregate

**Budget Data Location:** Device-only (Projects Context)
- **Storage:** `src/contexts/ProjectsContext.tsx` manages projects array
- **Persistence:** No backend storage for budget_line_items yet
- **Schema:** `forgemind-backend/src/scripts/seed.ts:443` shows budget_line_items table exists but no API routes for it

**What Real AI Would Need:**
- Historical cost data per component type (e.g. "wigs cost $30-80 on average")
- User's skill level (beginner vs expert affects material costs)
- Event deadline (rush shipping increases costs)
- Marketplace price trends for similar items

**Next Link to Build:** 
1. Backend API routes for budget_line_items CRUD
2. Cost prediction model trained on marketplace data + user project outcomes
3. Runs on backend/Flask, called when user starts new project

---

## 4. Readiness Forecast

### Status: MOCK (Mobile)

**Implementation:**
- **File:** `src/utils/readiness.ts:48` - function `computeReadiness()`
- **Runs:** Client-side (device)
- **Algorithm:** Weighted formula (40% task completion + 30% item match + 30% budget health)
- **Comments at line 2-11:** Explicitly marked "Mock" and "Real AI-driven readiness forecasting is a later backend phase"
- **Input:** Project, Task[], BudgetLineItem[]
- **Output:** ProjectReadiness with `readiness_score` (0-1), `missing_components`, `matched_components`, `budget_utilization`, `skill_gap_details`

**Called By:**
- Individual project readiness: `src/screens/shared/ShareableCardScreen.tsx:57`
- Event aggregate: `src/utils/readinessAggregate.ts:88` for organizer dashboard
- **Privacy contract:** `src/utils/readinessAggregate.ts:7-20` - only opted-in projects (opted_in_readiness_sharing=true) are aggregated

**What Real AI Would Need:**
- Historical completion times for similar projects (character difficulty × user skill level)
- Task dependency graph (some tasks block others)
- Seasonal factors (event date, local shipping delays, convention season)
- User's past project success rate

**Next Link to Build:**
1. Flask forecasting model trained on completed project data
2. Backend endpoint `/api/projects/:id/forecast` 
3. Returns: probability distribution over completion dates, risk factors, recommended task prioritization

---

## 5. Listing Screener (Marketplace Moderation)

### Status: PARTIAL (Backend word list + language rules) / MOCK (Mobile client-side)

**Backend Implementation:**
- **File:** `forgemind-backend/src/moderation/index.ts:194` - function `moderateListing()`
- **Runs:** Backend (Node/Express)
- **Algorithm:** 
  - Language rules (Tagalog + English profanity/slurs) from `src/moderation/rules/blockedTerms.ts`
  - Generated term list from mining (chat_curated_terms_kept.txt)
  - Quality check from `src/marketplace/quality.ts:47` - `checkListingQuality()`
- **Called By:** `src/marketplace/listingsRouter.ts:608` - `checkListingContent()` on POST /listings
- **Input:** `{title, description, category}`
- **Output:** `ModerationResult` with `allowed` (boolean), `violations` array

**Mobile Mock:**
- **File:** `src/utils/listingScreener.ts:79` - function `screenListing()`
- **Status:** Explicitly marked "MOCK RULE-BASED SCREENER" at line 4
- **Algorithm:** 26-term blocklist + category validation
- **Runs:** Client-side (currently called from CreateListingScreen.tsx:144)
- **Known Issues:** Line 28 documents "prop gun replica" false positive

**AI Plan Document:**
- **File:** `docs/ai/LISTING_SCREENER_AI_PLAN.md`
- **Recommendation:** Path 1 (hosted API like Google Cloud Vision) NOT Path 2 (custom training)
- **Rationale:** Only 6 seed listings exist, no photos uploaded yet, custom training blocked until post-launch

**Connection Status:** ✅ **CONNECTED** (backend only)
- Mobile mock runs client-side (WRONG per build plan)
- Backend has real word-list moderation that runs on listing submission
- **Gap:** Photos not screened yet (CreateListingScreen.tsx:138 hardcodes `photos: []`)

**Next Link to Build:**
1. Remove client-side mock from CreateListingScreen
2. Backend handles full screening (already does for text)
3. Phase 4: Add photo screening via hosted API (Google Cloud Vision per build plan)

---

## 6. Photo Categorization (Owned Attire Entry)

### Status: MOCK (Mobile)

**Implementation:**
- **File:** `src/screens/cosplayer/PhotoEntryScreen.tsx:82-91`
- **Mock Function:** `src/utils/mockCatalog.ts:91` - `mockPhotoCategorization()`
- **Runs:** Client-side (device)
- **Algorithm:** Random selection from predefined lists after 1200ms delay
- **Runs:** On photo selection in owned attire entry flow
- **Output:** `{auto_categorized_type, auto_categorized_color, auto_categorized_style}`
- **Comments at line 3:** "Real image classification is a backend feature (BE-1)"

**Called By:**
- Photo entry: `src/screens/cosplayer/PhotoEntryScreen.tsx:82`
- Navigation: `src/navigation/OwnedItemStackNavigator.tsx:62`

**Mock Output Types:**
- **Types:** 10 categories (wig, clothing, footwear, accessory, armor, weapon, prop, fabric, material, other)
- **Colors:** 8 colors (black, white, red, blue, pink, brown, green, purple)
- **Styles:** 6 styles (anime-inspired, casual, formal, streetwear, handcrafted, replica uniform)

**Database Storage:**
- **Table:** `owned_attire` has `auto_categorized_type`, `auto_categorized_color`, `auto_categorized_style` columns
- **Seed:** `forgemind-backend/src/scripts/seed.ts:522` shows schema

**What Real AI Would Need:**
- Image classification model (CNN or Vision API)
- Trained on cosplay item images with labeled type/color/style
- Runs on backend or Flask, returns same 3-field output

**Next Link to Build:**
1. Flask endpoint `/api/categorize-photo` (POST with image bytes)
2. Vision API integration OR custom CNN model
3. Mobile calls backend instead of running mockPhotoCategorization()

---

## 7. Voice Input (Speech-to-Text for Owned Attire)

### Status: MOCK (Mobile)

**Implementation:**
- **File:** `src/screens/cosplayer/VoiceEntryScreen.tsx:82` - `mockTranscription()`
- **Mock Function:** `src/utils/mockCatalog.ts:84` - returns hard-coded strings
- **Runs:** Client-side (device)
- **Algorithm:** Mock recording UI with timer, returns canned text after 1200ms
- **Languages:** 2 options (English, Taglish)
- **Output:** `original_input_text` string, then passed to `mockCategorizationFromText()` for type/color extraction

**Mock Transcriptions:**
- English: "a red lightweight jacket that works for casual wear or costume lining"
- Taglish: "red na jacket na magaan, pwedeng pang casual o costume lining"

**Called By:**
- Voice entry: `src/screens/cosplayer/VoiceEntryScreen.tsx:71-86`
- Navigation: `src/navigation/OwnedItemStackNavigator.tsx:91`

**Database Storage:**
- **Table:** `owned_attire.entry_method='voice'`, `entry_language`, `original_input_text`
- **Seed:** `src/data/owned-attire-seed.ts:60` shows voice entry example

**What Real AI Would Need:**
- Speech-to-text API (Google Cloud Speech-to-Text, AWS Transcribe, Azure Speech)
- Language model supporting Taglish code-switching
- Runs on backend, mobile sends audio bytes
- NLP for keyword extraction from transcribed text

**Next Link to Build:**
1. Backend endpoint `/api/transcribe-voice` (POST with audio bytes + language param)
2. Speech-to-Text API integration
3. Keyword extraction from transcript (type/color/style) using NLP
4. Mobile sends recording, receives transcript + categorization

---

## Connection Map

| AI Feature | Data In | Data Out | App Screen | Backend Route | Flask Route | Connected? | Next Link |
|------------|---------|----------|------------|---------------|-------------|------------|-----------|
| **Attire Matching** | character_variant_id + owned_items[] | suggested_outfit + alternatives + missing_items + match_quality | (Readiness calc) | None | POST /api/match | ❌ No | Create AttireMatcherService.ts to call Flask |
| **Attire Suggestions** | missing_items + user preferences | marketplace listings for missing components | (Future) | None | None | ❌ No | Build after attire matching connected |
| **Budgeting Suggestions** | Project + BudgetLineItem[] | budget_health score | ShareableCardScreen | None | None | ❌ No (local math) | Backend budget CRUD + cost model |
| **Readiness Forecast** | Project + Tasks + Budget | readiness_score + missing_components + skill_gaps | ShareableCardScreen, Event aggregate | None | None | ❌ No (local formula) | Flask forecasting model + backend endpoint |
| **Listing Screener** | title + description + category | allowed (bool) + violations[] | CreateListingScreen | POST /listings → checkListingContent() | None | ⚠️ Partial (backend only, no photos) | Remove client mock, add photo screening |
| **Photo Categorization** | photo image bytes | auto_categorized_type + color + style | PhotoEntryScreen | None | None | ❌ No (mock) | Flask /api/categorize-photo + Vision API |
| **Voice Input** | audio bytes + language | transcript + extracted keywords | VoiceEntryScreen | None | None | ❌ No (mock) | Backend /api/transcribe-voice + Speech API |

---

## Priority Recommendations

1. **Connect Attire Matching (HIGHEST):** Flask matcher is built and tested (`/api/test` endpoint works), but mobile uses hard-coded JSON. Build the service layer.

2. **Add Budget API Routes:** Backend has budget_line_items table but no CRUD routes. Projects can't persist budgets.

3. **Fix Listing Screener Architecture:** Mobile mock violates build plan (should be backend-only). Backend already has text screening, needs photo screening added.

4. **Photo & Voice Entry:** Both are mocked with identical patterns. Build one (photo categorization via Vision API), then replicate pattern for voice (Speech-to-Text API).

5. **Readiness Forecast:** Currently a client-side formula. Lowest priority since formula is documented and testable. Upgrade to ML model only after enough project completion data exists.

---

## Flask Health Check

**Flask API Status:** EXISTS, NOT TESTED IN THIS SESSION

**Endpoints:**
- GET `/health` - health check
- POST `/api/match` - attire matching (BUILT)
- GET `/api/characters` - list available character variants (BUILT)
- GET `/api/test` - test matcher with mock Luck Voltia data (BUILT)

**To Test:** Start Flask server and call health check:
```powershell
# From forgemind-ai directory:
python src/api.py
# Then in another terminal:
curl http://localhost:5000/health
```

**Dataset Paths:**
- Character requirements: `datasets/cosplay_matches/` and `datasets/custom_variant_refs/`
- Matcher loads these on init (line 16: `AttireMatcher(datasets_path="../datasets")`)

---

## Next Steps

### Step 1: Connect Attire Matcher (Highest ROI)
- Create `forgemind-mobile/src/services/AttireMatcherService.ts`
- Map OwnedAttire schema → Flask `owned_items` format
- Replace `matchComponents` hard-coded import with API call
- Update readiness calculation to use real API response

### Step 2: Budget Persistence
- Add backend routes: POST/GET/PUT/DELETE `/api/projects/:id/budget`
- Update ProjectsContext to call backend instead of local state only
- Enables real cost tracking for readiness formula

### Step 3: Photo Screening
- Add Google Cloud Vision API key to backend env
- Create backend endpoint `/marketplace/listings/screen-photo`
- Update listings router to call photo screening before storing listing
- Remove client-side listing screener mock

### Step 4: Owned Attire Image Classification
- Flask endpoint `/api/categorize-photo` using Vision API or custom CNN
- Mobile PhotoEntryScreen calls backend instead of mockPhotoCategorization
- Same infrastructure can support voice transcription (Step 5)

---

**Last Updated:** October 14, 2026  
**Status:** STEP 1 COMPLETE - Initial inventory recorded
