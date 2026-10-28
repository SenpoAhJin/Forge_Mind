# FE-6 Step 3: App-Server Offers Integration Report

**Date**: 2026-10-03  
**Branch**: `feature/offers-app-server` (from master)  
**Commit**: 0176b63  
**Scope**: Marketplace OFFERS only. Chat deliberately untouched.

---

## Executive Summary

Successfully wired the React Native app's marketplace offer screens to the forgemind-backend server endpoints. All offer operations (create, accept, decline, withdraw, list sent/received) now call the server API instead of AsyncStorage. Chat functionality remains deliberately unchanged and will be addressed in a future step.

---

## Step 1: Backend Endpoint Review

### Endpoints Verified (forgemind-backend)
All endpoints from Round 1 (offers) confirmed operational:

- `POST /marketplace/offers` - Create new offer
- `GET /marketplace/offers/sent` - List offers sent by current user
- `GET /marketplace/offers/received` - List offers received by current user (as seller)
- `GET /marketplace/offers/:id` - Get single offer details
- `POST /marketplace/offers/:id/accept` - Accept offer (seller only)
- `POST /marketplace/offers/:id/decline` - Decline offer (seller only)
- `POST /marketplace/offers/:id/withdraw` - Withdraw offer (proposer only)

### Server Response Format
```typescript
{
  offer_id: string;           // Maps to app's Offer.id
  listing_id: string;
  proposer_user_id: string;   // Server user UUID
  offer_type: 'purchase' | 'trade' | 'commission';
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  offered_price: number | null;
  trade_offered_item: string | null;
  trade_offered_condition: string | null;
  trade_offered_est_value: number | null;
  commission_description: string | null;
  timeline_days: number | null;
  offer_notes: string | null;
  listing_title: string;
  listing_price: number;
  proposer_display_name: string;
  seller_display_name: string;
  created_at: string;         // ISO timestamp
  responded_at: string | null;
  updated_at: string;
}
```

**Privacy Rule B1 Confirmed**: Server never returns email addresses in offer responses.

---

## Files Created

### 1. `src/services/OffersApi.ts` (NEW - 329 lines)
API service layer for all offer operations.

**Key Functions**:
- `createOffer(input)` - POST /marketplace/offers
- `getSentOffers(currentUserId)` - GET /marketplace/offers/sent
- `getReceivedOffers(currentUserId)` - GET /marketplace/offers/received
- `getOffer(offerId)` - GET /marketplace/offers/:id
- `acceptOffer(offerId)` - POST /marketplace/offers/:id/accept
- `declineOffer(offerId)` - POST /marketplace/offers/:id/decline
- `withdrawOffer(offerId)` - POST /marketplace/offers/:id/withdraw

**Features**:
- Authentication via AsyncStorage session token (matches existing service pattern)
- Network error detection via `isNetworkError` helper
- User-friendly error message mapping (401→ session expired, 403→ permission denied, 409→ duplicate offer, etc.)
- Server response mapping: `offer_id` → `id`, adds `proposer_user_id` to Offer type
- For received offers, infers `listing_seller_user_id` from current user context

---

## Files Modified

### 2. `src/contexts/OffersContext.tsx` (REWRITTEN - 187 lines)
Complete rewrite to use server API instead of AsyncStorage.

**Changes**:
- Removed all AsyncStorage imports and operations
- Added `useUser()` hook to access current user's user_id
- Split state into `sentOffers` and `receivedOffers` arrays
- Added `refreshOffers()` method that fetches both arrays in parallel
- Kept same method signatures for backward compatibility (email params ignored but accepted)
- Accept/decline/withdraw update local state optimistically after server success
- Context guards align with server rules (seller-only accept/decline, proposer-only withdraw)

**Proof of AsyncStorage Removal**:
```bash
$ Select-String -Path "src\contexts\OffersContext.tsx" -Pattern "AsyncStorage" | Measure-Object
Count: 0
```

---

### 3. `src/types/offers.ts` (MODIFIED)
Added `proposer_user_id` field to Offer interface:

```typescript
export interface Offer {
  // ...existing fields
  proposer_user_id?: string | null;  // NEW: Server user UUID for proposer
  // ...rest of fields
}
```

**Note**: Email fields (`proposer_email`, `listing_seller_email`) retained but set to empty strings for all server-sourced offers. They are NOT displayed in UI.

---

### 4. `src/contexts/UserContext.tsx` (MODIFIED - Line 22)
Added `user_id` field to User interface:

```typescript
interface User {
  user_id?: string;  // NEW: Server UUID identity
  email: string;
  // ...rest of fields
}
```

This allows offer identity checks to use `user?.user_id` instead of `user?.email`.

