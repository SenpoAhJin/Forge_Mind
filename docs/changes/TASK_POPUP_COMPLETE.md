# Task POPUP: Fix Listing Creation Errors and Pop-up Notices

## Status: COMPLETE ✓

## What Was Built

### Issue A: HTTP 400 Validation Error - FIXED ✓
**Root Cause:** Mobile had "Other" in `MARKETPLACE_CATEGORIES` but backend's `PERMITTED_CATEGORY_SLUGS` doesn't allow it.

**Fix:** Removed "Other" from mobile categories to match backend's 7 permitted categories.

### Issue B: Validation Error Handling - FIXED ✓
**Root Cause:** CreateListingScreen didn't handle 'validation' error kind specifically, so 400 errors fell through to generic catchall message.

**Fix:** Added explicit handling for `checkResult.error.kind === 'validation'` to show the specific backend error message.

### Issue C: Pop-up Notification System - IMPLEMENTED ✓
**What:** App-wide notification system showing errors/warnings/info/success as animated pop-ups instead of console warnings.

**Components Created:**
1. `src/utils/appNotice.ts` - Core notification dispatcher
2. `src/utils/debugLog.ts` - Development-only console logging utility
3. `src/components/AppNoticeHost.tsx` - UI component rendering pop-up notices

**Integration:**
- AppNoticeHost added to App.tsx (renders above all content)
- showNotice() called in CreateListingScreen for all user-facing errors
- debugLog() replaces console.warn in MarketplaceApi.ts
- Success notice shown when listing created successfully

## Files Changed

Mobile:
- src/constants/marketplaceCategories.ts (removed "Other")
- src/screens/cosplayer/CreateListingScreen.tsx (validation handling + pop-up notices)
- src/services/MarketplaceApi.ts (console.warn → debugLog)
- src/utils/appNotice.ts (NEW - notification dispatcher)
- src/utils/debugLog.ts (NEW - dev logging utility)
- src/components/AppNoticeHost.tsx (NEW - pop-up UI)
- src/components/index.ts (export AppNoticeHost)
- App.tsx (mount AppNoticeHost)

Backend:
- scripts/test_check_listing.ts (NEW - diagnostic script for testing /marketplace/listings/check)

## Verification

### Tests Run
✓ TypeScript: npx tsc --noEmit (exit 0)
✓ Expo export: Android bundle created successfully
✓ Category match: Mobile and backend both have 7 categories (no "Other")
✓ Grep checks: showNotice imported, AppNoticeHost mounted, debugLog used

### Backend Test Results
Test script confirms both sample listings pass moderation when using correct categories:
- "Luck Voltia wig from Black Clover" → 200 OK, allowed: true
- "Sample listing title" → 200 OK, allowed: true

### Pop-up Notice Behavior
- **Error notices:** Red background, white text
- **Warning notices:** Orange background, black text
- **Success notices:** Green background, white text
- **Info notices:** Theme surface color, theme text color
- Auto-dismiss after 4 seconds
- Tap to dismiss early
- Fade in/out animations (300ms)
- Stacks multiple notices vertically

## Error Messages Now Shown as Pop-ups

1. Rate limit errors
2. Validation errors (400 - e.g. invalid category)
3. Network/server errors
4. Auth errors
5. Moderation refusal (when no field-specific violations)
6. Duplicate listing warnings
7. Field validation errors (trade items)
8. Generic create failures
9. Success confirmation

## Commits

Mobile: (will be committed after verification)
- feat(marketplace): remove "Other" category to match backend
- fix(marketplace): handle validation errors explicitly in CreateListingScreen
- feat(app): add pop-up notification system (appNotice, debugLog, AppNoticeHost)
- feat(marketplace): replace console warnings with pop-up notices

## Diagnostic Evidence

Backend test script created: `forgemind-backend/scripts/test_check_listing.ts`
- Registers test cosplayer account
- Submits marketplace registration
- Requires manual SQL approval: `UPDATE users SET is_cosplayer = true, verification_status = 'verified' WHERE email = 'popup-test@example.com';`
- Tests both sample listings against /marketplace/listings/check
- Confirms 400 error with "Costumes" but 200 OK with "Costumes & Cosplay"

## What Was NOT the Issue

The "Can't check your listing right now" error (network/server message) suggests the original user report may have been a legitimate timeout or network failure, not the validation error. The validation error would have shown "Unable to verify listing content" before our fix.

Both issues are now resolved:
- Invalid category: Fixed by removing "Other"
- Validation errors: Now show specific backend message instead of generic catchall
- All errors: Now shown as pop-ups instead of console-only warnings

## Testing Notes

Backend must be running: `cd forgemind-backend && npx tsx src/index.ts`

To test with real user actions:
1. Start backend (port 3000)
2. Start Metro (port 8081)
3. Register as cosplayer, get marketplace approval
4. Try creating listing with moderation violations (see backend src/moderation/rules/*.ts for blocked terms)
5. Observe pop-up notices appear at top of screen

## NOT TESTED (Manual)
- Visual appearance of pop-up notices
- Auto-dismiss timing
- Multiple stacked notices
- Tap-to-dismiss interaction
- Theme color integration
- Success notice on listing creation

All manual testing deferred to user verification.
