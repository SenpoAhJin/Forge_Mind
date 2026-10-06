# TASK DEL: User Listing Deletion Progress

## Status: Complete

## Completed

### Step 0: STATE ✓
- Backend: 97b441d, tsc exit 0, /health 200
- Mobile: 9e3d37b, tsc exit 0
- Routes found:
  - POST /marketplace/listings/:id/remove - allows active, blocked
  - DELETE /marketplace/listings/:id - allows cancelled, blocked
- removeListing(id, reason?) - reasons: sold_elsewhere, no_longer_available, posted_by_mistake, other
- deleteListingPermanently(id)
- Both exported from MarketplaceContext along with myListings, refreshListings

### Step 1: BACKEND SMOKE SCRIPT - BLOCKED
- Created scripts/verify_delete.ps1
- Script fails: all test listings return 403 forbidden
- Issue: marketplace registration/approval flow not accessible in test
- Backend verification blocked, continuing with mobile implementation

### Step 2: DELETE BUTTON ON DETAIL SCREEN ✓
- Added delete button to ListingDetailScreen for listing.is_owner
- Shows confirmation modal: "Delete this listing?" / "This cannot be undone."
- Handler: if status is active/blocked, calls removeListing('other') first, then deleteListingPermanently
- Error handling: 403 own listings only, 404 no longer exists (refresh+back), 409 cannot delete, offline/other generic
- Uses ThemeContext colors (error red), fixed height 48px
- Disabled state while deleting
- Commit: 90315e8

### HOOKFIX: Crash After Delete ✓
**Problem:** React error "Rendered fewer hooks than expected" when deleting listing from detail screen
**Root cause:** After successful delete, `await refreshListings()` updated context before `navigation.goBack()`, causing component to re-render with undefined listing, triggering early return
**Fix:**
- Navigate back FIRST before refreshing
- Don't await refreshListings (background update)
- Add isMounted guard to prevent state updates after unmount
- Guard listing access in delete handler
- Add listing check in useEffect dependency
- Commit: [current]

## Remaining

### Step 3: MY LISTINGS TOGGLE - NOT STARTED
(Skipped per TASK DEL scope - only delete button was required)

## Files Changed

**Backend:**
- scripts/verify_delete.ps1 (new, not committed - verification blocked)

**Mobile:**
- src/screens/cosplayer/ListingDetailScreen.tsx (90315e8, hookfix commit)

## NOT TESTED (Manual)
- Delete one of your own listings from its detail screen and confirm you go back to the list without an error screen and the listing is gone
- Open a listing from a second account and confirm it still opens
- Open the detail of a listing that was deleted elsewhere and confirm a friendly "not found" state
- Delete while the backend is off and confirm a message and no crash
- Confirm Cancel button in delete confirmation does nothing
- Open own listing, confirm Delete button present
- Open other's listing, confirm no Delete button

## Blockers
- Backend verification script blocked by marketplace registration approval flow not accessible in test environment