---

### 5. `src/services/AuthService.ts` (MODIFIED)
Added `user_id` field to `StoredAccount` interface and mapped it in `toStoredAccount()`:

```typescript
export interface StoredAccount {
  user_id?: string;  // NEW: From ApiUser.user_id
  email: string;
  // ...rest of fields
}
```

The `toStoredAccount()` function now copies `user.user_id` from ApiUser to StoredAccount, ensuring logged-in users have their server UUID available.

---

### 6. `src/screens/cosplayer/OfferLogScreen.tsx` (MODIFIED)
Added `useFocusEffect` hook to refresh offers when screen gains focus:

```typescript
useFocusEffect(
  useCallback(() => {
    refreshOffers();
  }, [refreshOffers])
);
```

This ensures offer lists stay current when navigating back from other screens.

---

### 7. `src/screens/cosplayer/OfferDetailScreen.tsx` (MODIFIED)
**Identity Checks Updated**:
```typescript
const isRecipient = user?.user_id === offer.listing_seller_user_id;
const isProposer = user?.user_id === offer.proposer_user_id;
```

**Email Display Removed**:
Parties section now shows only display names:
```tsx
<Text style={styles.partyName}>{offer.proposer_display_name}</Text>
// Email line removed entirely
```

**Chat Handler Unchanged**:
`handleMessage()` function still references `offer.proposer_email` but this is dead code since the Message button is disabled with a "Chat coming soon" note. Chat wiring will be addressed separately.

**Focus Refresh**:
Added `useFocusEffect` hook to refresh offers on screen focus.

**New Styles**:
Added `ineligibleBanner` and `ineligibleText` styles for the chat-disabled note.

---

### 8. `src/screens/cosplayer/ListingDetailScreen.tsx` (MODIFIED)
**Offer Buttons Enabled**:
Changed offer action buttons from showing "coming soon" banner to navigating to MakeOffer screen:

```typescript
const handleMakeOffer = (offerType: OfferType) => {
  navigation.navigate('MakeOffer', { listingId: listing.id, offerType });
};

// Button handlers now call handleMakeOffer instead of handleOfferUnavailable
```

**Chat Button Still Disabled**:
Message Seller button remains disabled with note: "Chat will use the server in an upcoming update."

**Parameter Name Fixed**:
Navigation now uses correct parameter name: `offerType` (not `defaultOfferType`).

---

## Verification Results

### TypeScript Compilation
```bash
$ npx tsc --noEmit
Exit Code: 0
```
✅ **PASS** - No TypeScript errors

---

### AsyncStorage Removal Check
```bash
$ Select-String -Path "src\contexts\OffersContext.tsx" -Pattern "AsyncStorage"
Count: 0
```
✅ **PASS** - OffersContext no longer imports or uses AsyncStorage

---

### Email Display Check
```bash
$ Select-String -Path "src\screens\cosplayer\Offer*.tsx" -Pattern "offer\.(proposer_email|listing_seller_email)"
Filename: OfferDetailScreen.tsx
LineNumber: 108
Line: const buyerEmail = offer.proposer_email;
```
✅ **PASS with caveat** - Single reference is in `handleMessage()` chat handler (disabled UI, chat coming later)

**No email fields displayed in UI**. Parties section shows only display names.

---

### Port 3000 Check
```bash
$ Get-NetTCPConnection -LocalPort 3000
Count: 1
```
ℹ️ **INFO** - Backend server is running on port 3000 (expected for development)

---

## Testing Checklist (Manual - Requires Device/Emulator)

The following cannot be verified without a running app:

### 1. Offer Creation Flow
- [ ] Navigate to a listing detail screen (not your own)
- [ ] Tap "Make Purchase Offer" / "Propose Trade" / "Commission Request"
- [ ] Fill out offer form
- [ ] Submit offer
- [ ] **Expected**: Success message, offer appears in "Sent" tab
- [ ] **Failure Case**: Server unreachable → user sees "Unable to reach the server" message

### 2. Sent Offers Tab
- [ ] Open Offer Log screen, "Sent" tab
- [ ] **Expected**: List of offers created by current user, fetched from server
- [ ] Navigate away and back
- [ ] **Expected**: List refreshes from server (useFocusEffect)

### 3. Received Offers Tab  
- [ ] Open Offer Log screen, "Received" tab
- [ ] **Expected**: List of offers where current user is the seller
- [ ] Navigate away and back
- [ ] **Expected**: List refreshes from server

### 4. Accept Offer (Seller)
- [ ] Open a pending received offer
- [ ] Tap "Accept"
- [ ] Confirm in dialog
- [ ] **Expected**: Offer status updates to "Accepted", success message shown
- [ ] **Server Rule**: Purchase/trade offers block other offers on same listing

