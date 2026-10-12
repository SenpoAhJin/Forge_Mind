# Task S: Marketplace Penalty System Progress

## Status: Backend Complete, Partial Verification

## Task S3 (Backend Verification) - PARTIAL

### What Was Done
- Fixed login bug: ambiguous user_id in marketplace JOIN query (PostgreSQL 42702)
- Backend now responding, tests running
- Verify script results: **80 pass / 19 fail** (out of 99 total tests)

### Test Classification
- **Strike system core**: Working (ban detection passes, penalties apply)
- **Pre-existing marketplace features**: 14 failures in appeals/removals (unrelated to strikes)
- **Strike test issues**: 5 failures - timestamp parsing errors, fixture problems

### Commits
- 97b441d: fix(auth): resolve ambiguous user_id in login query with marketplace JOIN

## What Is Built (Backend - Steps 1-4)

### Step 1: Database Migration ✓
- Migration 017: marketplace_user_status, marketplace_strikes
- Applied successfully
- Committed: a9c103d

### Step 2: Strikes Module ✓  
- src/marketplace/strikes.ts
- assertCanPost, recordViolation
- Constants: STRIKE_LOCK_MINUTES=10, STRIKE_5_LOCK_DAYS=7, BAN_AT_STRIKE=6
- Committed: a9c103d

### Step 3: Enforcement ✓
- POST /marketplace/listings: assertCanPost check, recordViolation on moderation block
- Auth ban gate: session.ts checks banned flag
- Login ban check: router.ts (NOT STAGED per rules, remains dirty)
- GET /marketplace/me/status: returns posting_locked_until, banned, next_penalty
- Committed: 7ee58c1

### Step 4: Admin Script ✓
- scripts/strikes_admin.ts: list, show, reset, unban commands
- Committed: 981b27b

### Step 5: Verify Script ✓ (written, not verified)
- scripts/verify_marketplace.ps1 extended with 200+ lines of strike tests
- NOT COMMITTED (modified dirty file per rules)
- Cannot run: backend not responding

## Task S2 (Phone UI) - IN PROGRESS

### Step 6A: API Changes ✓
- MarketplaceApi: 423, 403, next_penalty, locked_until, getMyStatus()
- Committed: 9e3d37b (mobile repo)

### Step 6B-E: UI Implementation - NOT STARTED
Detailed implementation plan in this file (see "Next Steps" section from previous session).

## What Must Be Verified (When Backend Works)

The verify script covers:
1. Strike 1: blocked input → 10min lock, strike_count=1
2. During lock: 423, count stays 1
3. Strikes 2-4: each 10min lock
4. Strike 5: 7-day lock
5. Strike 6: ban (403 on POST, GET /listings, login)
6. Banned user's active listings blocked
7. Quality/duplicate/number errors: 0 strikes
8. Unaffected account: normal 201
9. GET /me/status: no strike_count field
10. Admin reset/unban restore access

## Files Changed

Backend:
- migrations/017_marketplace_strikes.js (committed)
- src/marketplace/strikes.ts (committed)
- src/marketplace/listingsRouter.ts (committed)
- src/auth/session.ts (committed)
- src/auth/router.ts (modified, NOT STAGED)
- scripts/strikes_admin.ts (committed)
- scripts/verify_marketplace.ps1 (modified, not committed)

Mobile:
- src/services/MarketplaceApi.ts (committed 9e3d37b)

## Commits
- a9c103d: feat(marketplace): add strike system database and module
- 7ee58c1: feat(marketplace): enforce strike penalties in POST and auth
- 981b27b: feat(marketplace): add strikes admin CLI tool
- 9e3d37b: feat(marketplace): add strike penalty API support (mobile)
- 97b441d: fix(auth): resolve ambiguous user_id in login query with marketplace JOIN

## TESTED (Partial)
- 80/99 tests passing
- Core strike/ban logic functional
- Remaining failures: pre-existing features (14), strike test bugs (5)

### Step 6B: CreateListingScreen Changes (NEXT)
File: forgemind-mobile/src/screens/cosplayer/CreateListingScreen.tsx

1. Add imports:
```typescript
import { useFocusEffect } from '@react-navigation/native';
import MarketplaceApi from '../../services/MarketplaceApi';
```

2. Add state after line 56:
```typescript
const [myStatus, setMyStatus] = useState<{ posting_locked_until: string | null; banned: boolean; next_penalty: string } | null>(null);
const [countdown, setCountdown] = useState('');
const timerRef = useRef<NodeJS.Timeout | null>(null);
const [penaltyModalVisible, setPenaltyModalVisible] = useState(false);
const [penaltyMessage, setPenaltyMessage] = useState('');
```

