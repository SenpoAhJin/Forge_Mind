# Progress: Marketplace Listings On The Backend (Part 1)

Status: TASK Q1 IN PROGRESS - Step 2g (language blocking) next. Quality gate complete.

Latest: 2026-10-05 Task Q1 resumed. Newest work below.

## Task Q1: Backend Text Safety (Quality + Language Blocking)

### Completed
- Step 0: State verified, backend running, earlier work confirmed
- Step 0b: Dataset inventory (302K clean texts, 11K Tagalog, train/val/Block_Words/processed)
- Step 0c: Fixtures exist (English, Tagalog, live case id 56e6f1a7-91c5-4976-9a02-cfc054aa872c active+passed)
- Step 2a: quality.ts created with checkListingQuality
- Step 2b: char_ngrams.json built (5112 trigrams, 146KB)
- Step 2c: Rules implemented (vowel check, repeated chars, consonant runs, trigram probability, Tagalog patterns)
- Step 2d: Tuned (testset: 98% real pass, 70% gibberish reject; val.csv: 0% false reject)
- Step 2e: Wired quality gate into POST before moderation, 422 listing_quality response, trade item checks
- Step 2f: Duplicate guard updated to check title AND description

### Next: Step 2g - English and Tagalog blocking
Extract blocked terms from datasets (train.csv, Block_Words, Tagalog_Datasets, Explicit_Datasets text),
save to blocked_terms_en.json and blocked_terms_tl.json, wire into moderation with normalization,
measure on val.csv, verify live case blocks.

Files changed: quality.ts (new), char_ngrams.json (new), listingsRouter.ts (quality gate moved before moderation, duplicate includes description), build-char-ngrams.ts (new), tune-quality.ts (new), quality_testset.json (new)

---

Goal: move marketplace LISTINGS from per-device AsyncStorage onto the backend so a
listing created by one user is visible to every other user on any device, with the
server-side screener as the authority. Offers and chat stay local in this task.

## Step Status

- [x] STEP 0: Inspect (DONE)
- [x] STEP 1: Migration (DONE - committed)
- [x] STEP 2: Auth + role helpers (DONE - B1)
- [x] STEP 3: Endpoints (DONE - B1 + B2a)
- [x] STEP 4: Seed check (DONE - 6 seeded rows verified)
- [x] STEP 5: Mobile wiring (DONE - B2a: MarketplaceApi.ts + Context rewrite)
- [ ] STEP 6: Verify with two real accounts (NOT TESTED on device)
- [x] STEP 7: Docs (DONE for B2a and for the 2026-10-05 white page fix)
- [x] EXTRA: White page fix, seller identity, offline cache validation, error boundary (DONE 2026-10-05)
- [ ] EXTRA: B2 UI steps still missing (create form by post type, Browse / My Listings toggle, Remove listing, Delete permanently). Audited only, not built.

## 2026-10-05 Monday 16:25 - Marketplace White Page Fixed And Hardened

### The symptom

The Marketplace feed rendered, but opening a listing produced a white page on the
phone and on the web build at `localhost:8081`. The feed itself was fine, which is
why it looked like a navigation problem.

### Why it happened, with evidence

| Cause | Evidence | Fixed |
|-------|----------|-------|
| The listing screen read a field the server never sends | `ListingDetailScreen.tsx:198` did `listing.seller_email.split('@')[0]`. The public listing shape has never carried an email, and must not. The throw happened during render, with no boundary around it, so React unmounted the whole screen and the page went white. | yes |
| Cached listings were parsed without being checked | The context ran `JSON.parse` on the cache on every launch and pushed the result straight into state. The old per-device cache stored an object, not an array, so a device with old data threw `SyntaxError` or `TypeError` before anything could render. | yes |
| Money was formatted as if it always existed | `formatPHP` took a `number` and called `.toFixed(2)`, while a commission listing stores its money in `rate` and leaves `price` empty. Live rows happened to be safe, so this was latent, but tsc proved it. | yes |
| Two different listing shapes were in play | The context had its own `Listing` type and the screens had another one in `src/types/marketplace.ts`, plus a `FlatList` overload that did not exist. 21 tsc errors in total. | yes |
| The create screen called an old function signature | `createListing(sellerEmail, input)` spread `undefined` when the screen passed no input, and the old signature asked the client for an address. | yes |
| Bundle or import failure | `expo export --platform web` exited 0 before any change, and there is no `components/marketplace` folder. Not a cause. | n/a |
| A navigation hook inside a provider | 0 matches for `@react-navigation` under `src/contexts` and `src/services`. Not a cause. | n/a |

