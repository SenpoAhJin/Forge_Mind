# FE-4.5 Test Procedure: Persisted Register/Login (Mock Auth)

## Date: Wed, Sept 16, 2026

## Test Objective
Verify that multi-account registration, login, logout, and holder verification persist correctly across sessions and app reloads.

## Prerequisites
- Expo dev server running: `npm start` in forgemind-mobile/
- Test device/emulator connected
- Fresh app state (or use "Reset Onboarding" in dev mode to clear all accounts)

## Test Scenarios

### Scenario 1: Register Cosplayer Account

**Steps:**
1. Launch app (should show Login/Register screen)
2. Tap "Sign Up" to switch to Register screen
3. Fill in registration form:
   - Select "Cosplayer" role (checkbox should show selected state)
   - Display Name: "Alice Cosplay"
   - Email: "alice@cosplay.test"
   - Password: "password123"
   - Confirm Password: "password123"
4. Tap "Create Account"

**Expected Results:**
- Account created successfully
- Auto-login occurs
- User is taken to main Cosplayer tab set
- Profile screen shows:
  - Display name: "Alice Cosplay"
  - Email: "alice@cosplay.test"
  - Role badge: "Cosplayer" only
  - Verification status: "Pending"

### Scenario 2: Logout and Verify Account Persists

**Steps:**
1. Navigate to Profile tab
2. Tap "Log Out" button
3. Confirm logout in alert dialog

**Expected Results:**
- Returned to Login screen
- Can log back in with alice@cosplay.test / password123
- All account data restored (name, role, body settings)

### Scenario 3: Register Organizer Account

**Steps:**
1. From Login screen, tap "Sign Up"
2. Fill in registration form:
   - Select "Event Organizer" role only
   - Display Name: "Bob Events"
   - Email: "bob@events.test"
   - Password: "password456"
   - Confirm Password: "password456"
3. Tap "Create Account"

**Expected Results:**
- Account created successfully
- Auto-login occurs
- User is taken to Organizer tab set (different from Alice's)
- Profile screen shows:
  - Display name: "Bob Events"
  - Email: "bob@events.test"
  - Role badge: "Organizer" only
  - Verification status: "Pending"

### Scenario 4: Holder Verification Persistence

**Steps:**
1. While logged in as Bob Events
2. Navigate to Profile tab
3. In Test Mode section (dev only), tap "Verified Holder" chip

**Expected Results:**
- Verification status changes to "Verified"
- Test Mode hint updates to indicate persistence

**Verification of Persistence:**
4. Tap "Log Out"
5. Log back in as bob@events.test / password456

**Expected Results:**
- Verification status still shows "Verified"
- is_holder_verified persists across logout/login

### Scenario 5: Switch Between Accounts

**Steps:**
1. Log out from Bob's account
2. Log in as alice@cosplay.test / password123
3. Verify Cosplayer tab set appears
4. Log out
5. Log in as bob@events.test / password456
6. Verify Organizer tab set appears

**Expected Results:**
- Each account maintains its own:
  - Display name
  - Role(s)
  - Body representation settings
  - Verification status
- No data leakage between accounts

### Scenario 6: App Reload Persistence

**Steps:**
1. While logged in as any account
2. Force-quit the app
3. Relaunch the app

**Expected Results:**
- App loads with last logged-in account still active
- No return to Login screen
- All account data intact
- Correct tab set displayed based on roles

### Scenario 7: Invalid Login

**Steps:**
1. Log out if currently logged in
2. Attempt login with:
   - Email: "alice@cosplay.test"
   - Password: "wrongpassword"
3. Tap "Log In"

**Expected Results:**
- Error message: "Invalid email or password"
- Remains on Login screen
- No account access granted

### Scenario 8: Duplicate Email Prevention

**Steps:**
1. From Login screen, tap "Sign Up"
2. Attempt to register with existing email:
   - Email: "alice@cosplay.test"
   - Display Name: "Alice Duplicate"
   - Password: "password789"
3. Tap "Create Account"

**Expected Results:**
- Error message: "An account with this email already exists"
- Registration fails
- Remains on Register screen

### Scenario 9: Test Mode vs Real Auth

**Steps:**
1. Log in as any account
2. Navigate to Profile tab
3. In Test Mode section, tap role chips (Cosplayer only, Organizer only, Both roles)

**Expected Results:**
- Role changes work immediately (in-memory only)
- Tab set switches accordingly if both roles selected
- After logout and re-login, roles revert to original registered values
- Only "Verified Holder" persists across logout/login

### Scenario 10: Reset Onboarding (Dev Only)

**Steps:**
1. Log in as any account
2. Navigate to Profile tab
3. Tap "Reset Onboarding (Delete All Accounts)"
4. Confirm in alert dialog

**Expected Results:**
- All accounts deleted from storage
- Active session cleared
- Returned to Register/Login screen
- Cannot log in with previously created accounts

## AsyncStorage Data Shape Verification

**Storage Keys:**
- `@forgemind:accounts` - Array of StoredAccount objects
- `@forgemind:active_session` - Currently logged-in StoredAccount object

**StoredAccount Schema:**
```typescript
{
  email: string;                        // User.email (String(255))
  password_hash: string;                // User.password_hash (plaintext for now)
  display_name: string;                 // User.display_name (String(100))
  is_cosplayer: boolean;                // User.is_cosplayer
  is_organizer: boolean;                // User.is_organizer
  base_body_selection: 'male' | 'female'; // User.base_body_selection
  body_size_slider: number;             // User.body_size_slider (0.0-1.0)
  is_holder_verified: boolean;          // User.is_holder_verified
  verification_status: 'pending' | 'verified' | 'rejected' | 'revoked'; // User.verification_status
}
```

## Success Criteria

All scenarios pass with:
- ✓ Multi-account storage working
- ✓ Login/logout working correctly
- ✓ Role-based tab navigation working
- ✓ Holder verification persists across logout/login
- ✓ Test Mode persona switcher works alongside real auth
- ✓ Reset Onboarding properly clears all data
- ✓ App reload restores active session
- ✓ No data leakage between accounts
- ✓ Schema field names match v0.2.1 exactly

## Known Limitations (as designed)

1. Passwords stored in plaintext (real hashing deferred to BE-1)
2. No email verification flow (mock auth only)
3. No password reset/recovery (mock auth only)
4. Role changes via Test Mode are in-memory only (except holder verification)
5. Body representation uses defaults on registration (can customize later)
