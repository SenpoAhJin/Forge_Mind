# Progress: marketplace registration to backend DB

Checklist. Updated after each step. Restart-safe: read top to bottom.

## STEP 0 - INSPECT (DONE)
- Mobile save path: MarketplaceRegistrationScreen -> AuthService.submitMarketplaceRegistration
  (AsyncStorage ACCOUNTS + ACTIVE_SESSION only). No HTTP call. Local status set to 'pending'.
- Local fields: marketplace_role, seller_display_name, contact_email, contact_phone (optional),
  payout_method_label, payout_method_number, agreed_to_marketplace_terms, submitted_at,
  rejection_reason.
- DB: NO marketplace_registrations table exists, and none is needed. migration 001 lines 43-52
  already put every registration column on `users`: marketplace_role, seller_display_name,
  marketplace_contact_email, marketplace_contact_phone, payout_method_label,
  payout_method_number, agreed_to_marketplace_terms, marketplace_submitted_at,
  marketplace_rejection_reason. DECISION: reuse these, do not create a second copy.
- users.verification_status CHECK (001 lines 26-28): not_submitted, pending, verified,
  rejected, revoked.
- Verify Cosplayers card shows today: display name, email, role tag, seller_display_name,
  contact email, registered date. Payout is never in the API response.
- FINDING (security): auth/publicUser.ts USER_PUBLIC_COLUMNS includes payout_method_number,
  so login and GET /auth/me currently return the FULL payout number. Must be masked.

## STEP 1 - BACKEND (DONE)
- migration 013_marketplace_registration_integrity: added marketplace_terms_accepted_at,
  partial index idx_users_marketplace_pending, and a NOT VALID digits-only CHECK on
  payout_method_number (NOT VALID so the 3 pre-existing rows with letters are grandfathered).
- src/marketplace/registration.ts: validation, maskPayoutAccount, toRegistrationPublic/Summary.
- src/marketplace/router.ts: POST /marketplace/registration, GET /marketplace/registration/me.
- src/auth/session.ts: shared resolveSessionUser + requireSession.
- src/index.ts: mounts /marketplace.
- src/auth/publicUser.ts: payout_method_number REMOVED from USER_PUBLIC_COLUMNS;
  added qualifiedPublicColumns() and withMaskedRegistration().
- src/auth/router.ts: login + /auth/me attach a masked marketplace_registration.
- src/users/router.ts: GET /users adds a masked registration object per user.
- BUG FOUND AND FIXED (pre-existing): GET /auth/me returned 500 "column reference user_id is
  ambiguous" because the unqualified public column list was used over a sessions/users JOIN.
- BUG FOUND AND FIXED (security): PATCH /users/:id/verification used RETURNING *, which leaked
  password_hash and the full payout number. Now returns the named public columns.

## STEP 2 - BACKEND VERIFY (DONE - 32/32 pass)
- backend tsc clean. Migration applied to forgemind_dev, columns confirmed.
- Test server ran on PORT=3100 because a pre-existing dev server already held 3000.
- Test accounts created directly in DB (seeded users cannot log in), password generated
  in-process only, tokens held in PowerShell variables only, all accounts deleted afterwards.
- Passes: register 201, POST 200 + pending, masked payout, /auth/me pending + masked + no
  payout_method_number field, registration/me 200, head sees pending user + registration +
  masked payout only, letters-in-payout 400, 6-digit phone 400, 6-digit payout 400,
  terms false 400, bad role 400, no token 401, staff POST 403, staff GET /users 403,
  reject 200 + reason visible + no leak, resubmit 200 + clears rejection_reason/verified_at +
  new payout, approve 200 + /auth/me verified, POST when verified 409, buyer without payout
  200, formatted phone normalised to 09171234567.
- Temp scripts (check-cols.mjs, make-organizers.mjs, api-tests.ps1, cleanup*.mjs) were kept in
  %TEMP% only and deleted after the run.

## STEP 3 - MOBILE (CODE DONE, NOT YET RUN END TO END)
Done in this pass:
1. src/types/api/marketplace.ts (new): shared types + length constants, no any.
2. src/services/MarketplaceService.ts (new): submitRegistration, getMyRegistration.
   Typed results, not thrown strings, so 400 / 409 / network are distinguishable.
3. MarketplaceRegistrationScreen: submits through the service; success modal only after a
   200; server field errors attached per field; refreshUser() after success; submit disabled
   while loading (isLoading already did this).
4. Contact Phone: digitsOnly + 7 to 15 client rule mirroring the server, inline error.
5. AuthService.submitMarketplaceRegistration DELETED (the local-only write).
   The server user mapper no longer preserves a local-only registration, so the server wins.
   Legacy: a local pending with DB not_submitted now shows the form again, and resubmitting
   works. Nothing is migrated; the user resubmits once.
