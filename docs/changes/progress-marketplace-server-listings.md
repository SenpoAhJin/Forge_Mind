# Progress: Marketplace Listings On The Backend (Part 1)

Status: STEP 1 COMPLETE (migration 014 applied, down/up verified). Next: STEP 2 auth + role helpers.

Goal: move marketplace LISTINGS from per-device AsyncStorage onto the backend so a
listing created by one user is visible to every other user on any device, with the
server-side screener as the authority. Offers and chat stay local in this task.

## Step Status

- [x] STEP 0: Inspect (DONE)
- [x] STEP 1: Migration (DONE - committed)
- [ ] STEP 2: Auth + role helpers (NOT STARTED)
- [ ] STEP 3: Endpoints (NOT STARTED)
- [ ] STEP 4: Seed check (NOT STARTED)
- [ ] STEP 5: Mobile wiring (NOT STARTED)
- [ ] STEP 6: Verify with two real accounts (NOT STARTED)
- [ ] STEP 7: Docs (NOT STARTED)

## STEP 1 Complete - Migration 014

File: forgemind-backend/migrations/014_listing_post_types.js

16 columns added to `listings`: post_type (NOT NULL DEFAULT 'sell'), budget, rate,
rental_fee, rental_period_days, deposit_note, trade_offered_item,
trade_wanted_item, trade_estimated_value, request_deadline, handoff_method
(CHECK meetup|courier|either), open_to_trade (NOT NULL DEFAULT false), removed_at,
removed_reason (CHECK sold_elsewhere|no_longer_available|posted_by_mistake|other),
screener_version (NOT NULL DEFAULT 1), blocked_by_rescreen (NOT NULL DEFAULT false).

The four moderation/appeal columns named in the task
(screening_result, screening_reason, appeal_status, appeal_message) already
existed from migration 007, so nothing had to be added for them.

Constraints added:
| Constraint | Purpose | Validated |
|------------|---------|-----------|
| listings_post_type_values | post_type is one of the six values | yes |
| listings_post_type_money | sell price > 0; buy/service_request budget > 0; service_offer rate > 0; rent rental_fee > 0 and rental_period_days >= 1; trade both item fields non-empty | NOT VALID |
| listings_post_type_field_limits | non-negative money, period >= 1, free-text length caps | NOT VALID |
| chk_listing_price_required | DROPPED (old model forced price > 0 for legacy buy/both) and restored by `down` | n/a |

Index added: idx_listings_status_post_type_created on
(listing_status, post_type, created_at DESC).

Backfill from the legacy transaction_type values (buy=3, trade=1, both=2):
buy -> buy, trade -> trade, both -> sell with open_to_trade = true.
Result counts: buy=3, sell(open_to_trade)=2, trade=1. transaction_type kept.

Verification (psql counts only):
- up: 34 columns total, 16 new, 3 new CHECK constraints, 1 new index,
  6 rows backfilled, 14 migrations applied.
- down: 18 columns, 0 new columns, 0 new constraints, 0 new index, 6 rows intact.
- up again: identical to the first up, so the down is reversible.
- Constraint probe: 9 invalid rows rejected (sell price 0, buy budget 0,
  service rate 0, rent period 0, rent fee 0, blank trade item, unknown post_type,
  unknown removed_reason, negative budget), 2 valid control rows accepted,
  row count unchanged at 6.
- `npm run typecheck` exit 0.
- Commit: a168dd2 feat(db): add marketplace listing post types and type-specific fields

## STEP 0 Findings

### forgemind-backend

