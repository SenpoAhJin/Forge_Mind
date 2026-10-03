# Marketplace payout number: digits-only input

Date: 2026-10-02
Scope: forgemind-mobile UI + client validation only. No backend change.

## Summary
The Marketplace Registration screen (Register for Marketplace -> Payout Information)
accepted any characters in the Payout "Account/Phone Number" field. It is now
digits-only, with a 7 to 20 digit range check. Contact Phone uses the same filter.

## Why
A seller could type "Vecsgjbfs" into the payout account field and submit the
registration successfully. That value is a payment destination, so non-numeric
input is always a mistake, and it was stored as-is.

## Files changed
- src/utils/inputFilters.ts (new) - digitsOnly(text) helper, strips all non-digits.
- src/components/inputs/Input.tsx - TextInputField now accepts inputMode, maxLength and 'number-pad'; number-pad skips auto title-case.
- src/screens/cosplayer/MarketplaceRegistrationScreen.tsx - payout number filter + validation, contact phone filter, submit-time sanitize.

## Before/After behavior
- Before: typed and pasted letters, spaces, dashes and emoji were kept; submit passed.
- After: letters, spaces, dashes, plus signs and emoji never enter the field.
- Paste "09 17-123 4567" becomes 09171234567.
- Helper text ("Examples: GCash number...") and all layout/styling unchanged.

## Validation rules
- Charset: 0-9 only (enforced by filter on every change, on web too).
- Required when role is Seller or Both; not required for Buyer.
- Min length: 7 digits. Max length: 20 digits (also the maxLength cap).
- Error text: "Numbers only, 7 to 20 digits", inline under the field, existing
  TextInputField error style. Submit is blocked until valid; error clears on valid
  input. Contact Phone has no length rule and none was added.

## Where else the payout field appears
- screens/cosplayer/MarketplaceRegistrationScreen.tsx - the only editable payout
  number input. Fixed.
- components/MarketplaceRegistrationSuccessModal.tsx - shows payout method label
  only, no number input. No change.
- screens/organizer/VerifyCosplayersScreen.tsx - organizer review card. Payout
  details are not returned by the API and are not editable. No change.
- No profile payout settings screen exists in the app yet.

## How to test
1. Marketplace -> Register for Marketplace, pick Seller or Both.
2. Type letters in Account/Phone Number: nothing appears.
3. Paste "09 17-123 4567": field shows 09171234567.
4. Enter 3 digits, tap Submit for Review: blocked, inline error shown.
5. Enter 11 digits, tap Submit for Review: submits.
6. Repeat 2 to 5 after "Edit Submission" from the success modal.
7. Repeat on web (npx expo start --web) and on Android.

## Known limits / follow-ups
- Backend validation is NOT done yet. Any client, including a direct API call,
  can still store a non-numeric payout_method_number. Planned as the next step:
  add a digits-only and length constraint server side, and backfill/clean existing
  rows that hold letters.
- The field is not prefilled from a previous registration on this screen, so there
  is no stored-with-letters value to sanitize on load today. The Edit Submission
  button re-applies the filter and re-validates before returning to the form.
- Formatting rules differ per bank and per GCash/PayMaya (11 digits). Current
  range 7 to 20 is deliberately permissive; per-method rules can come later.
- Payout fields are still demo only and not encrypted (existing banner).