6. VerifyCosplayersScreen: card reads cosplayer.registration (display name, role, contact
   email, contact phone, payout method, MASKED payout, submitted date). Existing card and
   reject modal styling untouched.
7. VerifyCosplayersScreen: four distinct states (loading / error+Retry / empty / list),
   RefreshControl, useFocusEffect refetch. params typed as GetUsersParams (any removed).
8. MarketplaceScreen already reads user.verification_status and
   user.marketplace_registration, both now server-sourced via refreshUser. No edit needed.
9. Terms required: checkbox default false, submit blocked, inline error under the checkbox,
   clears on check, server 400 mapped to the same message.
10. tsc mobile: only the 4 pre-existing VerifyStaffScreen errors.
11. Terms audit done (report only).

## STEP 4 - VERIFY MOBILE (TODO) -> now folded into STEP C below

## STEP A - .MD (DONE)
Port 3100 confirmed not listening (port 3000 dev server left untouched).
docs/changes/2026-10-02_marketplace-registration-backend.md written, 74 lines, both
halves: summary, why, migration 013, no new table, endpoints, validation, security
fixes, files changed, before/after, terms required, legacy state, terms audit,
how to test, known limits, follow-ups.

## STEP B - QUICK CODE CHECKS (DONE)
1. Marketplace entry, all already correct, no edit needed:
   - not_submitted -> CTA card, MarketplaceScreen.tsx:32
   - pending -> "Registration Under Review" + PENDING badge, :79-116
   - verified -> <MarketplaceBrowse/>, :119-121
   - rejected/revoked -> reason from user.marketplace_registration.rejection_reason, :124-148
2. Legacy state, server wins: AuthService.toStoredAccount sets verification_status from
   the server user (AuthService.ts:312) and deletes a local-only registration when the
   server has no marketplace_role (:346-348). FIXED UserContext: both refresh sites did
   `{ ...user, ...updatedUser }`, which spread the server MASKED registration
   (payout_method, payout_account_masked) into an object typed as the LOCAL shape and
   left the mapping unmapped. Now both call AuthService.accountFromServerUser(), which
   reuses the toStoredAccount mapper login already uses. UserContext.tsx:143, :265.
3. Terms checkbox default unchecked, submit blocked, inline error: MarketplaceRegistrationScreen.tsx
   :60 state, :168 block, :180-184 inline, :450-452 clear on tick. Edit Submission reuses
   the same handleSubmit path, so it is covered.
4. grep console.log|warn|error for payout|token|password|secret|Authorization: no hits.
   Also removed the last `Promise<any>` (UserService.refreshCurrentUser now returns ApiUser,
   exported from AuthService), and `catch (error: any)` in UserContext is now `unknown`.

## STEP C - MARKETPLACE LISTING CARD GUI FIX (DONE)
MarketplaceScreen.tsx only (the browse card is local to it, not shared).
- listingCard: height 140 + overflow hidden -> minHeight 88, overflow removed.
- cardContent: height 100% -> alignItems flex-start, padding 12, gap 12.
- listingThumbnail: 100 x 100% with a border -> 88x88, radius 10, alignSelf flex-start,
  existing tinted tertiary bg, Image resizeMode cover when photos[0] exists, else a
  centered Ionicons category icon (CATEGORY_ICONS map, fallback pricetag-outline).
  Bare initials and the camera emoji are gone. All 8 icon names verified in Ionicons.json.
- listingDetails: added minWidth 0 (a long unbroken title was squeezing the price out)
  and gap 6; removed justifyContent space-between.
- Title 3 lines, price 1 line + adjustsFontSizeToFit/minimumFontScale 0.8,
  chips wrap with columnGap/rowGap 6 and 1 line + tail ellipsis, description 2 lines and
  omitted entirely when empty.
- filterScroll: height 56 + overflow hidden (this is what cut "Props & Acces") -> no fixed
  height; paddingRight 24 so the last chip scrolls fully clear.
- Listings FlatList: paddingBottom 24 + insets.bottom via useSafeAreaInsets
  (react-native-safe-area-context was already a dependency).
- No logic or data change. TypeScript clean apart from the 4 pre-existing
  VerifyStaffScreen errors; test:pure 61/61.
- No visual tool is available in this environment, so on-device checks are listed in the .md.

## STEP D - GUI .MD (DONE)
docs/changes/2026-10-02_marketplace-listing-card-layout.md, 50 lines, plain text, no emoji.

## STATUS: ALL STEPS DONE.
Both .md files written, TS clean (only the 4 pre-existing VerifyStaffScreen errors),
test:pure 61/61, no new dependency, theme tokens only.

## NOTE
The earlier curl harness plan is CANCELLED. The user tested the main chain manually and
it works, so no backend restart and no throwaway scripts are needed.
