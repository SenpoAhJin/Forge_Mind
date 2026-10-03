# Progress: Marketplace Listings On The Backend (Part 1)

Status: STEP 1 COMPLETE (migration 014 applied, down/up verified). Next: STEP 2 auth + role helpers.

Latest: 2026-10-03 screener data alignment (see the top entry under Step Status
below). Newest work is always the first dated section after the checklist.

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

## 2026-10-03 - Screener Data Alignment (screener_version 2)

### The problem

The screener was a hand-written term list. Nothing in it came from
`forgemind-ai/marketplace_datasets`, so there was no way to answer the only
question that matters: how many listings does it catch, and how many innocent
listings does it block? Both numbers were guesses.

### Data used

Read-only. Nothing in `forgemind-ai/marketplace_datasets` was edited, moved or
deleted.

| File | Size | Shape |
|------|------|-------|
| `Block_Words_Part1_0a5e31bd.csv` (two copies, byte-identical) | 602,553 B each | one quoted column, 5,988 raw lines |
| `Block_Words_Part2_0a5e31bd.csv` | 4,584 B | one quoted column, 404 raw lines |
| `Block_Words_Part3_0a5e31bd.csv` | 136 B | one quoted column, 15 raw lines |
| `train.csv` | 68,802,655 B | 8 columns, 159,571 real CSV records |
| `processed/train.csv` | 94,797,900 B | 10 columns |
| `processed/test.csv` | 39,662,150 B | 10 columns |
| `processed/val.csv` | 32,292,869 B | 10 columns |

Row counts for the three `processed/` files are line counts, not record counts:
those files contain quoted newlines, so a line-based count overstates them. They
were not used for this task.

### Generated files

| Path | Rows | Committed |
|------|------|-----------|
| `forgemind-backend/data/labeled_listings.jsonl` | 159,716 | no (gitignored, ~68 MB) |
| `forgemind-backend/data/blocked_terms_candidates.json` | 6,308 candidates | no (gitignored) |
| `forgemind-backend/src/moderation/data/blocked_terms.json` | 3 terms | yes |

Rebuild with `npm run build:moderation-data` from `forgemind-backend`.

### Labeled set

159,988 candidate rows offered, 246 dropped as duplicates, 13 dropped where the
term list and the label set disagreed on the same text. Kept:

| Class | Rows |
|-------|------|
| blocked | 16,585 |
| allowed | 143,131 |
| total | 159,716 |

Of the kept rows, 116,970 exceed the 2,000-character description limit and are
stored but not screened, and 3,992 of those are over the limit only.

### Term selection

6,308 distinct candidates after lowercasing and de-duplication (5,895 duplicates,
190 blank lines and 2 stray header lines dropped).

Evidence comes from four out of every five rows; every fifth row is held back and
is never used to decide whether a term is kept. Rows added purely because the term
list contains a word are ignored, otherwise a term would vote for itself. A term
is kept only if it appears in at least 5 independent blocked rows and in no allowed
row at all.

Result: **3 terms**, all from Part 2.

Selection study, held-out rows only (missed = bad listings that got through,
wrong = good listings that got blocked):

| Candidate set | Terms | Missed | Wrong |
|---------------|-------|--------|-------|
| all candidates | 6,308 | -1,020 | +16,074 |
| single words only | 314 | -1,011 | +16,077 |
| min 1 hit | 44 | -11 | +4 |
| min 2 hits | 16 | -5 | +3 |
| min 3 hits | 8 | -3 | +3 |
| **min 5 hits (chosen)** | **3** | **-2** | **0** |
| min 10 hits | 1 | 0 | 0 |

### Measured result

`screener_version` is now 2. Numbers are from `npm run measure:screener`, which
runs the real shipping screener over the labeled set. The held-out view is the
honest one; the other two are reported for completeness.

| View | Precision before | Precision after | Recall before | Recall after |
|------|------------------|-----------------|---------------|--------------|
| language, all rows | 73.51% | 73.53% | 48.10% | 48.16% |
| language, held-out rows | 73.28% | 73.30% | 48.19% | 48.25% |
| language + relevance, all rows | 65.88% | 65.91% | 48.39% | 48.44% |

Held-out detail: caught 1,596 -> 1,598, missed 1,716 -> 1,714, wrongly blocked
582 -> 582. Newly wrongly blocked listings: **0** in every view. Newly caught: 9
listings, all attributable to Part 2.

Three terms moving recall by 0.06 points is a deliberately small win. The study
table above is the actual finding: at 6,308 terms the screener catches roughly a
thousand more bad listings and blocks sixteen thousand good ones. There is no
setting of this threshold that produces a large improvement without destroying
the marketplace, and the recorded precision of roughly 73% is dominated by
existing curated rules, not by this list.