| Area | Finding |
|------|---------|
| Layout | src/{auth,calendar,db,marketplace,moderation,users,scripts} plus config.ts, db.ts, index.ts. A marketplace router already exists and is already mounted at /marketplace (src/index.ts:119). |
| Bearer tokens | readBearerToken -> SHA-256 hash -> sessions.refresh_token_hash join users, with expires_at > NOW (src/auth/session.ts:37). Reusable helper already exists: requireSession(req,res) (src/auth/session.ts:78) writes 401 invalid_session and returns null. |
| SessionUser fields | user_id, email, display_name, organizer_role, head_organizer_department, department, is_organizer, is_cosplayer, verification_status. marketplace_role is NOT on it, so a DB read is needed for the role rules. |
| listings table | migrations/007_domain_7_marketplace_transactions.js:19-54. Columns: listing_id, seller_user_id, item_title(200), item_description, category_id, transaction_type NOT NULL CHECK IN (buy,trade,both), price NUMERIC(12,2) NOT NULL, price_outlier, condition CHECK 5 values, photo_urls JSONB, screening_result CHECK (passed,blocked) DEFAULT passed, screening_reason, listing_status CHECK (active,sold,cancelled,blocked) DEFAULT active, appeal_status CHECK (none,pending,upheld,overturned) DEFAULT none, appeal_message, created_at, published_at, updated_at. |
| Moderation columns | screening_result, screening_reason, appeal_status, appeal_message ALREADY EXIST. Migration 014 therefore adds only post_type plus the type-specific and removal columns. |
| FKs / indexes | FK seller_user_id -> users, category_id -> permitted_categories. Indexes on seller_user_id, category_id, listing_status, screening_result, partial appeal_status. chk_listing_price_required (migrations/007:162) already forces price > 0 when transaction_type is buy or both. |
| Seeded listings | 6 rows (psql count). transaction_type: buy=3, both=2, trade=1. All active + passed. Users: 35 (marketplace_role both=3, seller=2, buyer=1, null=29; verification_status verified=2). |
| Moderation entry point | moderateListing({title, description, category}) -> {allowed, violations[{field, code, message}]} (src/moderation/index.ts:142). Pure: no I/O, no clock, no logging. Also moderateDisplayName (index.ts:197). Limits: titleMax 100, descriptionMax 2000 (src/moderation/rules/index.ts:16). PERMITTED_CATEGORY_SLUGS at rules/index.ts:21. |
| Moderation logging | src/marketplace/router.ts:302 logs user id, field names and codes only. Listing text is never logged anywhere. |
| Validation style | Hand-written parsers, no schema library: src/marketplace/registration.ts parseRegistrationInput, src/auth/validation.ts. |
| Error mapping | classifyDbError (src/db/errors.ts:37) -> 503 db_unavailable or 500 internal_error; generateRequestId available. Auth router is the pattern to copy. |
| Tests | tests/moderation.test.ts only, hand-rolled runner, `npm run test:moderation` (ts-node). |
| Rate limiting | In-memory per-user window already used for the check endpoint (src/marketplace/router.ts:189-218). Same approach is reusable. |
| Migration runner | node scripts/migrate.mjs up|down|redo, derives DATABASE_URL from DB_* env vars, 13 migrations applied. |

### forgemind-mobile

| Area | Finding |
|------|---------|
| Token storage | AsyncStorage key '@forgemind:session_token' (src/services/AuthService.ts:23-26). |
| Auth header | `Authorization: Bearer ${token}` built at AuthService.ts:198 and AuthService.ts:528; MarketplaceService.ts:105 builds the same header. |
| Base URL | src/config/api.ts is the only place a URL is built; exports API_BASE_URL and authUrl(). Already used by MarketplaceService.ts:102. |
| Error messages | AuthService.errorMessage (AuthService.ts:230) maps 503/500/401/409/400 to actionable copy; transportErrorMessage (AuthService.ts:278) for network. MarketplaceService.ts toError/toCheckError returns typed results instead. |
| MarketplaceContext | src/contexts/MarketplaceContext.tsx, 163 lines. STORAGE_KEY '@forgemind:marketplace_listings'. loadListings() seeds from src/data/marketplace_listings.json when the key is absent (lines 58-74). saveListings() rewrites the whole array. createListing(sellerEmail, input, screening?) builds a local id `listing-<time>-<rand>` (lines 85-110). getActiveListings() filters status === 'active' (line 132). cancelListing and submitAppeal are local-only (lines 116-123, 140-147). |
| Consumers of getActiveListings | 1 screen: src/screens/cosplayer/MarketplaceScreen.tsx:193 (inside a useMemo, deps include the function itself). |
| Consumers of createListing | 1 screen: src/screens/cosplayer/CreateListingScreen.tsx:185. It sends transaction_type ('buy'/'trade'/'both') and price 0 for trade; no post_type yet. |
| Other matches | src/types/marketplace.ts:73, src/utils/gates.ts:28, src/contexts/CalendarContext.tsx:60 and src/navigation/MarketplaceStackNavigator.tsx are unrelated (calendar events, navigation params). |
| CreateListingInput | src/types/marketplace.ts:73 already declares post_type: PostType as required, but the screen does not send it (type mismatch is currently tolerated by ts-node/tsc because the object is inferred, not annotated). |
| offers / chat | Both reference listings by id only and resolve the listing through getListingById: OffersContext.tsx:95 and :121, ChatContext.tsx:123 and :132. They store listing_id and buyer email locally, so they keep working while the id stays stable. |
| Local identity field | Listing.seller_email is the local identity field. The server must never expose seller email, so the mobile mapping needs a display-name field instead. |

## Notes / decisions

- Migration 014 will add post_type and the type-specific columns only; the four
  moderation/appeal columns already exist.
- DB transaction_type values are buy/trade/both. Backfill maps
  buy -> buy, trade -> trade, both -> sell with open_to_trade true. The old
  transaction_type column is kept for compatibility.