A headless script ran the real screen expressions over the live server response
for 12 listings and 6 cache shapes before the fix: 15 throws, all from the three
causes marked yes above.

### What changed in the mobile app

- `src/utils/marketplaceMapping.ts` (new): one function turns any server row into
  the shape a phone screen expects, with a safe value for every field. It is a
  plain module so a script can exercise it without rendering React.
  `MarketplaceContext` re-exports it, so there is still exactly one mapping.
  `seller_name` falls back to "Cosplayer" when the server has no name,
  `photos` falls back to an empty list, and dates fall back to an epoch date
  rather than an invalid one.
- The cache is only used when it parses into an array of listing-shaped rows.
  Anything else is treated as no cache, and `listings` and `myListings` are
  always arrays.
- Old cached listings are cleared only after a fetch that actually succeeded, so
  a failed launch no longer destroys the offline copy.
- `ListingDetailScreen` names the seller from `seller_name` and asks
  `is_owner` whether it is your own listing. No address is ever read or shown.
- Offers and chat no longer read an address either. Both take the listing's
  public fields and, if the shape is wrong, store a minimal placeholder instead
  of throwing.
- `formatPHP` accepts an empty value and prints a dash.
- `getListingPriceLabel` decides what a listing costs: a sell listing shows its
  price, a commission listing shows its rate, a trade listing shows an estimate
  when one exists, and anything else shows the dash. It is used on the feed card
  and on the detail screen.
- `VerifyStaffScreen.tsx` had 4 type errors unrelated to the marketplace. Fixed
  so the app compiles cleanly.
- `src/components/ErrorBoundary.tsx` (new) catches a render failure and shows a
  readable message with a Try again button instead of a white page. It wraps the
  app root and every Marketplace screen. Outside development it says only that
  something went wrong; it never prints listing text.

### Price labels

| Listing | Server fields | Label |
|---------|---------------|-------|
| Sell | `price` 1200 | the price |
| Commission | `price` empty, `rate` 850 | the rate |
| Trade | `price` empty, no estimate | dash |
| Trade with an estimate | `trade_estimated_value` set | trade plus the estimate |
| Anything missing | nothing | dash |

### What changed in the backend

The public listing shape had no way to say who the seller was in a form a client
can use, and no way to tell a client which listings are the caller's own.

- `toPublicListing` now takes the caller's id and adds `seller_user_id` and
  `is_owner`. The feed passes the signed-in user; the owner endpoint passes the
  seller, so `/mine` reports `is_owner` true on its own rows.
- `seller_email` is still never sent to anyone.
- `scripts/verify_marketplace.ps1` gained 10 checks: the feed carries
  `seller_user_id`, `seller_name` and `is_owner`, still carries no
  `seller_email`, the seller id is a non-empty string, `is_owner` is a boolean,
  another account's listing is never owned by the reader, and the same listing
  disagrees about ownership between its owner and another account.

### Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (mobile) | exit 0, from 21 errors |
| `npx expo export --platform web` | exit 0, output folder deleted |
| Headless screen run, before | 15 throws over 12 listings and 6 cache shapes |
| Headless screen run, after | 0 throws over 21 listings (9 feed, 3 mine, 9 edge cases) and 8 cache shapes |
| `npm run typecheck` (backend) | exit 0 |
| `scripts/verify_marketplace.ps1` | 83 pass / 16 fail, the same 16 blocked-fixture failures as before this change (73 pass / 16 fail) |
| `/health` after restart | 200, backend pid 25768 |
| Test rows left in the database | 0 accounts, 0 listings |

### NOT TESTED

- No manual testing on a real phone. The app was never opened on a device or in
  a browser by a person during this work.
- The white page itself was not reproduced by hand. The cause was found by
  reading the code and by running the screen expressions outside React.
