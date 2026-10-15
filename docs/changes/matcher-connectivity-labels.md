# Matcher Connectivity and Label Verification (D4 Step 4)

**Date:** 2026-10-15  
**Status:** Verified flow, documented gaps

## Connectivity Status

### Mobile → Backend → Flask

**Path:** `AiMatcherService.requestMatch()` → `POST /ai/matcher/suggest-outfit` → Flask `http://localhost:5000/api/attire-matcher/suggest`

**Connected:** YES (session-only auth, no marketplace verification)

**Evidence:**
- `forgemind-mobile/src/services/AiMatcherService.ts:22-60` transforms OwnedAttire → backend request
- `forgemind-backend/src/ai/matcherRouter.ts:138-188` proxies to Flask with 8s timeout
- `forgemind-ai/src/api.py:218-248` Flask endpoint receives request, calls `attire_matcher.py`

### Backend Route Status

**Route:** `/ai/matcher/suggest-outfit` (POST)  
**Middleware:** `requireSession` only (no marketplace verification)  
**Validation:** character/variant/slot IDs (regex `^[a-z0-9][a-z0-9_-]{0,100}$`), max 100 items  
**Timeout:** 8000ms  
**Error mapping:**
- Flask 404 → Backend 404 "character variant not found"
- Flask timeout/crash → Backend 503 "matcher service unavailable"
- Flask 500 → Backend 502 "bad response from matcher"

### Mobile API Base URL

**Source:** `forgemind-mobile/src/config/api.ts` (exports `API_BASE_URL`)  
**Resolution order:** (from `apiBaseUrl.ts`)
1. `EXPO_PUBLIC_API_URL` env var (if set)
2. `hostUri` from Expo dev server (native only, e.g. `192.168.1.5:8081`)
3. Fallback: `http://localhost:3000` (web), `http://10.0.2.2:3000` (Android emulator)

**Usage:** All services import `API_BASE_URL` from `config/api.ts`, never hardcode URLs

## Data Field Sources

### 1. `auto_categorized_type/color/style`

**Source:** Mock categorization (NOT real AI)

**Files:**
- `forgemind-mobile/src/utils/mockCatalog.ts` (functions: `mockTextCategorization`, `mockPhotoCategorization`)
- Uses pattern matching on `original_input_text` or random selection for photo input
- Writes to `OwnedAttire` fields when user adds attire (voice or photo)

**Status:** Mock-only. Real AI categorization service NOT implemented.

### 2. Voice Transcript (`original_input_text`)

**Source:** Frontend voice input (user records audio describing attire)

**Processing:**
- User speaks → mobile records audio → speech-to-text API → `original_input_text`
- Stored in `OwnedAttire.original_input_text`
- Used by mock categorization to guess type/color/style

**Status:** Speech-to-text integration NOT verified (not part of matcher scope).

### 3. Budgeting Computation

**NOT IMPLEMENTED.** No budget tracking exists in mobile or backend.

**Note in code:** `forgemind-mobile/src/types/owned-attire.ts` defines `price_paid_php` field (nullable) but no aggregation or budget logic exists.

## Label Verification

### Observed Labels (confirmed in test output)

**Item confidence:**
- `excellent` (≥0.9)
- `good` (≥0.75)
- `no-match` (<0.4)

**Overall quality:**
- `excellent` (≥0.85)
- `good` (≥0.7)
- `incomplete` (<0.5)
- `no-matches` (all items <0.4)

### Unverified Labels (defined but not seen)

**Item confidence:**
- `fair` (≥0.6)
- `poor` (≥0.4)

**Overall quality:**
- `acceptable` (≥0.5)

**Evidence:** `forgemind-ai/src/attire_matcher.py:196-205, 329-341`

### Test Coverage Needed

To verify `fair`/`poor`/`acceptable`:
- Create test case with item score 0.6-0.74 (should get "fair")
- Create test case with item score 0.4-0.59 (should get "poor")
- Create test case with overall score 0.5-0.69 (should get "acceptable")

## GAPS Identified

1. **No real AI categorization** - mock pattern matching only
2. **Speech-to-text integration unverified** - `original_input_text` source unclear
3. **No budgeting logic** - `price_paid_php` unused
4. **11 unmapped variants** - 91.7% of mobile variants return 404
5. **5 Flask files unreachable** - Asta/Luck/Raiden/Spider-Man not in mobile catalog
6. **Labels incomplete** - 3 label values untested (fair, poor, acceptable)
