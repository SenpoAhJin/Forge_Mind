# AI/ML Features Progress Tracker
**Created:** October 14, 2026  
**Repos:** forgemind-mobile (feature/chat-app), forgemind-backend (feature/chat-curated-terms), forgemind-ai  
**Purpose:** Track implementation status of all 7 AI/ML features in ForgeMind

---

## Feature Inventory

### 1. Attire Matching (Character components → Owned items)

**Status:** BUILT (Flask) + MOCK (Mobile)  
**Evidence:**
- Flask API: `forgemind-ai/src/api.py:28-75` (`/api/match` endpoint, documented request/response shape)
- Flask Matcher: `forgemind-ai/src/attire_matcher.py` (core matching logic)
- Mobile Screen: `src/screens/cosplayer/MatchResultsScreen.tsx:27` (MOCK_MATCH_RESULTS hard-coded array)

**Where it runs:** Flask (Python ML service) on port 5000  
**App screen:** MatchResultsScreen (cosplayer flow)  
**Connection status:** ❌ **NOT CONNECTED** - Mobile uses hard-coded MOCK_MATCH_RESULTS, does not call Flask API

**Flask Test (October 14, 2026):**
- Server: Started cleanly on port 5000 ✅
- Health check: `/health` returned `{status: "healthy", service: "forgemind-ai", version: "1.0.0"}` ✅
- Match endpoint: `/api/match` returned 404 (Character dataset not found) - expected because no datasets created yet
- Test endpoint: `/api/test` returned mock owned_items structure showing expected field format

**Dataset Investigation (October 14, 2026):**
- Flask expects datasets at: `../datasets/cosplay_matches/` (api.py:16 passes `"../datasets"` to AttireMatcher, attire_matcher.py:21 appends `/cosplay_matches`)
- Actual base folder: `../chracters_datasets/` (typo: "chracters" not "characters")
- Flask expects flat structure: `cosplay_matches/{character_variant_id}.json` (attire_matcher.py:32)
- Actual file structure: `cosplay_matches/{character name}/{character_variant_id}.json` (nested subdirectories)
- Example files found:
  - `chracters_datasets/cosplay_matches/gojo satoru - jujutsu kaisen/gojo-satoru_season-2-uniform.json`
  - `chracters_datasets/cosplay_matches/asta - black clover/asta_black-bulls-uniform.json`
  - `chracters_datasets/cosplay_matches/luck voltia - black clover/luck-voltia_black-bulls.json`
- File count in cosplay_matches: 3 character folders, 3 JSON files total
- **Verdict: Wrong base path + wrong file structure.** Flask api.py:16 hard-codes `"../datasets"` but folder is `"../chracters_datasets"`, AND attire_matcher.py:32 expects flat files but they're in character-name subdirectories.

**BLOCKER (Step 2 Gate):**
Cannot obtain successful match response. Flask code cannot be edited per task rules (forgemind-ai is read-only). Character JSON files exist but are inaccessible to Flask matcher due to:
1. Hard-coded base path mismatch: api.py expects `../datasets` but folder is `../chracters_datasets`
2. File structure mismatch: matcher expects `cosplay_matches/gojo-satoru_season-2-uniform.json` but actual path is `cosplay_matches/gojo satoru - jujutsu kaisen/gojo-satoru_season-2-uniform.json`

**What user must provide:**
Option A: Restructure files to match Flask expectations:
- Rename `forgemind-ai/chracters_datasets` → `forgemind-ai/datasets` (fix typo)
- Move all JSON files from `datasets/cosplay_matches/{character name}/{variant}.json` to flat `datasets/cosplay_matches/{variant}.json` (3 files need moving)

Option B: Allow editing forgemind-ai files:
- Edit `api.py:16` to pass `"../chracters_datasets"` instead of `"../datasets"`
- Edit `attire_matcher.py:32-40` to search subdirectories when flat file not found

Until one of these is done, Steps 3-6 (backend proxy route, mobile adapter, checks, relabels) cannot proceed because they depend on a proven Flask endpoint that returns real match data.

**Flask Request Fields (what Flask expects):**
- `character_variant_id` (string, e.g. "gojo-satoru_season-2-uniform")
- `owned_items` (array of objects with: `id`, `name`, `category`, `subcategory`, `color`, `tags[]`)
- `user_body_settings` (optional object with: `height`, `size`)

