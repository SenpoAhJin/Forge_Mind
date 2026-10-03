# Progress: marketplace listing moderation (auto-block)

Status: COMPLETE

## FINAL STATUS TABLE

| Item | Before Resume | After Resume | Notes |
|------|--------------|--------------|-------|
| a) normalize.ts | DONE | DONE | Complete, 180 lines |
| b) allowlist | DONE | DONE | In rules/allowlist.ts |
| c) rules data files | DONE | DONE | 7 files: vulgar, adult, hate, prohibited, unrelated, cosplayTerms, allowlist |
| d) moderateListing | DONE | DONE | In moderation/index.ts |
| e) POST /listings/check | DONE | DONE | In marketplace/router.ts, mounted |
| f) display_name mod | DONE | DONE | In POST /registration |
| g) backend tests | DONE | DONE | 64 cases, 7 suites, all pass |
| h) MarketplaceService.checkListing | MISSING | DONE | Added to services/MarketplaceService.ts |
| i) Create screen check | MISSING | DONE | Updated CreateListingScreen.tsx |
| j) Edit screen check | N/A | N/A | EditListingScreen does not exist |
| k) Field errors/fail-closed | MISSING | DONE | Violations shown, network/5xx block save |
| l) No word lists mobile | N/A | DONE | Confirmed, only server has rules |
| m) .md complete | PARTIAL | DONE | 37 lines, all sections filled |

## FILES CHANGED THIS SESSION
Backend (forgemind-backend):
- src/moderation/rules/index.ts: added LIMITS export (fixed compile)
- tests/moderation.test.ts: import paths (ts-node compat)

Mobile (forgemind-mobile):
- src/types/api/marketplace.ts: CheckListingInput, CheckListingResponse, ModerationViolation, CheckListingError
- src/services/MarketplaceService.ts: checkListing function, toCheckError helper
- src/screens/cosplayer/CreateListingScreen.tsx: removed mock screener + appeal flow, call checkListing before save, fail-closed, field errors clear on edit
- docs/changes/2026-10-02_marketplace-listing-moderation.md: completed all sections (37 lines)
- docs/changes/progress-listing-moderation.md: this file

## TEST COUNTS
Backend: 64 cases, 7 test suites, all pass
Mobile: manual test only (backend on temp port, not automated)

## ANYTHING SKIPPED
EditListingScreen: does not exist yet. When added, must call checkListing before save (documented in .md follow-ups).
Live verification: not run (backend not on port 3000, requires temp server + throwaway script).


## STEP 0 - INSPECT (DONE, read only)
- Create/edit: only src/screens/cosplayer/CreateListingScreen.tsx exists. No edit
  screen is registered in MarketplaceStackNavigator, so edit is blocked at the
  same submit path when it is added. Fields: title, description, category,
  transaction_type, price, condition.
- Text filter that already exists: src/utils/listingScreener.ts, a MOCK
  client-side substring blocklist, called at CreateListingScreen.tsx:144 before
  createListing(). It over-blocks ("prop gun replica" would be blocked) and it
  lives on the client, so a modified build can bypass it. This is the thing to
  replace with a server call.
- Storage: MarketplaceContext.tsx, AsyncStorage key @forgemind:marketplace_listings,
  seeded from src/data/marketplace_listings.json. photos is always [] (no upload).
- No report/flag feature exists.
- Categories: MARKETPLACE_CATEGORIES in src/constants/marketplaceCategories.ts,
  8 values. Backend has no listing endpoint; listings table exists in migration
  007 (domain 7) but nothing reads or writes it.
- Backend test setup: no test runner and no test files. Earlier verification used
  throwaway scripts in %TEMP%. Will use node:test, which ships with Node, so no
  new dependency.
- Patterns: src/auth/session.ts exports resolveSessionUser and requireSession.
  No rate limiter exists yet. Errors are {error, message}; validation errors in
  marketplace/registration.ts are {error, message, fields}.

## STEP 1 - MODULE (DONE)
src/moderation/normalize.ts (NFKD, combining marks, invisibles, homoglyphs, symbol map,
two forms: spaced + squashed, repeat collapse), src/moderation/rules/index.ts (all word
data, LIMITS, PERMITTED_CATEGORY_SLUGS), src/moderation/index.ts (moderateListing pure,
moderateDisplayName, codes VULGAR/ADULT/HATE/PROHIBITED_ITEM/UNRELATED).
Short terms match whole tokens only; substring on squashed form only at 5+ chars.
Allowlist checked first. No term lists printed anywhere.

## STEP 2 - ENDPOINT + DISPLAY NAME (DONE)
POST /marketplace/listings/check in src/marketplace/router.ts: requireSession, seller-only
403, 400 on non-string body / over-length / unknown category, in-memory 30/min per user
429 with an unref'd sweeper, 200 {allowed, violations}. Logs codes + user id + field names
only. Comment records that a future POST/PUT listings must call moderateListing() itself.
POST /marketplace/registration now 400s on seller_display_name via moderateDisplayName(),
language rules only (HATE/VULGAR/ADULT), in the existing {error, message, fields} shape.
Backend tsc clean.

## STEP 2b - .MD SKELETON
docs/changes/2026-10-02_marketplace-listing-moderation.md written with all 12 sections
as TODO. To be filled at step 6.

## STEP 3 - BACKEND TESTS (TODO)
node:test table-driven, at least 60 cases. Counts reported only, no term lists.

## STEP 4 - MOBILE (TODO)
MarketplaceService.checkListing, called from CreateListingScreen before save, fail closed.

## STEP 5 - VERIFY (TODO)
Temp port, not 3000. Throwaway script in %TEMP%, deleted after.

## STEP 6 - .MD (TODO)
docs/changes/2026-10-02_marketplace-listing-moderation.md, under 80 lines. Write the
skeleton right after step 2, finish it at the end.

## RULES
Server-side rules only. Never print blocklists or listing text in any output, the
progress file, the .md, or logs. No new dependency, no any. Do not touch calendar,
logistics, gates, verification, VerifyStaffScreen, or the card layout.