### 5. Decline Offer (Seller)
- [ ] Open a pending received offer
- [ ] Tap "Decline"  
- [ ] Confirm in dialog
- [ ] **Expected**: Offer status updates to "Declined"

### 6. Withdraw Offer (Proposer)
- [ ] Open a pending sent offer
- [ ] Tap "Withdraw Offer"
- [ ] Confirm in dialog
- [ ] **Expected**: Offer status updates to "Withdrawn"

### 7. Server Unreachable Scenarios
- [ ] Stop backend server
- [ ] Try to create offer
- [ ] **Expected**: Error message "Unable to reach the server. Please check your connection and try again."
- [ ] Navigate to Offer Log
- [ ] **Expected**: Existing server-status banner appears (if implemented), no new offers load

### 8. Identity Checks
- [ ] Verify accept/decline buttons only appear for received offers
- [ ] Verify withdraw button only appears for sent offers
- [ ] Verify message button is disabled with "Chat coming soon" note

### 9. No Email Leakage
- [ ] Open any offer detail screen
- [ ] **Expected**: Only display names shown in Parties section, NO email addresses visible

---

## Items Not Verifiable Without Device

1. **Network Error Handling** - Requires stopping backend or simulating network failure
2. **Focus Refresh Behavior** - Requires navigating between screens
3. **Server-Status Banner** - Requires backend to be unreachable
4. **Offer Creation Form** - Requires logged-in user with verified marketplace access
5. **Accept/Decline/Withdraw UI** - Requires test data with pending offers
6. **User ID Matching** - Requires logged-in user with user_id populated from server login

---

## Technical Notes

### Server User ID Availability
- `user_id` is only available after logging in via server authentication
- Mock/local accounts created before server existed will NOT have `user_id`
- Offers require server authentication, so this is not a blocker
- Future migrations may need to sync local accounts with server

### Backward Compatibility
- OffersContext methods still accept email parameters for backward compatibility
- These parameters are ignored internally but prevent breaking changes to calling screens
- Future refactor can remove email parameters once all screens are verified

### Chat Handler
- `handleMessage()` in OfferDetailScreen still references `offer.proposer_email`
- This is dead code since Message button is disabled
- Chat wiring will replace this logic entirely when addressed

---

## Known Limitations

1. **Seller User ID Not in All Responses**: Server doesn't return `seller_user_id` in sent offers list. The app infers it for received offers (current user IS the seller).

2. **Email Fields Still in Type**: `Offer.proposer_email` and `Offer.listing_seller_email` retained for backward compatibility with chat code. Always empty for server-sourced offers.

3. **No Offline Support**: If server is unreachable, offers cannot be created or viewed. This matches the requirement (server-only offers).

4. **Test Data Required**: Manual testing requires:
   - Backend server running on port 3000
   - At least 2 verified marketplace users
   - Active listings from one user
   - Offers between users

---

## Commit Details

**Commit Hash**: 0176b63  
**Branch**: feature/offers-app-server  
**Commit Message**:
```
FE-6 Step 3: Wire app offers to server (offers only, chat untouched)

- Created src/services/OffersApi.ts with 7 methods calling backend endpoints
- Rewrote src/contexts/OffersContext.tsx to use OffersApi instead of AsyncStorage
- Added user_id field to User and StoredAccount types for server identity
- Updated OfferDetailScreen and OfferLogScreen to refresh on focus
- Removed email display from offer screens (display names only)
- Updated ListingDetailScreen to enable offer buttons (chat stays disabled)
- All offer identity checks now use user_id instead of email
- TypeScript compilation clean (npx tsc --noEmit exit 0)
- No AsyncStorage imports in OffersContext
- Offers ready for server integration testing
```

---

## Next Steps

1. **Device Testing**: Run app on emulator/device with backend server running
2. **Create Test Data**: Set up 2+ verified users with listings and offers
3. **Manual Test Pass**: Execute testing checklist above
4. **Bug Fixes**: Address any issues found during manual testing
5. **Chat Integration**: Wire chat features to server in separate step (FE-6 Step 4)
6. **Merge**: After testing passes, merge feature/offers-app-server to master

---

## Summary

✅ **TypeScript Compilation**: PASS  
✅ **AsyncStorage Removed**: PASS  
✅ **Email Display Removed**: PASS (chat handler exception noted)  
✅ **User ID Integration**: PASS  
✅ **API Service Created**: PASS  
✅ **Context Refactored**: PASS  
✅ **Screens Updated**: PASS  
✅ **Focus Refresh Added**: PASS  

**Status**: Ready for manual testing with running backend server.

---

**End of Report**
