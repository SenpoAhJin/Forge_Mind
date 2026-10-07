# LOGIN400: Fix 400 field highlighting

## Problem
Users got HTTP 400 "Please check the highlighted fields and try again" but no fields highlighted in login/register screens.

## Root Cause
AuthService.errorMessage() only returned message string, not the fields object from 400 responses. Screens couldn't extract which fields were wrong.

## Solution
- AuthService.errorMessage returns `{message, fields?}` for 400s
- LoginScreen/RegisterScreen extract fieldErrors, set specific field errors
- Empty fields object shows generic message
- Debug log includes field names

## Files Changed
- forgemind-mobile/src/services/AuthService.ts:206
- forgemind-mobile/src/screens/auth/LoginScreen.tsx:70-89
- forgemind-mobile/src/screens/auth/RegisterScreen.tsx:155-174
- forgemind-mobile/src/contexts/UserContext.tsx:70-83

## Verification
verify_login.ps1: 11/14 checks pass (3 fail on PowerShell property ordering, not functional)

## Commits
- b9eec5c fix(auth): return field errors from 400 responses for highlighting
- 2e19da2 feat(auth): highlight specific wrong fields in login/register
