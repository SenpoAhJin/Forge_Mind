# Two-Tone Theme Root Cause Fix Report

**Date:** October 22, 2026  
**Branch:** `feature/two-tone-theme`  
**Commit:** `49726ee`

## Problem Identified

The app was displaying in light mode instead of dark mode despite the dark mode toggle being ON. This was caused by:

1. **Root Cause #1:** StandardCard and all other components using legacy `backgroundLight` token instead of theme-aware `background` token
2. **Root Cause #2:** ThemeContext already defaulted to dark mode correctly (`useState(true)` on line 37) ✅

## Solution Implemented

### Replaced Legacy Token Usage

Replaced all instances of `backgroundLight` legacy token with proper theme-aware tokens across **50+ files**:

- **Modal backgrounds:** `backgroundLight` → `background`
- **Card backgrounds:** `backgroundLight` → `card` (for Card.tsx specifically)
- **Text on accent buttons:** `backgroundLight` → `background` (WHITE in dark mode, BLACK in light mode)
- **Navigation header text:** `backgroundLight` → `background`
- **All other backgrounds:** `backgroundLight` → `background`

### Files Modified (50+)

**Components:**
- AppealModal.tsx
- ConfirmationModal.tsx
- ConsentBanner.tsx
- ErrorBoundary.tsx
- ListingBlockedModal.tsx
- MarketplaceRegistrationSuccessModal.tsx
- Preview3D.tsx
- RejectionReasonModal.tsx
- RegistrationSuccessModal.tsx
- ServerStatusBanner.tsx
- StaffPickerModal.tsx
- StatusNotificationModal.tsx
- TermsModal.tsx
- buttons/Button.tsx
- cards/Card.tsx ⭐ (key fix)
- chat/ChatBubble.tsx
- inputs/DateInput.tsx
- inputs/Input.tsx
- inputs/TimePickerInput.tsx
- tags/Tag.tsx
- PhotoUploadSection.tsx

**Navigation:**
- AuthNavigator.tsx
- CharacterStackNavigator.tsx
- CosplayerTabNavigator.tsx
- EventsStackNavigator.tsx
- LogisticsStackNavigator.tsx
- MarketplaceStackNavigator.tsx
- OnboardingNavigator.tsx
- OrganizerTabNavigator.tsx
- OwnedItemStackNavigator.tsx
- ProfileStackNavigator.tsx
- ProjectStackNavigator.tsx
- RootNavigator.tsx

**Screens:**
- auth/LoginScreen.tsx
- auth/RegisterScreen.tsx
- cosplayer/CommissionProgressScreen.tsx
- cosplayer/CreateProjectScreen.tsx
- dev/HeadOrganizerRegistrationScreen.tsx
- dev/StaffRegistrationScreen.tsx
- onboarding/AccountCreationScreen.tsx
- onboarding/RoleSelectionScreen.tsx
- onboarding/WelcomeScreen.tsx
- organizer/CalendarApprovalScreen.tsx
- organizer/EventDetailScreen.tsx
- organizer/EventLogisticsScreen.tsx
- organizer/EventsScreen.tsx
- organizer/GroupMeetupScreen.tsx
- organizer/LogisticsEntryDetailScreen.tsx
- organizer/LogisticsHomeScreen.tsx
- organizer/ManageStaffScreen.tsx
- shared/ComponentShowcaseScreen.tsx
- shared/DiagnosticsScreen.tsx
- testing/FE-5-5-PhoneFrameTest.tsx

## Theme Token Reference

### Correct Usage (Two-Tone BLACK + PINK + WHITE)

```typescript
// Dark Mode
background: '#000000'  // BLACK - screen backgrounds, modal backgrounds
surface: '#1A1A1A'     // Near-black - cards, inputs (slightly elevated)
card: '#0D0D0D'        // Very dark gray - card backgrounds (elevated from background)
primary: '#000000'     // BLACK - primary actions
accent: '#FF8FB1'      // PINK - highlights, active states
textPrimary: '#FFFFFF' // WHITE - main text

// Light Mode
background: '#FFFFFF'  // WHITE - screen backgrounds, modal backgrounds
surface: '#F5F5F5'     // Off-white - cards, inputs (slightly recessed)
card: '#FAFAFA'        // Near-white - card backgrounds (slightly recessed from background)
primary: '#000000'     // BLACK - primary actions
accent: '#FF8FB1'      // PINK - highlights, active states
textPrimary: '#000000' // BLACK - main text
```

### Legacy Aliases (Kept for Migration)

```typescript
// DEPRECATED - Remove after migration complete
backgroundLight: background  // Use 'background' instead
backgroundDark: surface      // Use 'surface' instead
secondary: accent            // Use 'accent' instead
tertiary: accent             // Use 'accent' instead
error: warning               // Use 'warning' instead (ERROR NOT IMPLEMENTED)
```

## TypeScript Status

**Before:** 471 errors  
**After:** 22 errors (all pre-existing in scripts-backup/ and CreateListingScreen)  
**src/ folder:** ✅ 0 errors

## Expected Behavior Now

1. **App launches in dark mode by default** (black background, white text)
2. **Cards display with proper dark backgrounds** (`card` token = #0D0D0D)
3. **All modals use dark backgrounds** (`background` token = #000000)
4. **Toggle switches to light mode correctly** (white background, black text)
5. **Theme persists across app restarts** (AsyncStorage)

## Verification Steps

1. ✅ Replaced all `backgroundLight` legacy tokens
2. ✅ Committed changes (commit `49726ee`)
3. ⏳ **TODO:** Test app in Expo Go to verify dark mode displays correctly
4. ⏳ **TODO:** Test theme toggle switches between dark/light properly
5. ⏳ **TODO:** Test cards show proper backgrounds in both modes

## Notes

- Dark mode is already the default in ThemeContext (line 37: `useState(true)`)
- All backgrounds now respect theme mode properly
- Cards use `card` token, modals/screens use `background` token
- Layout tokens preserved: spacing 4,8,12,16,24,32; screenPadding 16
- Toggle colors fixed: track off WHITE/BLACK 40%, track on PINK, knob WHITE/BLACK

## Next Steps

1. Test in Expo Go to verify dark mode displays correctly
2. Check all screens render with proper BLACK + PINK + WHITE palette
3. Verify toggle switches between modes smoothly
4. Remove legacy aliases once all old code migrated
