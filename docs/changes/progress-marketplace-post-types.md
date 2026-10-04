# Progress: Marketplace Post Types + Listing Removal

Status: B2a COMPLETE — sell/trade/commission live on backend and mobile; tsc 0 errors.

## Step Status
- [x] STEP 0: Inspect existing code (DONE)
- [x] STEP 1: Data model (DONE - committed)
- [x] STEP 2: Rules (DONE - B1: 18 passing rule tests)
- [x] STEP 3: Create listing screen (DONE - backward-compat wrapper; screens compile)
- [x] STEP 4: Browse + detail + offers (DONE - compile; NOT TESTED on device)
- [x] STEP 5: Listing removal (DONE - owner remove + permanent delete endpoints)
- [ ] STEP 6: Seed data (PARTIAL - 6 seeded rows present; blocked-input fixture missing)
- [ ] STEP 7: Self-verify (PARTIAL - 73/89 verify tests pass; 16 blocked-input tests need fixture)
- [x] STEP 8: Documentation (DONE for B2a)

## STEP 1 Complete - Files Changed
- src/types/marketplace.ts: Added PostType, type-specific fields, removal fields
- src/constants/postTypes.ts: Labels, captions, money field labels
- src/utils/formatStatus.ts: Added new offer types (rental, sell_to_poster, service_bid)
- src/utils/postTypeHelpers.ts: Backward compat helpers (getEffectivePostType, isOpenToTrade, getListingMoneyValue)
- Commit: feat(marketplace): add post type data model and constants

## Remaining Work (STEPS 2-8)
STEP 2 requires: Update offerRules.ts, add offer types validation, enforce who-can-create/respond rules
STEP 3 requires: Complete rewrite of CreateListingScreen post type selection + type-specific fields
STEP 4 requires: Update MarketplaceScreen, ListingDetailScreen, MakeOfferScreen, OfferDetailScreen with new UI
STEP 5 requires: New MyListingsScreen + removal functions in MarketplaceContext + offer withdrawal logic
STEP 6-8 require: Seed data, verification traces, documentation

Estimated ~6-8 more hours of implementation work across multiple complex screens.
