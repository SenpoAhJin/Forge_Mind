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

## 3. "Wearing Sample Attire" Build Plan

### Current State: 3D Body Exists, NO Garment Layer

**What Exists:**
- ✅ **3D Rendering:** `Preview3D.tsx` using react-three-fiber + expo-gl
- ✅ **Base Bodies:** 2 GLB files in `assets/models/` (Male: 1.34 MB, Female: 1.20 MB)
- ✅ **Body Loader:** `BodyModel.tsx` loads GLB via `@react-three/drei/useGLTF`
- ✅ **Body Selection:** `BodyTypeSelector.tsx` + `UserContext.updateBodyType()`
- ✅ **Viewer Integration:** `ThreeDPreview.tsx` wrapper used in screens

**What Does NOT Exist:**
- ❌ **No Garment Meshes:** Zero GLB/glTF files for clothing items (checked `assets/models/` - only 2 body files + 1 JSON)
- ❌ **No Garment Loader:** No code to attach/render garment meshes on body
- ❌ **No Garment Data:** Attire matching returns match labels but no 3D asset references
- ❌ **No Material/Texture System:** Bodies render with default materials only

**How Body Loads:**
1. `BodyModel.tsx:65` receives `bodyType` prop ('male' or 'female')
2. `resolveModelUri()` at line 45 gets asset URI from `Asset.fromModule()`
3. `useGLTF(uri)` at line 66 loads and caches the GLB
4. Returns `<primitive object={gltf.scene} />` - mounts entire scene graph including bones

**Owned Attire Storage:**
- **Table:** `owned_attire` (backend schema)
- **Fields Used for Matching:**
  - `auto_categorized_type` (wig, clothing, footwear, accessory, armor, weapon, prop)
  - `auto_categorized_color` (string)
  - `flexibility_tag` (exact-match-only, close-enough, very-flexible)
- **Missing Field:** No `glb_asset_path` or `model_reference` column

**Attire Match Output (Flask):**
```json
{
  "suggested_outfit": {
    "wig": {
      "item_id": "item001",
      "name": "White Spiky Wig",
      "score": 0.95,
      "confidence": "excellent"
    }
  }
}
```
**Gap:** Match result has no 3D model path - only item metadata

---

### Build Plan: 6 Testable Steps

Each step produces a visible result on a phone.

#### STEP A: Create ONE Sample Garment Asset (Smallest Visible Win)

**Goal:** Show ONE piece of geometry (a simple wig box) on the existing male body

**Tasks:**
1. In Blender: Create simple box mesh sized for wig (e.g. 0.3×0.3×0.2 units), position above head
2. Parent to body's head bone (so it follows head rotation/animation if any)
3. Export as `sample_wig_male.glb` (< 50 KB)
4. Place in `assets/models/garments/`
5. Update `BodyModel.tsx`:
   - Add `garments?: string[]` prop
   - If `garments` includes 'wig', call `useGLTF('../../assets/models/garments/sample_wig_male.glb')`
   - Mount garment scene as child of body scene
6. Update `Preview3D.tsx`: pass `garments={['wig']}` to BodyModel
7. **Test:** Open `Preview3DTestScreen` → see box floating above head

**Exit Criteria:** Wig box visible, stays attached when camera rotates

**Risks:**
- Bone naming mismatch (Blender bone name ≠ GLB bone name)
- Scale mismatch (garment too big/small)
- Position offset (wig not centered on head)

**Mitigation:** Use Blender's GLB preview to verify bone hierarchy before export

---

#### STEP B: Map Match Result → Garment Path

**Goal:** When attire matcher says "wig: exact match", load the wig asset

**Tasks:**
1. Create `src/utils/garmentAssetMapper.ts`:
   ```ts
   export function getGarmentAsset(
     componentType: string,
     bodyType: 'male' | 'female'
   ): string | null {
     const key = `${componentType}_${bodyType}`;
     return GARMENT_ASSETS[key] ?? null;
   }
   
   const GARMENT_ASSETS: Record<string, string> = {
     'wig_male': require('../../assets/models/garments/sample_wig_male.glb'),
     'wig_female': require('../../assets/models/garments/sample_wig_female.glb'),
   };
   ```
2. Update `BodyModel.tsx`:
   - Accept `matchedComponents: MatchComponent[]` prop (from attire match result)
   - For each component with quality 'exact' or 'close', call `getGarmentAsset()`
   - Load all returned GLB paths via `useGLTF`
   - Mount each garment scene
3. Update call sites to pass `matchedComponents` from `computeReadiness()` result