**Flask Response Fields (what Flask returns):**
- `suggested_outfit` (object with item per slot: `item_id`, `name`, `score`, `confidence`)
- `alternatives` (object with arrays of alternatives per slot)
- `missing_items` (array)
- `match_quality` (object with: `overall_score`, `quality_label`)
- `character_variant_id` (echo)

**Mobile Owned Attire Fields (what app has):**
- `attire_id` ✅ (maps to Flask `id`)
- `auto_categorized_type` ✅ (maps to Flask `category` - AttireCategory enum)
- `auto_categorized_color` ✅ (maps to Flask `color` - string)
- `auto_categorized_style` ✅ (could map to Flask `subcategory` or `tags[]`)
- `flexibility_tag`, `condition_rating`, `photo_urls`, `notes`, etc. (extra fields Flask doesn't need)
- ❌ NO `name` field - owned attire has no explicit name, only `original_input_text`
- ❌ NO `tags` array - would need to parse from `auto_categorized_style` or compute from other fields

**Field Mapping Analysis:**
- **Match:** attire_id → id, auto_categorized_type → category, auto_categorized_color → color
- **Mismatch:** Mobile has no dedicated `name` field (use `original_input_text` or synthesize from type+color+style)
- **Mismatch:** Mobile has no `tags[]` array (derive from `auto_categorized_style` split by space/comma, or leave empty)
- **Mismatch:** Mobile has no `subcategory` field (use `auto_categorized_style` or leave as same as `category`)

**Gap:** Mobile app needs to:
1. Transform OwnedAttire → Flask owned_items format (synthesize name, derive tags from style, map category)
2. Call Flask `/api/match` endpoint instead of using MOCK_MATCH_RESULTS
3. Handle Flask response shape (currently expects hard-coded array)
4. Add character datasets to forgemind-ai/datasets/cosplay_matches/ before matcher can return real results

**Smallest viable step:** Create adapter function that transforms OwnedAttire[] to Flask owned_items[] format, then replace MOCK_MATCH_RESULTS with real Flask API call

---

### 2. Attire Suggestions (AI-recommended items to buy/make)

**Status:** MISSING  
**Evidence:** No implementation found in any repo. No suggestion UI in MatchResultsScreen or any other screen.

**Where it should run:** Flask (requires trained model) OR Backend (simpler rule-based)  
**App screen:** Would integrate into MatchResultsScreen or ProjectDashboardScreen  
**Connection status:** ❌ NOT BUILT

**What it needs:**
- Input: character_variant_id, existing owned_items, user budget, user skill level
- Output: suggested purchases/build items with priority, estimated cost, difficulty
- Training data: marketplace prices, build difficulty ratings, component alternatives

**Smallest viable step:** Add "Suggested Next Purchase" section to MatchResultsScreen showing top 1-3 missing items from matcher output with marketplace search links

---

### 3. Budgeting Suggestions (Cost forecasting for a project)

**Status:** RULE-BASED (Device-side static JSON)  
**Evidence:**
- Data: `src/data/budget_items.json` (static budget line items)
- Type: `src/types/projects.ts:51` (BudgetLineItem interface)
- Context: `src/data/index.ts:40-51` (budgetItems exported, getBudgetForProject filter function)
- Utils: `src/utils/readiness.ts:45` (projectBudget param used in readiness formula)

**Where it runs:** Device (JSON file, no AI/ML or forecasting)  
**App screens:** ProjectDashboardScreen, BudgetScreen (if exists)  
**Connection status:** ✅ WORKS - But uses static JSON, no ML cost prediction

**Current budget data (per project line item):**
- `budget_line_item_id`, `project_id`, `description`, `estimated_cost`, `actual_cost`, `is_complete`
- Stored device-side in JSON, filtered by project_id
- Used in readiness formula as budgetHealth metric (spent vs stated_budget)

**Real AI would need:**
- Input: character_variant_id, owned_items (what's already available), user location (shipping costs)
- Output: estimated total cost, cost breakdown by component, confidence intervals
- Training data: marketplace transaction history, component costs over time, build complexity

**Smallest viable step:** Call Flask endpoint with missing components from matcher, return estimated costs based on marketplace price history

---

### 4. Readiness Forecast (Project completion prediction)

**Status:** RULE-BASED (Device-side formula, NOT ML)  
**Evidence:**
- Utils: `src/utils/readiness.ts:1-80` (computeReadiness function with explicit formula documented)
- Utils: `src/utils/readinessAggregate.ts:1-90` (computeEventReadinessAggregate for organizers)
- Formula: `readiness = (taskCompletion*0.4 + itemMatch*0.3 + budgetHealth*0.3)` where task/match/budget are 0-1 scores
- Screen: `src/screens/organizer/EventDetailScreen.tsx:44` (Group Readiness display)
- Screen: `src/screens/cosplayer/ProjectDashboardScreen.tsx` (individual readiness percentage)

**Where it runs:** Device (TypeScript calculation, no ML)  
**App screens:** ProjectDashboardScreen (cosplayer), EventDetailScreen (organizer aggregate)  
**Connection status:** ✅ WORKS - Computes readiness % from task completion, item matches, and budget spent

**Current readiness calculation:**
- taskCompletion = mean(task status: completed=1.0, in-progress=0.5, pending/skipped=0) × 40%
- itemMatch = mean(match quality: exact=1.0, close=0.5, loose=0.25) × 30%
- budgetHealth = 1 - min(1, spent/budget) × 30%
- Output: Single readiness score 0-100%, displayed as percentage

**Real AI forecasting would add:**
- Input: current readiness %, days until event, user build velocity (tasks/week), budget spent vs total
- Output: predicted completion date, confidence interval, risk factors (low velocity, tight budget, complex builds)
- Training data: historical project timelines, task completion rates, budget overruns

**Smallest viable step:** Add "Predicted Completion Date" to ProjectDashboardScreen using simple linear extrapolation from task velocity (tasks_completed / days_elapsed × days_remaining)

---

### 5. Listing Screener (Marketplace content moderation)

**Status:** RULE-BASED (Backend term lists + language rules)  
**Evidence:**
- Backend: `forgemind-backend/src/moderation/index.ts:31-35` (VULGAR_TERMS, ADULT_TERMS, HATE_TERMS, PROHIBITED_ITEM_TERMS, UNRELATED_TERMS imported from rules)
- Backend: `forgemind-backend/src/marketplace/screener.ts:24-131` (calls moderateListing, merges violations, has AI second layer hook but deliberately no-op)
- Backend: `forgemind-backend/src/marketplace/listingsRouter.ts:60` (imports checkListingContent from screener, calls it on every listing write)
- Mobile: `src/utils/listingScreener.ts:32` (BLOCKLISTED_TERMS word list, 48 terms, client-side pre-check only)
- Mobile: `src/screens/cosplayer/MarketplaceCreateListingScreen.tsx` (calls screenListing before submit)

**Where it runs:** Backend (Node.js rule-based screener) + Mobile (device-side word list pre-check)  
**App screens:** MarketplaceCreateListingScreen (mobile pre-check), then server-side on POST  
**Connection status:** ✅ LIVE - Backend rule-based screener (SCREENER_VERSION 2) runs on every listing write

**Current implementation:**
- **Backend (authority):** Term lists (vulgar, adult, hate, prohibited items, unrelated) + language rules + generated 3-term list from data corpus. Pure function, no ML. Version 2 measured at precision 73.30%, recall 48.25% on held-out data.
- **Mobile (UX pre-check only):** Case-insensitive substring match against 48-term BLOCKLISTED_TERMS. Not trusted by backend - every listing rescreened server-side.
- **Trained classifier EXISTS but NOT LOADED:** scikit-learn TF-IDF + logistic regression trained on labeled data, stored at `forgemind-ai/models/marketplace_screener_lr.joblib`. Measured at precision 73.14%, recall 81.01% (catches materially more than rules but also wrongly blocks 987 vs rules' 582). Hook exists at screener.ts:119 `aiSecondLayerNoop` but returns `{allowed: true}` always.

**Known limitations:**
- Rules-only cannot catch semantic violations (weapon described without the word, off-topic listing with clean words)
- Substring matching blocks legitimate cosplay (e.g. "prop gun replica" matches "gun")
- No second pass: the trained classifier exists but decision to deploy it is pending

**Smallest viable step:** Wire up the trained classifier as second layer (load model in screener.ts:119, call it after rules pass, block when either layer blocks)

---

### 6. Photo Categorization (Auto-tag uploaded listing photos)

**Status:** MISSING  
**Evidence:** No implementation found in any repo. Category selection is manual via chip buttons in `src/screens/cosplayer/CreateListingScreen.tsx:330-352` (MARKETPLACE_CATEGORIES array, user taps one category).

**Where it should run:** Flask (image classification model) OR Backend (if using external API)  
**App screens:** Would integrate into CreateListingScreen photo upload flow  
**Connection status:** ❌ NOT BUILT - No photo analysis, no ML categorization, no "suggest category" feature

**What it needs:**
- Input: uploaded photo (base64 or file path)
- Output: detected category (wig, costume, prop, shoes, accessories), confidence score
- Model: CNN image classifier (ResNet, MobileNet, or fine-tuned on cosplay items)
- Training data: labeled photos of cosplay items by category

**Smallest viable step:** Add "Suggest Category" button on photo upload that calls Flask `/api/categorize-photo` endpoint and pre-fills category dropdown

---

### 7. Voice Input / Transcription (Voice-to-text for item descriptions)

**Status:** MISSING  
**Evidence:** No implementation found in any repo. Text inputs (title, description) are manual TextInput fields in `src/screens/cosplayer/CreateListingScreen.tsx` with no voice input UI or transcription hooks.

**Where it should run:** Device (expo-speech-recognition or external API like Whisper)  
**App screens:** Would integrate into any text input (marketplace descriptions, project notes, chat)  
**Connection status:** ❌ NOT BUILT - No voice recording UI, no speech-to-text, no microphone icon

**What it needs:**
- Input: audio recording (WAV, MP3, or stream)
- Output: transcribed text
- Library options: expo-speech-recognition (device), OpenAI Whisper API (cloud), Google Speech-to-Text
- Privacy: Device-side preferred for sensitive notes; cloud OK for marketplace descriptions

**Smallest viable step:** Add microphone icon to CreateListingScreen description field that records 30sec audio, sends to Whisper API, fills textarea with transcript

---

## Summary Table (7 AI/ML Features)

| Feature | Status | Evidence | Runs Where | Connected to Screen |
|---------|--------|----------|------------|-------------------|
| 1. Attire Matching | BUILT (Flask) + MOCK (Mobile) | `forgemind-ai/src/api.py:28`, `MatchResultsScreen.tsx:27` | Flask port 5000 | ❌ MatchResultsScreen (mock data) |
| 2. Attire Suggestions | MISSING | No implementation | N/A | ❌ Not built |
| 3. Budgeting | RULE-BASED (Device) | `src/data/budget_items.json`, `index.ts:40-51` | Device JSON | ✅ ProjectDashboardScreen |
| 4. Readiness Forecast | RULE-BASED (Device) | `src/utils/readiness.ts:1-80` (formula) | Device calc | ✅ ProjectDashboardScreen, EventDetailScreen |
| 5. Listing Screener | RULE-BASED (Backend + Mobile) | `backend/src/moderation/index.ts:31`, `mobile/src/utils/listingScreener.ts:32` | Backend + Device | ✅ CreateListingScreen + backend POST |
| 6. Photo Categorization | MISSING | No implementation, manual category chips at `CreateListingScreen.tsx:330` | N/A | ❌ Not built |
| 7. Voice Transcription | MISSING | No implementation, manual TextInput only | N/A | ❌ Not built |

**Status Counts:**
- **BUILT (Flask, not connected):** 1 (attire matcher)
- **RULE-BASED (working):** 3 (budgeting, readiness, listing screener)
- **MISSING:** 3 (suggestions, photo categorization, voice)

---

## Wearing Pipeline Status (Task C2/C2b)

**Status:** SCAFFOLD (placeholder only, not tested on device)

**What exists:**
- Body models: Male/female GLB files loaded via `BodyModel.tsx` (1.4 MB / 1.3 MB, skinned with 706-707 Rigify bones, T-pose rest state)
- Body bounds: `src/data/bodyBounds.ts` with male/female min/max coordinates
- Garment registry: `src/data/garmentRegistry.ts` with 1 placeholder entry (head hat cylinder, positioned per-body using `getHeadTopY()`)
- Garment component: `src/components/GarmentLayer.tsx` (loads GLB or renders placeholder primitive, error-safe)
- Preview UI: `src/components/Preview3D.tsx` with garment visibility toggles (horizontal scroll bar at bottom)
- Validation: `scripts/check_garment_registry.js` (validates slots, bodyTypes, asset imports, isPlaceholder consistency)
- Documentation: `docs/GARMENT_SPEC.md` (Blender export guide, body measurements, slot anchors, attachment behavior)

**What is missing:**
1. **Real garment GLB:** No garment asset exists (only placeholder red cylinder above head). Need to create at least one garment in Blender (wig recommended) following GARMENT_SPEC.md, export as GLB <1MB <10k triangles, place in `assets/models/garments/`.
2. **Link from owned attire to garment:** OwnedAttire type has no garment_id field. Need to add mapping: owned attire → garment registry entry.
3. **Matcher-driven choice:** Flask matcher returns `suggested_outfit` with item_ids, but no code connects matcher output to garment registry to show matched garment in 3D preview.
4. **Device testing:** Placeholder has not been tested on physical device via Expo Go. Unknown if red cylinder renders correctly positioned above male/female heads.

**Next 3 steps:**
1. Test placeholder on device: Open Expo Go, navigate to Preview3DTestScreen, toggle "Head Hat (placeholder)", verify red cylinder appears above head on both male/female bodies.
2. Create first real garment: Export wig GLB from Blender following spec, add static import to garmentRegistry.ts, validate with check script, test on device.
3. Connect matcher to garment preview: When Flask matcher returns suggested_outfit, map item_ids to garment registry, render matched garments in Preview3D alongside body.

| AI Feature | Data In | Data Out | App Screen | Backend Route | Flask Route | Connected | Next Link to Build |
|------------|---------|----------|------------|---------------|-------------|-----------|-------------------|
| Attire Matching | character_variant_id,<br/>owned_items[],<br/>user_body_settings | suggested_outfit{},<br/>alternatives[],<br/>missing_items[],<br/>match_quality{} | MatchResultsScreen | None (direct to Flask) | `/api/match` | ❌ No | Mobile→Flask: Add API call in MatchResultsScreen replacing MOCK_MATCH_RESULTS |
| Attire Suggestions | character_variant_id,<br/>owned_items[],<br/>user_budget,<br/>user_skill_level | suggested_items[],<br/>priority_scores[],<br/>estimated_costs[] | MatchResultsScreen (future) | TBD | TBD | ❌ No | Build Flask endpoint `/api/suggest-items` using matcher missing_items + marketplace price data |
| Budgeting | project_id,<br/>missing_components[] | estimated_costs[],<br/>confidence_intervals[],<br/>cost_breakdown{} | ProjectDashboardScreen | None | None | ⚠️ Mock (JSON) | Mobile stores budget_items.json locally. Next: Flask `/api/estimate-costs` using marketplace price history |
| Readiness Forecast | project_id,<br/>tasks[],<br/>days_until_event,<br/>task_velocity | predicted_completion_date,<br/>confidence_%,<br/>risk_factors[] | ProjectDashboardScreen,<br/>EventDetailScreen | None | None | ✅ Simple calc | Runs device-side via `utils/readiness.ts`. Next: Add ML-based date prediction in Flask `/api/forecast-readiness` |
| Listing Screener | listing_title,<br/>listing_description,<br/>category | permitted/blocked,<br/>confidence_score,<br/>flagged_categories[] | MarketplaceCreate<br/>ListingScreen | None | None | ⚠️ Word list | Runs device-side `utils/listingScreener.ts`. Next: Backend `/marketplace/listings/screen` then Flask `/api/screen-listing` with logistic regression |
| Photo Categorization | uploaded_photo (base64) | detected_category,<br/>confidence_score,<br/>alt_categories[] | MarketplaceCreate<br/>ListingScreen | TBD | `/api/categorize-photo` | ❌ No | Build Flask CNN classifier endpoint, add "Suggest Category" button to photo upload flow |
| Voice Transcription | audio_recording (WAV/MP3) | transcribed_text | Any text input field | TBD (if using Whisper API) | TBD | ❌ No | Add expo-speech-recognition OR Whisper API call, microphone icon on description fields |

---

## Next Steps

**Priority 1 (Highest Impact):** Connect mobile app to Flask attire matcher
- Replace MOCK_MATCH_RESULTS in MatchResultsScreen with real API call
- Add API base URL to mobile config
- Handle Flask response shape
- Estimated effort: 2-4 hours

**Priority 2:** Build "wearing sample attire" 3D preview
- Show matched garment on fixed male/female body GLB
- Requires garment asset in GLB format (see "Wearing: audit" section below)
- Estimated effort: 4-8 hours (if asset exists)

**Priority 3:** Replace listing screener word list with ML classifier
- Train logistic regression on labeled marketplace data
- Deploy as Flask endpoint `/api/screen-listing`
- Mobile app calls backend instead of client-side word list
- Estimated effort: 8-12 hours (including data labeling)
6. **Size:** Positioned/scaled to fit the body in Blender before export (no runtime scaling implemented yet)

**Example minimal test case:**
- File: `assets/models/garments/Wig_Sample.glb`
- Content: Simple wig mesh positioned on male body head
- Size: < 1 MB
- Bones: None (static mesh parented to head bone, or positioned at origin)

**Once asset provided, implementation would be:**
1. Create `assets/models/garments/` directory
2. Add `Wig_Sample.glb` file
3. Create `src/components/GarmentModel.tsx` component using `useGLTF`
4. Add garment as child of body scene in `BodyModel.tsx` or `Preview3D.tsx`
5. Add toggle button to show/hide garment
6. Handle loading errors gracefully (body still renders if garment fails)

**Estimated effort (if asset exists):** 3-4 hours

---

## Budgeting & Suggestions: Read-Only Analysis (Task B STEP 5)


### Current Budget Data Location

**Storage:** Device-side (AsyncStorage)  
**Format:** JSON array per project  
**Context:** ProjectsContext manages budget items  
**Type:** `src/types/projects.ts:48` (BudgetLineItem interface)

**Fields stored:**
```typescript
{
  budget_item_id: string;      // UUID
  project_id: string;           // Links to Project
  description: string;          // User-entered text
  estimated_cost: number;       // User's estimate
  actual_cost: number | null;   // After purchase
  is_complete: boolean;         // Whether purchased
}
```

**Data flow:**
1. User creates project → empty budget array initialized
2. User manually adds budget items (description + estimated cost)
3. User marks items complete → sets actual_cost
4. ProjectDashboardScreen displays total estimated vs actual

**No AI/ML:** Budget items are 100% user-entered. No automated cost estimation exists.

### What Budgeting AI Would Need

**Input data required:**
- `character_variant_id` (which character/costume)
- `missing_components[]` (from attire matcher output)
- `user_location` (for shipping cost estimation, optional)
- `marketplace_price_history` (historical transaction data from backend)

**Output data:**
- `estimated_costs[]` (per component: min, avg, max price)
- `confidence_intervals[]` (e.g., "80% of wigs for this character cost $20-45")
- `cost_breakdown` (by category: wigs $X, clothing $Y, props $Z)
- `total_range` (min/max total project cost)

**Data source:** Backend `marketplace_transactions` table (if exists) or external marketplace API

**Smallest real AI step:**
1. Backend endpoint `/api/budget/estimate` that queries marketplace transaction history
2. Group transactions by `category` + `title` keywords
3. Return percentile costs (p25, p50, p75) per category
4. No ML model needed yet - simple SQL aggregations
5. Mobile app calls endpoint after matcher runs, pre-fills budget items with estimates

### What Attire Suggestions AI Would Need

**Input data required:**
- `character_variant_id` (target costume)
- `owned_items[]` (what user already has)
- `missing_components[]` (from matcher output)
- `user_budget` (optional spending limit)
- `user_skill_level` (beginner/intermediate/advanced for DIY suggestions)
- `marketplace_active_listings` (current available items for purchase)

**Output data:**
- `suggested_purchases[]` (marketplace listings matching missing components, sorted by match quality + price)
- `diy_suggestions[]` (tutorials/patterns for making missing items)
- `priority_scores[]` (which items to buy/make first based on difficulty + visibility)
- `estimated_effort_hours[]` (time to complete DIY items)

**Data sources:**
1. Marketplace listings (backend database)
2. Matcher missing_items output (Flask API)
3. DIY pattern/tutorial database (external or curated)
4. User skill ratings (from user profile)

**Smallest real AI step:**
1. Flask endpoint `/api/suggest-items` that receives missing_components from matcher
2. Query marketplace listings for matching items (category + color + style keywords)
3. Rank results by: (a) match confidence, (b) price (lower better), (c) seller rating
4. Return top 3 suggestions per missing component
5. Mobile app displays "Suggested Purchases" section in MatchResultsScreen

### Implementation Priority

**Budget AI:**
- Dependency: Marketplace transaction history (BE-7 not built yet per task notes)
- Complexity: Low (SQL aggregations, no ML model)
- Value: Medium (helps users plan spending)
- Effort: 4-6 hours (backend endpoint + mobile integration)
- **Blocker:** Requires completed transactions table to have data

**Suggestions AI:**
- Dependency: Marketplace listings + matcher integration
- Complexity: Medium (keyword matching → ML classifier upgrade later)
- Value: High (direct path from "what I need" to "where to buy it")
- Effort: 6-8 hours (Flask endpoint + marketplace query + mobile UI)
- **Ready to build:** Marketplace listings exist (FE-6 per changelog)

**Recommendation:** Build Attire Suggestions first (simpler, higher value, no transaction history dependency)