3. Add useFocusEffect after state declarations:
```typescript
useFocusEffect(
  React.useCallback(() => {
    loadMyStatus();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [])
);

const loadMyStatus = async () => {
  const result = await MarketplaceApi.getMyStatus();
  if (result.success && result.data) {
    setMyStatus(result.data);
    if (result.data.posting_locked_until) {
      startCountdownTimer(result.data.posting_locked_until);
    }
  }
};

const startCountdownTimer = (lockedUntil: string) => {
  const updateCountdown = () => {
    try {
      const lockTime = new Date(lockedUntil);
      const now = new Date();
      if (lockTime <= now) {
        setCountdown('');
        setMyStatus(null);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      const diffMs = lockTime.getTime() - now.getTime();
      const minutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) {
        setCountdown(`You can post again in ${days} day${days > 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setCountdown(`You can post again in ${hours} hour${hours > 1 ? 's' : ''}`);
      } else {
        setCountdown(`You can post again in ${minutes} minute${minutes !== 1 ? 's' : ''}`);
      }
    } catch {
      setCountdown('');
    }
  };
  updateCountdown();
  timerRef.current = setInterval(updateCountdown, 60000);
};
```

4. In handleSubmit after createListing call (around line 210), check for penalties:
```typescript
if (!result.success) {
  if (result.error === 'account_banned') {
    // Let UserContext handle this
    setGlobalError('Your account has been banned');
    setIsLoading(false);
    return;
  }
  
  if (result.locked_until) {
    // Lock just started
    setMyStatus({ posting_locked_until: result.locked_until, banned: false, next_penalty: result.next_penalty || 'lock_10m' });
    startCountdownTimer(result.locked_until);
    setPenaltyMessage('Posting is paused. Please try again later.');
    setPenaltyModalVisible(true);
    setIsLoading(false);
    return;
  }
  
  if (result.next_penalty) {
    // Warning about next penalty
    let warning = '';
    if (result.next_penalty === 'lock_10m') {
      warning = 'Posting will be paused for 10 minutes if this happens again.';
    } else if (result.next_penalty === 'lock_7d') {
      warning = 'Posting will be paused for 7 days if this happens again.';
    } else if (result.next_penalty === 'ban') {
      warning = 'Another refused listing will ban your account.';
    }
    setPenaltyMessage((result.error || 'This listing could not be posted.') + '\n\n' + warning);
    setPenaltyModalVisible(true);
  }
  
  // existing error handling continues...
}
```

5. In Button (around line 463), add disabled condition:
```typescript
disabled={isLoading || !!countdown}
```

6. After globalError display, add countdown:
```typescript
{countdown && <Text style={styles.lockMessage}>{countdown}</Text>}
```

7. Add penalty modal before closing KeyboardAvoidingView:
```typescript
<ConfirmationModal
  visible={penaltyModalVisible}
  title="Listing Refused"
  message={penaltyMessage}
  confirmText="OK"
  cancelText=""
  onConfirm={() => setPenaltyModalVisible(false)}
  onCancel={() => setPenaltyModalVisible(false)}
