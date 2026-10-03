# Progress: Marketplace Post Types + Listing Removal

Status: STEP 1 - Data model (starting)

## Step Status
- [x] STEP 0: Inspect existing code (DONE)
- [ ] STEP 1: Data model
- [ ] STEP 2: Rules
- [ ] STEP 3: Create listing screen
- [ ] STEP 4: Browse + detail + offers
- [ ] STEP 5: Listing removal
- [ ] STEP 6: Seed data
- [ ] STEP 7: Self-verify
- [ ] STEP 8: Documentation

## STEP 0 Findings

(a) **Current field for Buy/Trade/Both:** 
- Field name: `transaction_type: TransactionType` where `TransactionType = 'buy' | 'trade' | 'both'`
- Values: 'buy' (monetary payment), 'trade' (barter), 'both' (either payment or trade)

(b) **Places that read transaction_type:**
- CreateListingScreen: user selects it, validates price requirement
- ListingDetailScreen: displays badge with icon/label
- MakeOfferScreen: shows mismatch warning, validates offer type compatibility
- MarketplaceContext: stores it in listing
- Backend seed script: inserts into DB

(c) **Places assuming proposer is buyer:**
- ChatContext: thread has buyer_email field, getOrCreateThread param is buyerEmail
- ChatThread type: has buyer_email, buyer_display_name, buyer_last_read_at
- OffersContext: purchase/trade offers always addressed TO listing owner FROM proposer
- canMakeOffers gate: checks buyer or both role
- Multiple screens reference "buyer" in comments/UI

(d) **Chat closure on listing inactive:**
- YES - getEffectiveStatus already checks: if listing is null OR status !== 'active', returns {status: 'closed', reason: 'listing_unavailable'}
- Covers sold, cancelled, blocked, and removal (will become cancelled)

## Current Step
Defining new post_type field and related data model changes.
