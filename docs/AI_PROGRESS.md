# AI/ML Features Progress Tracker
**Created:** October 14, 2026  
**Repos:** forgemind-mobile (feature/chat-app), forgemind-backend (feature/chat-curated-terms), forgemind-ai  
**Purpose:** Track implementation status of all 7 AI/ML features in ForgeMind

---

## Feature Inventory

### 1. Attire Matching (Character components → Owned items)

**Status:** BUILT (Flask) + MOCK (Mobile)  
**Evidence:**
- Flask API: `forgemind-ai/src/api.py:26` (`/api/match` endpoint)
- Flask Matcher: `forgemind-ai/src/attire_matcher.py` (core matching logic)
- Mobile Screen: `src/screens/cosplayer/MatchResultsScreen.tsx:1` (MOCK DATA - hard-coded results)

**Where it runs:** Flask (Python ML service)  
**App screen:** MatchResultsScreen (cosplayer flow)  
**Connection status:** ❌ **NOT CONNECTED** - Mobile uses hard-coded MOCK_MATCH_RESULTS, does not call Flask API

**Input fields (Flask expects):**
- `character_variant_id` (string)
- `owned_items` (array of objects with: id, name, category, subcategory, color, tags)
- `user_body_settings` (optional: height, size)

**Output labels (Flask returns):**
- `suggested_outfit` (object with item_id, name, score, confidence per slot)
- `alternatives` (array of alternative matches)
- `missing_items` (array of missing components)
- `match_quality` (overall_score, quality_label)

**Gap:** Mobile app needs to:
1. Call Flask `/api/match` endpoint instead of using MOCK_MATCH_RESULTS
2. Pass owned_items from OwnedAttireContext
3. Handle Flask response shape (currently expects hard-coded array)

---

### 2. Attire Suggestions (AI-recommended items to buy/make)

**Status:** MISSING  
**Evidence:** No implementation found in any repo

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

**Status:** MOCK (Device-side JSON)  
**Evidence:**
- Data: `src/data/budget_items.json` (hard-coded budget line items)
- Type: `src/types/projects.ts:48` (BudgetLineItem interface)
- Context: Uses ProjectsContext to store budget items per project

**Where it runs:** Device (JSON file, no AI/ML)  
**App screens:** ProjectDashboardScreen, BudgetScreen (if exists)  
**Connection status:** ⚠️ MOCK - Uses static JSON, no ML forecasting

**Current budget data (per project):**
- `budget_item_id` (string)
- `project_id` (string)
- `description` (string)
- `estimated_cost` (number)
- `actual_cost` (number | null)
- `is_complete` (boolean)