**Test:** Hard-code matchedComponents = [{component_id: 'wig', match_quality: 'exact'}] → wig appears

**Exit Criteria:** Wig shows when match result includes wig component, hidden when not

---

#### STEP C: Add Second Garment Slot (Top/Shirt)

**Goal:** Prove layering works for 2+ garments

**Tasks:**
1. Create `sample_top_male.glb` (simple box parented to spine/chest bone)
2. Add 'top_male' entry to GARMENT_ASSETS map
3. **Test:** matchedComponents = [{...wig}, {...top}] → both visible

**Exit Criteria:** Wig + top both render, no z-fighting or clipping

**Known Risk:** Garments overlap (e.g. top clips through wig). Solution: Adjust bone offsets in Blender or add layer ordering.

---

#### STEP D: Color Tinting (Match Color → Material Color)

**Goal:** Wig matched as "white" shows white, "black" shows black

**Tasks:**
1. Attire match returns `auto_categorized_color` field
2. Update `BodyModel.tsx` garment loader:
   - After loading GLB, traverse `gltf.scene` to find meshes
   - For each mesh with material, set `material.color = new THREE.Color(matchColor)`
3. Add fallback: if color is "unclear" or missing, leave material as-is

**Test:** 
- Match with color="white" → wig renders white
- Match with color="black" → wig renders black

**Exit Criteria:** 3 different colors tested and visually distinct

**Trade-off:** Simple color tint vs texture maps. Start with tint (Step D), add textures later (Step F).

---

#### STEP E: Full 5-Slot Outfit (Wig, Top, Bottom, Footwear, Accessory)

**Goal:** Complete outfit from head to toe

**Tasks:**
1. Create 3 more sample garments: `sample_bottom_male.glb`, `sample_footwear_male.glb`, `sample_accessory_male.glb`
2. Update GARMENT_ASSETS map with all 5 slots
3. Update garmentAssetMapper to handle all component types
4. **Test:** Full match result with 5 components → all 5 render

**Exit Criteria:** 5 distinct garments visible simultaneously, no crashes

---

#### STEP F: Real Garment from Owned Attire (End-to-End)

**Goal:** User's owned item drives what appears on body

**Flow:**
1. User logs owned item via PhotoEntryScreen → stored in OwnedAttire table with `auto_categorized_type='wig'`, `auto_categorized_color='white'`
2. User selects character variant
3. App calls Flask `/api/match` with owned items
4. Flask returns suggested_outfit with wig component
5. Mobile maps component → garment GLB path
6. BodyModel renders body + matched garments
7. **Test on phone:** Log wig → select character → see wig on 3D body

**Exit Criteria:** 
- Owned item with exact match: garment shows
- Owned item with no match: slot empty (shows bare body part)
- Different colors: different tints applied

---

### Technical Decisions

**Q: How to handle missing garment assets?**
A: Graceful degradation - if `getGarmentAsset()` returns null, skip that slot. Body always renders, garments optional.

**Q: Bone parent vs position offset?**
A: Bone parent (Blender) preferred - garments follow body animations automatically. If bones don't match, fall back to manual position offset in Three.js.

**Q: One GLB per garment or multi-garment GLB?**
A: One GLB per garment - easier to swap, smaller files, simpler caching.

**Q: Where do real garment assets come from?**
A: Phase 1 (Steps A-F): Placeholder boxes and simple meshes created in Blender. Phase 2: Replace with real cosplay garment models (TurboSquid, Marvelous Designer, or hand-modeled).

**Q: Male and female variants?**
A: Start with male-only (Steps A-E), duplicate for female in Step F. Bone names may differ between rigs.

**Q: Performance - how many garments before lag?**
A: Target: 5 garments + body = 6 GLBs loaded. Each < 200 KB. Total < 1.5 MB. Test on mid-range Android (target 30 FPS).

---

### Estimated Effort Per Step

| Step | Effort | Blocker Dependencies |
|------|--------|---------------------|
| A - One sample garment | 4 hours | None - can start immediately |
| B - Map match → asset | 3 hours | Step A complete |
| C - Second slot | 2 hours | Step B complete |
| D - Color tinting | 3 hours | Step C complete |
| E - Five slots | 4 hours | Step D complete |
| F - End-to-end with API | 4 hours | Flask matcher connected (current gap) |
| **Total** | **20 hours** (~2.5 days) | |

