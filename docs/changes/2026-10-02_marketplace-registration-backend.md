# Marketplace registration: local-only save to backend DB

Date: 2026-10-02
Status: done. Backend verified 32 of 32 by script. End-to-end chain verified manually by the user (submit, Head sees pending, approve, access, reject, resubmit).

## Summary and why
"Register for Marketplace" saved to AsyncStorage only. No endpoint existed, so nothing reached PostgreSQL and the Head's Verify Cosplayers Pending tab stayed empty. A cosplayer saw "pending review", but no organizer could ever see or approve it: the submission lived on one phone and died with the app. Verification status is a server-side permission decision, so the submission that drives it has to be on the server. This adds the database write, the endpoints, server-side validation and permission checks, and makes the app submit through them.

## Migration 013_marketplace_registration_integrity
- marketplace_terms_accepted_at TIMESTAMPTZ: when T&C was ticked. The existing agreed_to_marketplace_terms boolean has no timestamp, so a rejection could not be dated.
- idx_users_marketplace_pending: partial index on marketplace_submitted_at for the Head pending queue (WHERE verification_status = 'pending').
- users_payout_method_number_digits: CHECK (payout_method_number IS NULL OR payout_method_number ~ '^[0-9]{7,20}$'), added NOT VALID. Enforced for every new or updated row; 3 pre-existing rows from before the numeric input fix are grandfathered rather than re-validated, so the migration cannot fail.

## No new table
No marketplace_registrations table. Migration 001 already put every registration column on users (marketplace_role, seller_display_name, marketplace_contact_email, marketplace_contact_phone, payout_method_label, payout_method_number, agreed_to_marketplace_terms, marketplace_submitted_at, marketplace_rejection_reason); 012 added rejection_reason, verified_by_user_id and verified_at. A second table would duplicate the data.

## Endpoints
| Method | Path | Who | What |
|---|---|---|---|
| POST | /marketplace/registration | Cosplayer | Upsert own row, set status pending, clear rejection and verification fields. Returns it, masked. 409 when verified or revoked. |
| GET | /marketplace/registration/me | Cosplayer | Own registration, masked payout. |
| GET | /users | Head | Adds a masked registration object per user. |
| GET /auth/me, POST /auth/login | Any | Any | Attach marketplace_registration, masked. |
| PATCH | /users/:id/verification | Head | Returned SELECT *, now the named public columns. |

Identity comes from the session; user_id and verification_status in a body are ignored, so a caller cannot write to another account or set its own status.

## Validation rules (400 with per-field messages)
marketplace_role one of buyer, seller, both. seller_display_name 2 to 40. marketplace_contact_email valid format, 255 max, lowercased. marketplace_contact_phone optional; spaces, dashes, dots and brackets stripped first, then digits only, 7 to 15. payout_method_label required for seller and both, 2 to 40. payout_method_number required for seller and both, digits only, 7 to 20, not required for buyer. agreed_to_marketplace_terms must be exactly true. All strings trimmed.

## Security fixes
- GET /auth/me returned 500 "column reference user_id is ambiguous": the unqualified column list was used over the sessions/users JOIN. Now qualified, so refreshUser() works at all.
- PATCH /users/:id/verification used RETURNING *, leaking password_hash and the full payout number to any Head. Now returns the named public columns.
- payout_method_number was in USER_PUBLIC_COLUMNS, so login and /auth/me returned the full account number. Removed; it is now selected only to derive the masked form and deleted from the payload. No endpoint returns a full one.

## Files changed
Backend (forgemind-backend): migrations/013_marketplace_registration_integrity.js (new migration); src/marketplace/registration.ts (new: validation, masking, projections); src/marketplace/router.ts (new: POST and GET registration); src/auth/session.ts (new: shared resolveSessionUser and requireSession); src/index.ts (mounts /marketplace); src/auth/publicUser.ts (payout column removed, qualified columns, masking); src/auth/router.ts (login and /auth/me attach the masked registration); src/users/router.ts (GET /users adds masked registration, RETURNING * fixed).

Mobile (forgemind-mobile): src/types/api/marketplace.ts (new, shared types and length constants); src/services/MarketplaceService.ts (new, submitRegistration and getMyRegistration); src/screens/cosplayer/MarketplaceRegistrationScreen.tsx (submits via the service); src/services/AuthService.ts (local submit deleted, server wins on sync, ApiUser exported); src/contexts/UserContext.tsx (refresh goes through AuthService.accountFromServerUser, no raw spread); src/services/UserService.ts (refreshCurrentUser returns ApiUser, no any); src/screens/organizer/VerifyCosplayersScreen.tsx (real card fields, four states); src/types/api/users.ts (registration on UserListItem).

## Before/After
- Before: submit wrote AsyncStorage and showed "pending review"; the Head saw an empty Pending tab; a failed request also looked empty.
- After: submit POSTs and the success modal appears only on a 200; the row is in PostgreSQL with status pending and terms_accepted_at set; the Head's Pending tab lists it with masked payout; refreshUser() pulls the new status. A network failure keeps the form and says it could not reach the server.

## Terms required
The checkbox starts unchecked, blocks submit, and shows "You must agree to the Marketplace Terms & Conditions to register." inline under the checkbox. It clears when ticked. The server independently rejects agreed_to_marketplace_terms !== true with 400, and that 400 maps to the same message. Edit Submission requires it too.

## Legacy state
An old device can hold a local pending or verified status while the database says not_submitted. refreshUser() overwrites verification_status and the registration from /auth/me, and the sync no longer preserves a local-only registration, so the server always wins and the form reappears. Nothing is migrated: a user with an old local-only submission must submit once more.

## Terms audit
| File | Feature | Required client | Enforced server | Timestamp |
|---|---|---|---|---|
| screens/auth/RegisterScreen.tsx | Account sign-up T&C | yes, blocks submit | no, not sent | no, data_consent_given defaults false |
| screens/cosplayer/MarketplaceRegistrationScreen.tsx | Marketplace T&C | yes, inline error | yes, 400 | yes, marketplace_terms_accepted_at |
| components/ConsentBanner.tsx | Re-consent after policy version bump | dismissible banner | no | no |
| constants/policies.ts, components/TermsModal.tsx | Policy text and viewer | n/a | n/a | version string only |

## How to test
1. Cosplayer: Register for Marketplace, choose Seller, leave the box unticked, submit: blocked with the inline message. Tick it, submit: success modal.
2. Head, Pending tab: the cosplayer is listed with display name, role, contact email, contact phone, payout method and a masked payout. Approve.
3. Cosplayer resumes the app without logging out: access granted.
4. Head rejects a second cosplayer with a reason. Cosplayer sees it, edits and resubmits: back in Pending, reason cleared.

## Known limits
- Payout account numbers are plain text in this prototype. Encrypt or tokenise before any real payment integration.
- Local registrations from the AsyncStorage era are not migrated.
- 3 grandfathered rows still hold non-numeric payout values. The CHECK is NOT VALID, so they persist until edited.
- Revoke still reuses the reject endpoint; there is no revoke transition yet.

## Follow-ups
- Move sign-up consent server-side with a timestamp and the policy version, so consent is provable from the database. ConsentBanner persists nothing today.
- Add a real revoke transition instead of reusing reject.
- Clean the 3 grandfathered payout rows, then VALIDATE the CHECK.