**Real AI would need:**
- Input: character_variant_id, owned_items (what's already available), user location (shipping costs)
- Output: estimated total cost, cost breakdown by component, confidence intervals
- Training data: marketplace transaction history, component costs over time, build complexity

**Smallest viable step:** Call Flask endpoint with missing components from matcher, return estimated costs based on marketplace price history

---

### 4. Readiness Forecast (Project completion prediction)

**Status:** BUILT (Device-side calculation, NOT ML-based)  
**Evidence:**
- Utils: `src/utils/readiness.ts:1` (computeReadiness function)
- Utils: `src/utils/readinessAggregate.ts:1` (computeEventReadinessAggregate for organizers)
- Screen: `src/screens/organizer/EventDetailScreen.tsx:44` (Group Readiness display)
- Screen: `src/screens/cosplayer/ProjectDashboardScreen.tsx` (individual readiness)

**Where it runs:** Device (TypeScript calculation, no ML)  
**App screens:** ProjectDashboardScreen (cosplayer), EventDetailScreen (organizer aggregate)  
**Connection status:** ✅ BUILT - But uses simple percentage calculation, not ML forecasting

**Current readiness calculation:**
```
readiness = (matched_components + obtained_components) / total_required_components
```

**Real AI forecasting would add:**
- Input: current readiness %, days until event, user build velocity (tasks completed/week), budget spent vs total
- Output: predicted completion date, confidence interval, risk factors (low velocity, tight budget, complex builds)
- Training data: historical project timelines, task completion rates, budget overruns

**Smallest viable step:** Add "Predicted Completion Date" to ProjectDashboardScreen using simple linear extrapolation from task velocity (tasks_completed / days_elapsed * days_remaining)

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

## Summary Counts

| Feature | Status | Evidence Location | Runs On | Connected |
|---------|--------|------------------|---------|-----------|
| Attire Matching | BUILT + MOCK | Flask: `forgemind-ai/src/api.py:26`<br/>Mobile: `MatchResultsScreen.tsx:27` | Flask | ❌ No |
| Attire Suggestions | MISSING | N/A | N/A | ❌ No |
| Budgeting | MOCK | `src/data/budget_items.json` | Device | ⚠️ Static JSON |
| Readiness Forecast | BUILT | `src/utils/readiness.ts:1` | Device | ✅ Yes (simple calc) |
| Listing Screener | MOCK | `src/utils/listingScreener.ts:16` | Device | ⚠️ Word list |
| Photo Categorization | MISSING | N/A | N/A | ❌ No |
| Voice Transcription | MISSING | N/A | N/A | ❌ No |

**BUILT:** 1 (attire matching Flask backend)  
**PARTIAL/MOCK:** 3 (attire matching mobile, budgeting, screener, readiness simple)  
**MISSING:** 3 (suggestions, photo categorization, voice)

---

## Connection Map

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

---

## Wearing: Audit (Task B STEP 3)

### Body GLB Loading

**File:** `src/components/BodyModel.tsx:5`  
**Method:** `useGLTF` from `@react-three/drei`  
**Assets:**
- Male: `assets/models/3D_Model_Male.glb` (1.4 MB)
- Female: `assets/models/3D_Model_Female.glb` (1.3 MB)

**Loading logic:**
1. `resolveModelUri()` converts Metro asset ID to URI via `expo-asset`
2. `useGLTF(uri)` loads and caches the GLB
3. Component returns `<primitive object={gltf.scene} />` (whole scene, not just mesh)
4. Skinned mesh + bone hierarchy must stay together in scene graph

**Key constraint:** BodyModel renders the entire `gltf.scene` as a primitive. To add a garment, it must be:
- Loaded as a separate GLB via another `useGLTF` call, OR
- Added as a child of the body scene after loading

### Garment Assets Available

**Search performed:** Recursive search for `.glb`, `.gltf`, `.fbx`, `.obj` in forgemind-mobile  
**Result:** ❌ **NO GARMENT ASSETS EXIST**

**Files found:**
1. `assets/models/3D_Model_Male.glb` (1403512 bytes)
2. `assets/models/3D_Model_Female.glb` (1253432 bytes)
3. `assets/models/body_size_bone_scale.json` (deprecated, slider removal)
4. `assets/models/README.md` (documentation)

**Conclusion:** No wig, clothing, or prop GLB files exist in the repo.

### Owned Attire Storage Format

**Type definition:** `src/types/owned-attire.ts:35` (OwnedAttire interface)  
**Storage:** AsyncStorage at `@forgemind:owned_attire` (device-side JSON)  
**Context:** OwnedAttireContext provides `items: OwnedAttire[]`

**Key fields (relevant to wearing):**
- `attire_id` (string, UUID)
- `auto_categorized_type` (AttireCategory enum: wig, clothing, footwear, accessory, armor, weapon, prop, fabric, material, other)
- `auto_categorized_color` (string, hex color)
- `auto_categorized_style` (string, freeform description)
- `photo_urls` (array of strings, user-uploaded photos)
- `availability_status` ('free' | 'committed')
- `committed_to_project_id` (string | null)

**Gap:** OwnedAttire stores metadata but NO 3D model path. The `photo_urls` field contains 2D photos only, not GLB/GLTF files.

### Flask Matcher Output

**Endpoint:** `/api/match` in `forgemind-ai/src/api.py:26`  
**Output fields (relevant to garment selection):**
```json
{
  "suggested_outfit": {
    "wig": { "item_id": "item001", "name": "White Spiky Wig", "score": 0.95, "confidence": "excellent" },
    "clothing": { ... },
    "footwear": { ... }
  },
  "alternatives": { "wig": [...], "clothing": [...] },
  "missing_items": [],
  "match_quality": { "overall_score": 0.9, "quality_label": "excellent" }
}
```

**What it provides:** Item ID + category (wig, clothing, etc.) from owned items  
**What it does NOT provide:** 3D model path or GLB reference

### Precondition Check

**Precondition (a):** A garment asset exists in GLB format  
**Result:** ❌ **FAILED** - No garment GLB files found

**Precondition (b):** Body loader can accept a second mesh without changes to body files  
**Result:** ✅ **MET** - BodyModel uses `<primitive object={gltf.scene} />`, so a garment GLB loaded via another `useGLTF` call can be added as a sibling or child in the same scene

### BLOCKER: Wearing Feature Cannot Be Built

**Reason:** No garment 3D assets exist in the repository.

**What is needed from user:**
1. **Format:** GLB or GLTF (same format as body models, compatible with `useGLTF`)
2. **Content:** At least one sample garment (wig recommended as simplest test case)
3. **Rig requirement:** NO rigging needed if garment is static (e.g., wig, hat, prop). If clothing needs to deform with body (e.g., shirt, pants), garment must be skinned to same bone names as body rig
4. **Placement:** `forgemind-mobile/assets/models/garments/` directory (to be created)
5. **File naming:** Descriptive, e.g., `Wig_White_Spiky.glb`, `Shirt_Black_TShirt.glb`
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