**Critical Path:** Step F blocked until Flask matcher is connected to mobile (AI item #1 priority).

---

---

## 4. Budgeting and Suggestions: Smallest Real AI Steps

### Budget Data Current State

**Where Budget Lives:**
- **Device:** ProjectsContext manages local budget state
- **Backend Table:** `budget_line_items` exists (schema at `forgemind-backend/src/scripts/seed.ts:443`)
- **Backend API:** ❌ **MISSING** - No CRUD routes for budget_line_items
  - Searched `forgemind-backend/src/**/*.ts` for budget routes: NONE found
  - Projects can't persist budgets to server

**Current Algorithm (Client-Side):**
```typescript
// src/utils/readiness.ts:58-61
const spent = projectBudget.reduce((sum, b) => sum + b.actual_amount, 0);
const statedBudget = project.stated_budget ?? planned;
const budgetHealth = statedBudget > 0 ? 1 - Math.min(1, spent / statedBudget) : 1;
```
- **Input:** planned_amount, actual_amount per line item
- **Output:** budgetHealth score (0-1), budget_utilization percentage
- **Runs:** Pure math on device, no AI

### What Real Budget Suggestions Need

**Minimum AI Input (per project):**
1. **Component list from character variant** (e.g. "wig, jacket, pants, boots, accessory")
2. **User's existing items** (already logged in owned_attire)
3. **Match quality** (from attire matcher) → tells which components need to be purchased
4. **Historical marketplace data:**
   - Average price per component type (e.g. wigs: $30-80 median)
   - Price variance by condition (new vs used)
   - Shipping cost estimates (domestic vs international)
5. **User skill level** (beginner buys more, expert crafts more → affects material costs)
6. **Event deadline** (rush = higher costs for expedited shipping)

**Smallest Real AI Step:**
1. Backend endpoint: `GET /api/projects/:id/budget-estimate`
2. Input: project_id (includes character_id, variant_id, user_id, target_completion_date)
3. Flask service: `POST /api/estimate-budget`
   - Queries: character requirements, user's owned items, match quality
   - Calculates: missing components → marketplace price stats → estimated total
4. Output:
   ```json
   {
     "estimated_total": 15000,
     "currency": "PHP",
     "breakdown": [
       {"component": "wig", "price_range": [2500, 4500], "confidence": "high"},
       {"component": "boots", "price_range": [3000, 6000], "confidence": "medium"}
     ],
     "assumptions": ["used condition", "domestic shipping", "45-day timeline"]
   }
   ```

**Backend Data Requirement:**
- Marketplace listings with prices → compute percentiles per component type
- Minimum: 20 listings per component for meaningful stats
- Current: 6 seed listings total (**insufficient**)
- **Blocker:** Real budget estimates blocked until marketplace has volume

---

### What Attire Suggestions Need

**Flow:**
1. Attire matcher returns `missing_items: ["boots", "accessory"]`
2. Query marketplace: `GET /marketplace/listings?category=footwear&post_type=sell&status=active`
3. Filter by character tags (e.g. "black", "combat boots" from variant requirements)
4. Rank by:
   - **Relevance:** color/style match to requirements (use same scoring as attire matcher)
   - **Price:** prefer items within user's stated budget
   - **Seller rating:** prefer verified sellers with good history (future - not implemented)
   - **Location:** prefer local (shipping cost/time lower)
5. Return top 3-5 suggestions per missing component

**Smallest Real AI Step:**
1. Backend endpoint: `GET /api/projects/:id/attire-suggestions`
2. Input: project_id
3. Backend queries:
   - Get project's character variant requirements
   - Call Flask `/api/match` to get missing_items
   - For each missing component:
     - Query marketplace with filters
     - Score listings using simplified attire matcher logic
     - Sort by composite score (relevance × budget fit × seller quality)
4. Output:
   ```json
   {
     "suggestions": {
       "boots": [
         {
           "listing_id": "...",
           "title": "Black Combat Boots Size 9",
           "price": 3500,
           "match_score": 0.85,
           "reason": "Color and style match requirements"
         }
       ]
     }
   }
   ```

**Dependencies:**
- Attire matcher connected (Step 1 priority)
- Marketplace has listings with proper categories/tags
- Variant requirements include detailed color/style metadata

**Blocker:** Suggestions blocked until attire matcher connected to mobile

---

**Last Updated:** October 14, 2026  
**Status:** STEP 1 COMPLETE - Initial inventory recorded  
**Status:** STEP 2 COMPLETE - Connection map added  
**Status:** STEP 3 COMPLETE - Attire-wearing build plan (6 steps, A-F)  
**Status:** STEP 4 COMPLETE - Budget/suggestions real AI steps documented