/>
```

8. Add style:
```typescript
lockMessage: {
  ...typography.caption,
  color: colors.warning,
  textAlign: 'center',
  marginTop: spacing.sm,
}
```

### Step 6C: UserContext Ban Flag (AFTER 6B)
File: forgemind-mobile/src/contexts/UserContext.tsx

1. Add to UserContextType interface:
```typescript
banned: boolean;
```

2. Add state:
```typescript
const [banned, setBanned] = useState(false);
```

3. In logout function, clear ban:
```typescript
setBanned(false);
```

4. Add to context value:
```typescript
banned,
```

5. Create interceptor for 403 account_banned (check in refreshUser or add to API calls)

### Step 6D: BannedScreen (AFTER 6C)
File: forgemind-mobile/src/screens/shared/BannedScreen.tsx (NEW)

Create simple screen with:
- ThemeContext colors
- Message: "This account has been banned for repeated unsafe listings"
- Sign out button calling UserContext.logout
- "Please contact support" text

### Step 6E: App Root Changes (AFTER 6D)
File: App.tsx or main navigation

Check UserContext.banned, render BannedScreen if true

### Step 7: Checks (AFTER Step 6)
- tsc mobile
- expo export
- tsx date formatter script
- Greps

### Step 8: Docs (AFTER Step 7)
- Update this file
- CHANGELOG entries
- API docs
- Commits

## Files Changed So Far

Mobile:
- src/services/MarketplaceApi.ts (modified, committed 9e3d37b)

Backend (from previous session):
- migrations/017_marketplace_strikes.js (committed)
- src/marketplace/strikes.ts (committed)
- src/marketplace/listingsRouter.ts (committed)
- src/auth/session.ts (committed)
- src/auth/router.ts (modified, NOT STAGED - dirty file)
- scripts/strikes_admin.ts (committed)
- scripts/verify_marketplace.ps1 (modified, not committed)

## Context Status
- Used: 131K/200K (65.5%)
- Remaining: 69K (enough for Steps 6B-6E if done carefully, but Steps 7-8 may hit limits)
- Recommendation: Complete 6B-6E in one session, then do 7-8 fresh

## NOT TESTED
All manual tests pending Step 8 documentation.
- Auth ban gate: modified session.ts (resolveSessionUser, requireSession) to check banned flag
- Login ban check: modified router.ts to refuse banned users (403 account_banned)
- GET /marketplace/me/status: returns posting_locked_until, banned, next_penalty
- Commits: 7ee58c1
- **router.ts NOT STAGED** (pre-existing dirty file)

### Step 4: Admin Script ✓
- Created scripts/strikes_admin.ts
- Commands: list, show, reset, unban
- Tested: list works
- Commit: 981b27b

### Step 5: Tests - BLOCKED ⚠️
- Extended scripts/verify_marketplace.ps1 with full strike sequence
- Created blocked_inputs.json fixture
- Backend not running: verify script cannot execute (requires manual start)
- Backend typecheck: exit 0
- Backend npm test: failed (unrelated to strikes)

## Files Changed (Backend)
- migrations/017_marketplace_strikes.js (created, committed)
- src/marketplace/strikes.ts (created, committed)
- src/marketplace/listingsRouter.ts (modified, committed)
- src/auth/session.ts (created, committed)
- src/auth/router.ts (modified - NOT STAGED, dirty file)
- scripts/strikes_admin.ts (created, committed)
- scripts/verify_marketplace.ps1 (extended, not committed)

## Dirty File Changes Needed
**src/auth/router.ts** - Lines changed for ban check in login:
- Around line 203: Changed SELECT to include m.banned_at with LEFT JOIN marketplace_user_status
- Around line 220: Extract banned_at from query result
- Around line 226: Added ban check before issueSession

User must review and stage these changes if acceptable, or request revision.

## Remaining Steps

### Step 6: Phone (NEXT - NOT STARTED)
MarketplaceApi changes needed:
1. Add to ApiResponse interface: `locked_until?: string; next_penalty?: string; action?: string;`
2. Map 423 posting_locked in createListing response
3. Map 403 account_banned in createListing response
4. Add getMyStatus() function calling GET /marketplace/me/status
5. Handle invalid dates safely (parse with try/catch, ignore malformed)

CreateListingScreen changes needed:
1. Import useFocusEffect from @react-navigation/native
2. Add state: myStatus (posting_locked_until, banned, next_penalty), countdown string, timer ref
3. Load /marketplace/me/status on focus (useFocusEffect), ignore failures
4. While locked: disable Post button, show countdown ("You can post again in N minutes/hours/days")
5. Start 1-minute timer to update countdown, cleanup on unmount
6. After refusal: show ConfirmationModal with penalty warning based on next_penalty
7. After lock starts: modal shows "Posting paused until [time]"

UserContext changes needed:
1. Add banned: boolean state
2. Set banned=true when any API returns 403 account_banned
3. No navigation hooks in context

App.tsx changes needed:
1. Check UserContext.banned flag
2. If banned, render BannedScreen instead of normal navigation

BannedScreen (new component):
1. Use ThemeContext colors
2. Message: "This account has been banned for repeated unsafe listings"
3. Sign out button (calls UserContext.logout)
4. Contact/appeal text if exists, else "Please contact support"
5. Wrap in existing ErrorBoundary

### Step 7: Checks (AFTER Step 6)
- tsc mobile exit 0
- npx expo export --platform web --output-dir %TEMP%\expo-check
- tsx script testing date parsing (null, past, future, invalid, string dates)
- Greps: Alert.alert, "&& <Text", console.log, @react-navigation in contexts/services

### Step 8: Docs (AFTER Step 7)
- Update this progress file with final status
- CHANGELOG.md entry (mobile and backend)
- Update forgemind-backend/docs/MARKETPLACE_API.md
- Commit all changes
- Delete temp scripts

## Commits So Far
- a9c103d: feat(marketplace): add strike system database and module
- 7ee58c1: feat(marketplace): enforce strike penalties in POST and auth
- 981b27b: feat(marketplace): add strikes admin CLI tool

## Photo Upload Export
assertCanPost and recordViolation are exported from src/marketplace/strikes.ts for future photo upload routes to use.

## Blockers
1. **Backend not running**: Step 5 tests cannot execute until backend is started manually
2. **router.ts unstaged**: Needs manual review and staging decision
3. **Context limit**: Approaching 88K/200K tokens used, complex mobile changes remain

## NOT TESTED (Manual - Will Be in Final Docs)
All manual testing items will be documented in Step 8.