### Second layer (optional, gate passed, not wired)

Gate: at least 500 labeled rows and at least 100 per class. Actual: 159,716 rows,
16,585 blocked, 143,131 allowed. Gate passed, so a model was trained.

TF-IDF plus logistic regression, 80/20 split, seed 42, scored on the held-back 20%:

| Metric | Value |
|--------|-------|
| Caught | 2,687 |
| Let through | 630 |
| Wrongly blocked | 987 |
| Precision | 73.14% |
| Recall | 81.01% |
| Blocked-class recall | 81.01% |
| Allowed-class recall | 96.55% |
| Features | 193,374 |

Recall 81.01% against the rules layer's 48.25% on comparable held-out rows, at
almost the same precision, but 987 wrongly blocked against 582. That trade is an
owner's decision, so the backend's second-layer hook is still a no-op and no
request path loads the model.

Files (all new, nothing existing in `forgemind-ai` was touched):
- `forgemind-ai/scripts/train_screener_classifier.py`
- `forgemind-ai/models/marketplace_screener_lr.joblib`

The script prints counts and metrics only. It never prints a row body or a term.

### Code changed

forgemind-backend:
- `scripts/build-moderation-data.ts` (new): reads the datasets read-only and
  writes the three generated files.
- `scripts/measure-screener.ts` (new): the measurement table above.
- `scripts/analyze-term-selection.ts` (new): the selection study table above.
- `src/moderation/normalize.ts`: added `TermIndex`, `buildTermIndex` and
  `indexMatches`. Existing normalisation, folding and whole-word/phrase semantics
  are untouched and the new index uses them.
- `src/moderation/rules/blockedTerms.ts` (new): lazy loader for the generated
  list. Lazy because `normalize.ts` imports from `rules`, so an eager loader
  would be an import cycle.
- `src/moderation/rules/index.ts`: re-export.
- `src/moderation/index.ts`: new `BLOCKED_TERM` code, applied to listings and
  seller display names. The curated rules were not rewritten.
- `src/marketplace/screener.ts`: `SCREENER_VERSION` 1 -> 2, measured numbers
  recorded in the comment.
- `src/marketplace/listingsRouter.ts`: `/remove` accepts `reason` and
  `removed_reason`; optional, validated against the four allowed values.
- `tests/moderation-data.test.ts` (new), `package.json`, `.gitignore`.
- `scripts/verify_marketplace.ps1`: fixed a real bug (see below).

forgemind-mobile: this file and `CHANGELOG.md` only.

### Bug found in the verify script

`$idList` was interpolated into SQL without quotes. A UUID starts with digits, so
psql read it as a numeric literal and every query using it died with
`trailing junk after numeric literal at or near "53af6f26"`. Two checks could
never pass and were comparing a SQL error string against a count. Fixed by
quoting each id.

### Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npm run test:moderation` | 7/7 pass |
| `npm run test:moderation-data` | 8/8 pass |
| `npm run test:rules` | 10/10 pass |
| Backend restart on port 3000 | OK, `database: OK` |
| `scripts/verify_marketplace.ps1` | 52 pass, 9 fail |
| DB state after verify | 6 seeded active listings, 0 orphans, test accounts deleted |

Baseline for comparison was 1 pass / 2 fail, because the script aborted at the
first failure.

### Known failures, not fixed

All 9 remaining failures are one issue: the script asserts that three benign
cosplay listings must be blocked. They are a costume lab coat, a replica costume
vest and a foam stage prop. The screener allows all three with zero violation
codes, which is the intended behaviour - the moderation module's own notes name
prop qualifiers as exactly the case that must not be blocked. The other six
failures are cascade: the feed correctly shows allowed listings, `/mine` has no
`screening_reason` because nothing was blocked, and appeal correctly returns 409
for a listing that is not blocked. Left in place deliberately, because changing an
acceptance test's expectations is a decision for the owner, not a cleanup.

### NOT TESTED / skipped

- The trained model is **not** loaded by the backend. Its numbers come from the
  training script's own held-out split, not from the server.
- No live or end-to-end test of the model as a request-path filter.
- `processed/*.csv` were inventoried but not used, so the 10-column files are
  unvalidated as a source.
- The three benign listings are the only fixtures for the "must not be blocked"
  path; there is no automated test asserting a *genuinely* bad listing is blocked
  by the server, only by the unit tests.
- No re-run of the pre-existing uncommitted work in either repo.
- Nothing pushed. Mobile `docs/changes/progress-marketplace-post-types.md` was
  already modified before this task and was left alone.

### Commits

- `feat(moderation): data-driven blocked terms`
- `test(moderation): measure precision and recall`
- `docs: changelog for screener data alignment`

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