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

**Status:** MOCK (Word list, NOT ML)  
**Evidence:**
- Utils: `src/utils/listingScreener.ts:1` (BLOCKLISTED_TERMS array)
- Comments: Lines 5-10 document "THIS IS A MOCK RULE-BASED SCREENER for Phase 1"

**Where it runs:** Device (TypeScript substring matching)  
**App screens:** MarketplaceCreateListingScreen (at post time)  
**Connection status:** ⚠️ MOCK - Uses hard-coded word list, not logistic regression or ML classifier

**Current implementation:**
- Case-insensitive substring match against BLOCKLISTED_TERMS (48 terms)
- Categories checked: weapons, drugs, adult content, hate speech, counterfeit, animals
- Known limitation: "substring match will block legitimate cosplay listings containing blocked words (e.g. 'prop gun replica')"

**Real AI screener:**
- Input: listing title, description, category, photo embeddings
- Output: permitted/blocked classification, confidence score, flagged categories
- Model: Logistic regression OR neural classifier trained on labeled marketplace data
- Training data: permitted cosplay listings vs blocked listings (weapons, drugs, adult, etc.)

**Smallest viable step:** Backend endpoint `/marketplace/listings/screen` that runs same word-list check server-side (no ML yet, but centralized for future ML upgrade)

---

### 6. Photo Categorization (Auto-tag uploaded listing photos)

**Status:** MISSING  
**Evidence:** No implementation found

**Where it should run:** Flask (image classification model) OR Backend (if using external API)  
**App screens:** Would integrate into MarketplaceCreateListingScreen photo upload flow  
**Connection status:** ❌ NOT BUILT

**What it needs:**
- Input: uploaded photo (base64 or file path)
- Output: detected category (wig, costume, prop, shoes, accessories), confidence score
- Model: CNN image classifier (ResNet, MobileNet, or fine-tuned on cosplay items)
- Training data: labeled photos of cosplay items by category

**Smallest viable step:** Add "Suggest Category" button on photo upload that calls Flask `/api/categorize-photo` endpoint and pre-fills category dropdown

---

### 7. Voice Input / Transcription (Voice-to-text for item descriptions)

**Status:** MISSING  
**Evidence:** No implementation found

**Where it should run:** Device (expo-speech-recognition or external API like Whisper)  
**App screens:** Would integrate into any text input (marketplace descriptions, project notes, chat)  
**Connection status:** ❌ NOT BUILT

**What it needs:**
- Input: audio recording (WAV, MP3, or stream)
- Output: transcribed text
- Library options: expo-speech-recognition (device), OpenAI Whisper API (cloud), Google Speech-to-Text
- Privacy: Device-side preferred for sensitive notes; cloud OK for marketplace descriptions

**Smallest viable step:** Add microphone icon to MarketplaceCreateListingScreen description field that records 30sec audio, sends to Whisper API, fills textarea with transcript

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

_This section populated in STEP 3_