- No two-account manual walkthrough of opening a listing.
- No manual check of the offline note, the dash for a missing price, the
  commission rate label, the trade estimate label, the ErrorBoundary message, or
  Try again.
- No manual check of the offers and chat messages that now replace the address.
- No manual check that a listing photo shows, or of image loading itself.
- The 16 verify failures were not investigated; they need the blocked-inputs
  fixture file, which is still not in the repo.

### COULD NOT DO

- Offers and chat still identify the buyer and seller from a local address,
  because the signed-in user record carries no server id. Both entry points now
  say `Offers and chat will use the server in an upcoming update.` and store a
  placeholder name instead of crashing.
- The seller portfolio cannot look up a server id either, for the same reason.

### Commits

- `fix(marketplace): map every server listing through one safe mapping`
- `feat(safety): add an error boundary so a render error stops being a white page`
- `feat(marketplace): public listing shape carries seller_user_id and is_owner`
  (forgemind-backend)

### Delete listings audit, no changes made

Checked and left exactly as found, as asked.

| Piece | Where | State |
|-------|-------|-------|
| Owner takes a listing down | `forgemind-backend/src/marketplace/listingsRouter.ts:704` | present |
| Permanent delete | `forgemind-backend/src/marketplace/listingsRouter.ts:853` | present, refuses an active listing |
| Appeal | `forgemind-backend/src/marketplace/listingsRouter.ts:779` | present |
| Mark as sold | `forgemind-backend/src/marketplace/listingsRouter.ts:618` | present |
| Photo cleanup on delete | anywhere in `src`, `migrations`, `tests` | 0 matches for a photo table or column |
| `removeListing` in the app | `src/contexts/MarketplaceContext.tsx:237` | present, unused |
| `deleteListingPermanently` in the app | `src/contexts/MarketplaceContext.tsx:250` | present, unused |
| Same two calls in the API layer | `src/services/marketplaceApi.ts:110` and `:130` | present |
| Browse / My Listings toggle | `src/screens/cosplayer/MarketplaceScreen.tsx` | missing |
| My Listings screen | any file matching `MyListing` | 0 files |
| Remove listing button | any screen | missing |
| Delete permanently button | any screen | missing |

The backend and the client functions exist but nothing in the app can reach
them. The missing Browse / My Listings toggle, the missing status tags, the
missing Remove listing button with its reason picker, and the missing Delete
permanently button are the B2 "Step 2" and "Step 3" items in the B2-RESUME plan
above. They are the same items listed under "Files To Modify" 2, 3 and 4 there.
They are deliberately not built yet.

## 2026-10-04 - AI Setup Automation

### Why this was needed

forgemind-ai had Python code, a trained model, and requirements files, but no automated setup. If someone cloned the repo or deleted the venv, there was no one-command way to get it working. Library versions were not pinned, so a fresh install could break the model.

### What was done

- Created setup.ps1: checks Python 3.10+, creates .venv, installs pinned dependencies, runs import checks
- Rewrote requirements.txt with 7 pinned versions (Flask 3.1.3, scikit-learn 1.9.1, numpy 2.5.3, pandas 3.0.6, joblib 1.6.0, flask-cors 6.0.5, openpyxl 3.1.5)
- Created requirements-dev.txt (pytest 9.1.1)
- Added Setup section to README.md (Python version, how to run setup.ps1, how to start server, port 5000)
- Updated .gitignore (.venv, **/__pycache__, *.pyc)

### Verification

- All 8 packages import successfully
- Model (marketplace_screener_lr.joblib, 6.18 MB) loads with scikit-learn 1.9.1, no version warnings
- Precision 73.14%, recall 81.01% (from training)
- AI server starts on port 5000, /health returns 200, /api/match validates requests (400/404)
- Venv size: 325.82 MB

### NOT CHANGED

- No code logic modified (attire_matcher.py, color_matcher.py, api.py)
- No model retraining (already compatible)
- No tests added (tests/.gitkeep only)

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


## 2026-10-04 - B2 In Progress (Steps 1-2 Complete)

