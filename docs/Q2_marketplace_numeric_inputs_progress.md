# Task Q2: Marketplace Numeric Input Validation & Server Error Handling

## Goal
Make every number field accept only numbers (digits only, no letters), and show the server's quality, duplicate, and moderation rejection messages properly.

## Background
- Number fields let users type letters and were only rejected on submit
- Backend now rejects: non-number values, amounts above ₱200,000, more than 2 decimals
- Backend returns: 422 listing_quality (field errors), 409 duplicate_listing, generic moderation rejection

## Status: ✅ COMPLETE

### Commits
- 5f64ad7: feat(marketplace): add numeric input sanitizers and field limits
- 98e672f: feat(marketplace): handle server error messages (quality, duplicate, moderation)

### Step 0: State Check ✓
- Mobile HEAD: 98e672f
- Backend HEAD: d2892fd
- Mobile tsc: exit 0
- Backend: not running (not required for this task)
- Q1 status: IN PROGRESS (Step 2g language blocking next)

### Step 1: Field Inspection & Table ✓
Found 5 numeric input fields across CreateListingScreen and MakeOfferScreen:

| Field | File:Line | keyboardType/inputMode | filters | text→number | "12abc"→ | empty→ |
|-------|-----------|------------------------|---------|-------------|----------|--------|
| price (Create) | CreateListingScreen.tsx:415 | numeric/decimal | sanitizeDecimalInput | Number | "12" | "" |
| offer price | MakeOfferScreen.tsx:317 | numeric/decimal | sanitizeDecimalInput | Number | "12" | "" |
| trade est value | MakeOfferScreen.tsx:368 | numeric/decimal | sanitizeDecimalInput | Number | "12" | "" |
| budget | MakeOfferScreen.tsx:390 | numeric/decimal | sanitizeDecimalInput | Number | "12" | "" |
| timeline | MakeOfferScreen.tsx:389 | number-pad/numeric | sanitizeIntegerInput | Number | "12" | "" |

### Step 2: Sanitizers & Limits ✓
Created:
- `src/utils/numericInput.ts`: sanitizeDecimalInput, sanitizeIntegerInput
- `src/utils/marketplaceLimits.ts`: MAX_AMOUNT_PHP=200000, MAX_DECIMALS=2

Behavior:
- sanitizeDecimalInput: removes non-digits except single decimal point, strips leading zeros (keeps "0." forms), limits to maxDecimals and maxDigits
- sanitizeIntegerInput: removes all non-digits, strips leading zeros, limits maxDigits
- Applied to all onChangeText handlers
- keyboardType: "numeric" for all (decimal-pad not in Input component types)
- inputMode: "decimal" for money, "numeric" for integers (web support)
- Conversion: Number() on sanitized text only, never parseFloat/parseInt on raw text
- Inline message: shows when value exceeds MAX_AMOUNT_PHP

### Step 3: Server Error Handling ✓
Updated MarketplaceApi:
- Added `fieldErrors?: Record<string, string>` to ApiResponse interface
- createListing maps:
  - 422 listing_quality → return { success: false, fieldErrors, error }
  - 409 duplicate_listing → return { success: false, error }
  - 422 content_rejected → return { success: false, error: generic message }

Updated MarketplaceContext:
- createListing return type includes fieldErrors
- Passes through fieldErrors from API response

Updated CreateListingScreen:
- Imported ConfirmationModal
- Added duplicateModalVisible, duplicateMessage state
- Error handling checks result.fieldErrors and sets per-field errors
- Duplicate messages (containing "duplicate" or "already exists") show in ConfirmationModal
- Other errors show in globalError text

### Step 4: Verification Checks ✓
✅ tsc exit 0
✅ tsx test script: all sanitizers work correctly on test inputs (12abc→"12", abc→"", 1,234.567→"1234.56", etc.)
✅ expo export exit 0 (web build succeeded)
✅ Alert.alert count: 0 in marketplace screens (DiagnosticsScreen, ShareableCardScreen, and organizer screens have legacy usage - not in scope)
✅ && <Text count: 0
✅ parseFloat/parseInt on text fields: 0 in marketplace (found in project budgets, dates - different context)
✅ console.log in text fields: 0 (debug logs in contexts/navigation only)
✅ @react-navigation in src/contexts and src/services: 0

### Step 5: Documentation ✓
- Progress file: this document
- CHANGELOG.md: entry added
- Temporary files: test-sanitizers.tsx deleted
- Expo check folder: deleted

## Files Changed

### Created
- forgemind-mobile/src/utils/numericInput.ts
- forgemind-mobile/src/utils/marketplaceLimits.ts

### Modified
- forgemind-mobile/src/services/MarketplaceApi.ts
- forgemind-mobile/src/contexts/MarketplaceContext.tsx
- forgemind-mobile/src/screens/cosplayer/CreateListingScreen.tsx
- forgemind-mobile/src/screens/cosplayer/MakeOfferScreen.tsx

## NOT TESTED (Manual Testing Required)
- Typing letters in price/budget/timeline fields (should be filtered out)
- Entering "12abc" becomes "12" live while typing
- Entering "0.999" rounds to "0.99" (2 decimals max)
- Entering amount > ₱200,000 shows inline warning
- Server 422 listing_quality response shows field-specific errors under title/description
- Server 409 duplicate_listing shows ConfirmationModal with duplicate message
- Server 422 content_rejected shows generic error message
- Empty price field is treated as missing (not 0)
- All numeric keyboards show correct type (decimal for money, numeric for days)
- Web inputMode attribute works correctly

## Next Steps
Continue with Q1 (verification pipeline) - currently blocked at Step 2g (language picker implementation).
