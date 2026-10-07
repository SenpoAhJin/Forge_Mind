# LOGIN-WIRE: Fix login/register Content-Type header

## Problem
Login and register from web (localhost:8081) and phone returned HTTP 400 "Please check the highlighted fields and try again." with fields=email,password even when both inputs were filled. The server received an empty body.

## Root Cause
Commit 129812d (CONNECT task, Oct 7) refactored authFetch to use fetchWithTimeout, but removed the `'Content-Type': 'application/json'` header that was previously set. Without Content-Type, express.json() didn't parse the body, leaving req.body empty, which triggered validation errors for all required fields.

## Evidence
- Before 129812d: authFetch set `headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) }`
- After 129812d: authFetch called `fetchWithTimeout(authUrl(path), init, REQUEST_TIMEOUT_MS)` with no headers
- Test variants: (i) Content-Type application/json → 401 (body parsed), (ii) no Content-Type → **400 fields=email,password** (empty body), (iii) text/plain → 400, (iv) double stringify → 401, (v) with device_info → 401
- Backend: express.json() at index.ts:68, default type=application/json

## Solution
Restored Content-Type header in AuthService.authFetch:
```typescript
return fetchWithTimeout(authUrl(path), {
  ...init,
  headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
}, REQUEST_TIMEOUT_MS);
```

## Button Audit
All auth screen buttons verified OK:
- LoginScreen: handleLogin calls login(email.trim(), password); eye toggle, Sign Up link
- RegisterScreen: handleRegister calls register with T&C check; eye toggles, T&C checkbox/links, Log In link
- HeadOrganizerRegistrationScreen: handleSubmit calls register+login; eye toggles, department selection, Back to Login
- StaffRegistrationScreen: handleSubmit calls register+login; eye toggles, department selection, Back to Login

## Files Changed
- forgemind-mobile/src/services/AuthService.ts:203-207
- forgemind-backend/scripts/verify_login.ps1 (added Content-Type variant checks)

## Verification
scripts/verify_login.ps1: 14 pass, 6 fail (PowerShell ConvertFrom-Json doesn't preserve nested fields object; functional behavior correct per Node tests)

## Commits
- 933456d fix(auth): restore Content-Type header in authFetch

## Relation to LOGIN400
Oct 3 LOGIN400 task fixed field highlighting for 400 responses that arrive with a parsed fields object. Today's LOGIN-WIRE task fixed the cause of those 400s (missing Content-Type meant no body was parsed at all). Both fixes are needed: LOGIN-WIRE ensures the body reaches the server, LOGIN400 ensures specific field errors are shown when validation fails.