### Completed
- **Step 1:** Created MarketplaceApi.ts service with 6 functions (getListings, getMyListings, createListing, removeListing, deleteListingPermanently, appealListing). Uses AuthService patterns for authorization and error handling.
- **Step 2:** Updated MarketplaceContext to load from server API. AsyncStorage is now offline cache only. Added myListings, removeListing, deleteListingPermanently. Migration flag to clear old local listings once.

### Next Steps (To Resume)
- **Step 4:** Create Form - three transaction type buttons (Sell/Trade/Commission), fields per type, category choices depend on type, remove "Other" category, role rules (buyer-only can use Trade only)
- **Step 5:** My Listings + Remove - "Browse | My Listings" toggle, status tags, status filter chips, "Remove listing" button with ConfirmationModal and reason picker, "Delete permanently" for removed/blocked
- **Step 5b:** Backend DELETE endpoint for permanent delete
- **Step 6:** Cosplayer name - show seller_name from server, stop building from email.split
- **Step 7:** Verification - tsc, backend tests, verify script
- **Step 8:** Docs - progress file, CHANGELOG entries, MARKETPLACE_API.md update
- **Step 9:** Commits per step

### Type Errors
Currently 34 TypeScript errors (expected) - screens still reference old context signatures. Will fix after all screen updates complete.


## 2026-10-04 - B2-RESUME Context Limit Reached

### Completed in This Session
- **Step 0:** State check complete
  - @react-navigation imports in contexts: 0 (removed useFocusEffect from MarketplaceContext)
  - Backend: 27 modified, Mobile: 4 modified
  - tsc errors: 34 (expected - screens not updated yet)

### Remaining Work (Detailed Steps)

**Step 1: CreateListingScreen** (`src/screens/cosplayer/CreateListingScreen.tsx`)
- Replace Buy/Trade/Both buttons with THREE type buttons: Sell, Trade, Commission
- Fields per type:
  - Sell: title, description, category (item), condition, price > 0
  - Trade: title, description, category (item), offer item, want item, optional value
  - Commission: title, description, category (service), rate > 0
- Remove min length for title/description (keep required + max)
- Category filter: service categories for Commission, item categories for Sell/Trade
- No "Other" category
- Buyer-only can use Trade only (show note)
- Send post_type: sell | trade | commission
- Keep prohibited-items notice and photo note

**Step 2: My Listings + Remove**
- Add "Browse | My Listings" toggle under Marketplace header
- My Listings from context.myListings
- Status tags: Active, Blocked, Sold, Removed
- Fixed-height cards + status filter chips (height 56, overflow hidden)
- "Remove listing" button on Active/Blocked cards
- ConfirmationModal with reason picker: sold_elsewhere, no_longer_available, posted_by_mistake, other
- Call context.removeListing, then refresh
- Keep Appeal on Blocked cards

**Step 3: Permanent Delete**
- "Delete permanently" button on Removed/Blocked cards in My Listings
- ConfirmationModal: "cannot be undone"
- Call context.deleteListingPermanently, then refresh

**Step 4: Cosplayer Name**
- Show seller_name (from display_name) on cards and ListingDetail
- ChatContext: use display_name, not email.split('@')[0]
- OffersContext: use display_name, not email.split('@')[0]
- Never show email as name

**Step 5: Automated Checks**
- tsc both repos (exit 0)
- Backend tests
- verify_marketplace.ps1 (summary + fails)
- expo export --platform web (exit code, delete folder)
- Greps: Alert.alert, && <Text, console.log text, @react-navigation in contexts/services

**Step 6: Docs**
- Update progress file
- CHANGELOG.md top entry (plain language)
- NOT TESTED list
- Backend CHANGELOG note
- MARKETPLACE_API.md delete endpoint
- Delete temp scripts

### Files To Modify
1. `src/screens/cosplayer/CreateListingScreen.tsx` - three types
2. `src/screens/cosplayer/MarketplaceScreen.tsx` - Browse/My Listings toggle
3. `src/components/marketplace/ListingCard.tsx` - status tags, remove button
4. `src/screens/cosplayer/ListingDetailScreen.tsx` - seller_name, remove button
5. `src/contexts/ChatContext.tsx` - display_name
6. `src/contexts/OffersContext.tsx` - display_name

### Current Context Budget
69k remaining - insufficient for full implementation. Need fresh session or incremental approach.
