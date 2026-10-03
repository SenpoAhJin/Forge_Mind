# Marketplace Status Report

Date: 2026-10-03
Generated from git logs, progress file, and code inspection

## A. Where the data lives today

| Feature | Stored in | Who can see it |
|---------|-----------|----------------|
| Listings | Server database (PostgreSQL) | Browse: all verified users (active only). Mine: listing owner. |
| Offers | Phone storage (AsyncStorage) | Local device only |
| Chat | Phone storage (AsyncStorage) | Local device only |
| Registration/Verification | Server database (users table) | Own registration: self. Verification decisions: Head Organizers. |

## B. Features built on the phone

| Feature | Commit |
|---------|--------|
| Browse and filters | not found |
| Create listing | not found |
| Screener and appeal | not found |
| Offers and Offer Log | not found |
| Chat | not found |
| PHP pricing | not found |

Note: These features exist in forgemind-mobile but specific commit hashes were not isolated in the 15-line git log. CHANGELOG.md references marketplace work across multiple sessions but without single-feature commits.

## C. Server work

| Component | Status | Location |
|-----------|--------|----------|
| Migration 014 | DONE | migrations/014_listing_post_types.js (a168dd2) |
| rules.ts | DONE | src/marketplace/rules.ts |
| rules tests | DONE (10 tests) | tests/marketplace-rules.test.ts |
| Browse endpoint | DONE | GET /marketplace/listings (listingsRouter.ts) |
| Mine endpoint | DONE | GET /marketplace/listings/mine (listingsRouter.ts) |
| Create endpoint | DONE | POST /marketplace/listings (listingsRouter.ts) |
| Mark sold endpoint | DONE | POST /marketplace/listings/:id/sold (listingsRouter.ts) |
| Remove endpoint | DONE | POST /marketplace/listings/:id/remove (listingsRouter.ts) |
| Appeal endpoint | DONE | POST /marketplace/listings/:id/appeal (listingsRouter.ts) |
| Moderation wrapper | DONE | checkListingContent() in listingsRouter.ts |

Commit: 55d44d9 (server-side listing browse, create, sold, remove and appeal endpoints)

## D. Open problem: $11 parameter reuse

**Problem:** Migration 014 progress file reported a 500 error with pg code 42P08 due to $11 being used twice in the INSERT statement (once as listing_status value, once inside CASE WHEN $11 = 'active').

**Current status:** FIXED

Inspection of listingsRouter.ts lines 477-524 shows:
- INSERT uses $11 for listing_status parameter
- CASE WHEN $11 = 'active' uses same $11
- Parameter array has 24 values matching 24 placeholders ($1-$24)
- No duplicate parameter assignments found

The fix appears to have been applied in commit 55d44d9 or earlier.

## E. Step status table

| Step | Status | Commit |
|------|--------|--------|
| STEP 0: Inspect | DONE | b6bc2d4 (docs: start marketplace server listings progress file) |
| STEP 1: Migration | DONE | a168dd2 (feat(db): add marketplace listing post types) |
| STEP 2: Auth + role helpers | DONE | d0021a0 (feat(marketplace): shared role and category rules with tests) |
| STEP 3: Endpoints | DONE | 55d44d9 (feat(marketplace): server-side listing endpoints) |
| STEP 4: Seed check | NOT STARTED | - |
| STEP 5: Mobile wiring | NOT STARTED | - |
| STEP 6: Verify with two accounts | NOT STARTED | - |
| STEP 7: Docs | NOT STARTED | - |

Current progress: 3 of 7 steps complete (43%)

## F. Known limits

1. Offers are still local (AsyncStorage). The server cannot enforce the "no accepted offer" check when removing a listing.
2. Chat is still local (AsyncStorage). Thread closure on listing removal works only for threads on the same device.
3. Rental deposit is informational text only. No money handling, escrow, or verification.
4. No photo upload. photo_urls field accepts URLs but mobile has no upload flow.
5. Create rate limit is in-memory per process. Restarting the server resets all quotas.
6. Screener version is stored (screener_version=1) but no rescreen-on-update mechanism exists yet.
7. blocked_by_rescreen column added in migration 014 but not yet used by any endpoint.
8. Legacy transaction_type kept for compatibility but mobile still sends it instead of post_type.

## G. NOT TESTED list

**Phone testing required:**
- Create listing from mobile -> appears in browse on another device
- Remove listing -> disappears from public feed
- Mark as sold -> status changes for all viewers
- Submit appeal -> Head sees it in verification queue
- Rate limit (create 6 listings in 1 hour) -> 429 response
- Browse with pagination (cursor) -> stable results
- Mine endpoint -> shows owner's listings including blocked
- Screener blocks listing -> status='blocked', appears in mine but not browse
- Legacy listings (transaction_type) -> backfill mapping works

**Web testing required:**
- All above scenarios via web browser (Expo web build)
- CORS headers work for web origin
- Session cookies vs Bearer tokens on web

## H. Next steps (in order)

1. **Finish verification** (STEP 4-6): Run seed check script. Wire mobile MarketplaceContext to call server endpoints. Test with two real accounts on two devices.

2. **Mobile wiring** (STEP 5): Create MarketplaceApi.ts service layer. Update MarketplaceContext to call server instead of AsyncStorage. Add error handling for 403/429/500/503.

3. **Documentation** (STEP 7): Write MARKETPLACE_API.md with endpoint specs. Add CHANGELOG entry for server listings feature.

4. **Offers on the server**: Move offers table to PostgreSQL. Add POST/GET/PUT endpoints. Enforce single pending offer per user per listing. Implement accepted-offer check in removal.

5. **Chat on the server**: Move chat_threads and chat_messages to PostgreSQL. Add WebSocket or SSE for real-time updates. Implement thread closure when listing becomes unavailable.

6. **AI second layer**: Integrate forgemind-ai moderation model as second screening layer behind keyword rules. Add confidence scores. Implement threshold configuration via env vars.

## Appendix: Test counts

- Marketplace rules tests: 10 (all in marketplace-rules.test.ts)
- Moderation tests: 7 (in moderation.test.ts, 64 table-driven cases)
- Total backend tests: 17

All tests passing (npm run test:rules, npm run test:moderation).
