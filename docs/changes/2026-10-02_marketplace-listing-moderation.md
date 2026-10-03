# Marketplace listing moderation: auto-block vulgar and unrelated listings

Date: 2026-10-02
Status: complete

## Summary
Listings are checked server-side before publishing. Blocked: vulgar language, adult content, hate speech, prohibited items (real weapons/drugs), and clearly unrelated items. Context-aware: "prop gun" allowed, "real gun" blocked. Create screen calls the check endpoint before save and shows field-level violations. Display names also moderated at registration.

## Why
Client-side filters can be bypassed. A single server-side rule set is easier to update than syncing word lists to every device. Fail-closed design: network errors block the save, so no listing is ever published without a moderation pass.

## Rule categories and codes
VULGAR (English and Tagalog), ADULT, HATE, PROHIBITED_ITEM (real firearms/ammo/explosives, drugs, counterfeit IDs, stolen goods), UNRELATED (phones, laptops, vehicles, real estate, jobs, pets, appliances). Cosplay-related terms rescue ambiguous cases.

## Normalization steps
NFKD, strip combining marks, lowercase, remove invisibles/control chars, map homoglyphs (Cyrillic/Greek lookalikes), map leet/symbols (0->o, 1->i, 3->e, @->a, $->s). Two forms: spaced (letters with separators between) and squashed (separators removed, repeated letters collapsed). Short risky terms match whole words only. Longer unambiguous terms can substring-match on squashed form (5+ chars). Allowlist applied first.

## Relevance logic
Conservative. UNRELATED code fires only when clearly unrelated terms hit AND no cosplay term present AND category mismatch. Ambiguous cases default to allowed. Cosplay terms: wig, costume, prop, armor, EVA foam, fabric, sewing, glue gun, heat gun, makeup, contacts, photography, commission, craft, convention, anime/game/series.

## Endpoint
POST /marketplace/listings/check. Requires auth. Seller-only (403 for staff/organizer). Body: {title, description, category}. Response: {allowed, violations[{field,code,message}]}. Rate limit: 30/min per user (429). Title <= 100 chars, description <= 2000. Unknown category -> 400. Messages never echo matched terms.

## Files changed
forgemind-backend/src/moderation/normalize.ts: text folding, homoglyphs, leet map, spaced/squashed forms
forgemind-backend/src/moderation/rules/*.ts: term lists (vulgar, adult, hate, prohibited, unrelated, cosplayTerms, allowlist)
forgemind-backend/src/moderation/rules/index.ts: LIMITS, PERMITTED_CATEGORY_SLUGS
forgemind-backend/src/moderation/index.ts: moderateListing, moderateDisplayName, codes
forgemind-backend/src/marketplace/router.ts: POST /listings/check endpoint, display_name check in registration
forgemind-backend/tests/moderation.test.ts: 64 test cases, node:test, table-driven
forgemind-mobile/src/types/api/marketplace.ts: CheckListingInput, CheckListingResponse, CheckListingError, ModerationViolation
forgemind-mobile/src/services/MarketplaceService.ts: checkListing function, toCheckError helper
forgemind-mobile/src/screens/cosplayer/CreateListingScreen.tsx: calls checkListing before save, fail-closed, per-field errors, clears error on edit

## Tests
64 table-driven cases. 37 blocked (vulgar plain/obfuscated/Tagalog, adult, hate, prohibited, unrelated), 27 allowed (false-positive guards: Attack on Titan, Assassin's Creed, peacock, scunthorpe, button, analysis; context: EVA foam gun, replica prop; normal cosplay). 7 test suites cover: blocked cases, allowed cases, field attribution, display name, normalization folds, purity, over-long fields. All pass.

## Mobile behavior
Create screen calls checkListing({title,description,category}) before saving. Fail-closed: network/429/5xx/auth errors block save, show generic message. allowed=false blocks save, shows violation messages under title/description fields, errors clear when user edits. No word lists shipped to mobile. Display-name violations at registration already handled by existing per-field server error display. EditListingScreen does not exist yet; when added it must call same check. Legacy listings stay in AsyncStorage, never rechecked, visible locally only.

## Resume note
Found after interruption: backend moderation module complete, router endpoint complete, tests complete, missing LIMITS export. Mobile had no checkListing. Fixed LIMITS, added checkListing service + types, updated CreateListingScreen to call check before save, removed old appeal flow, field errors clear on edit. Compile clean except 4 pre-existing VerifyStaffScreen errors (allowed).

## Known limits
Listings still in AsyncStorage so modified client can bypass. Once listings move to DB and POST/PUT /listings call moderateListing(), this becomes enforcement not just early feedback. Images not checked. Keyword lists need manual updates. False positives/negatives possible. Legacy seeded listings not rechecked. No AI. Rate limit in-memory (resets on server restart). Display_name moderation at registration, but no re-check on profile edit (profile edit does not exist yet).

## How to test
Backend: npm run test:moderation (all 64 cases pass). Live: start backend on temp port (not 3000), throwaway curl script in %TEMP% with tokens in variables, test: allowed listing -> 200 allowed true; vulgar -> 200 allowed false + violations; no token -> 401; staff/organizer token -> 403; 31st call in a minute -> 429; vulgar display_name at registration -> 400 with fields. Delete script + stop server after. Mobile: run app, go to create listing, fill form, submit with allowed content -> saves; submit with vulgar word in title -> blocked, message under title field, edit clears error, resubmit allowed -> saves. No token -> auth error. Network off -> "Can't check your listing" + blocked.

## Follow-ups
Move listings to database, call moderateListing() in POST/PUT /listings write path. Report button for users to flag violations. Head organizer takedown flow. Log repeat-offender patterns. Optional: server-side AI classifier if keyword lists prove inadequate. Image moderation (manual or AI). Extend display_name check to profile edit once that exists. EditListingScreen (when added) must call checkListing before save.
