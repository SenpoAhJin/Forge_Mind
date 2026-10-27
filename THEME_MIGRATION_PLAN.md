# Theme Migration Plan - Dynamic Colors

## Issue
The app currently has **67 files** importing static `colors` from `theme/index.ts`, which always returns light mode colors regardless of the user's theme preference. This causes:
- Text invisibility in dark mode
- Incorrect UI colors across the app
- AppearanceHubScreen works because it uses `useTheme()`, but most screens don't

## Root Cause
`src/theme/colors.ts` exports a static `colors` constant:
```typescript
export const colors = lightColors;  // ALWAYS LIGHT MODE
```

All imports like `import { colors } from '../../theme'` get this static value.

## Solution
Replace static `colors` imports with dynamic `useTheme()` hook:

### Before (Static - WRONG):
```typescript
import { colors, typography } from '../../theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,  // Always light
  },
});
```

### After (Dynamic - CORRECT):
```typescript
import { typography } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

const MyComponent = () => {
  const { themeColors: colors, isDark } = useTheme();
  
  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.background,  // Dynamic!
    },
  }), [colors]);
  
  return <View style={styles.container}>...</View>;
};
```

## Files Requiring Migration (67 total)

### Priority 1 - Critical User-Facing Screens (10 files)
- [x] src/screens/auth/LoginScreen.tsx ✅ DONE
- [x] src/screens/auth/RegisterScreen.tsx ✅ DONE
- [x] src/navigation/RootNavigator.tsx ✅ DONE
- [ ] src/screens/cosplayer/ProjectsScreen.tsx (HOME SCREEN)
- [ ] src/screens/cosplayer/ProjectDashboardScreen.tsx
- [ ] src/screens/cosplayer/CharacterBrowseScreen.tsx
- [ ] src/screens/shared/ProfileScreen.tsx
- [ ] src/screens/shared/AppearanceHubScreen.tsx (already uses useTheme partially)
- [ ] src/screens/organizer/EventsListScreen.tsx
- [ ] src/screens/organizer/LogisticsHomeScreen.tsx

### Priority 2 - Components (17 files)
- [ ] src/components/inputs/DateInput.tsx
- [ ] src/components/inputs/TimePickerInput.tsx
- [ ] src/components/inputs/Slider.tsx
- [ ] src/components/BodyTypeSelector.tsx
- [ ] src/components/ConsentBanner.tsx
- [ ] src/components/ErrorBoundary.tsx
- [ ] src/components/PhotoUploadSection.tsx
- [ ] src/components/Preview3D.tsx
- [ ] src/components/StandardCard.tsx
- [ ] src/components/Button.tsx
- [ ] src/components/TextInputField.tsx
- [ ] src/components/StatusBadge.tsx
- [ ] src/components/Tag.tsx
- [ ] src/components/Modal.tsx
- [ ] src/components/ThreeDPreview.tsx
- [ ] src/components/ProgressBar.tsx
- [ ] src/components/RegistrationSuccessModal.tsx

### Priority 3 - Navigation (2 files)
- [x] src/navigation/CosplayerTabNavigator.tsx ✅ DONE
- [ ] src/navigation/AuthNavigator.tsx
- [ ] src/navigation/OnboardingNavigator.tsx

### Priority 4 - Remaining Screens (38 files)
- ChatListScreen, ChatThreadScreen, ContestsListScreen
- CreateInviteMeetupScreen, CreateListingScreen, CreateProjectScreen
- EntryMethodScreen, EventMeetupsScreen, InviteMeetupDetailScreen
- ItemConfirmationScreen, JoinInviteMeetupScreen, ListingDetailScreen
- MarketplaceScreen, OfferDetailScreen, OwnedItemDashboard
- And 22 more...

## Migration Steps (Per File)

1. **Remove static colors import:**
   ```diff
   - import { colors, typography, spacing } from '../../theme';
   + import { typography, spacing } from '../../theme';
   + import { useTheme } from '../../contexts/ThemeContext';
   ```

2. **Add useTheme hook at component top:**
   ```typescript
   const { themeColors: colors, isDark } = useTheme();
   ```

3. **Move StyleSheet.create to useMemo:**
   ```diff
   - const styles = StyleSheet.create({ ... });
   + const styles = useMemo(() => StyleSheet.create({ ... }), [colors]);
   ```

4. **Replace alpha/tint logic:**
   ```diff
   - backgroundColor: colors.primary + '10',
   + backgroundColor: withAlpha(colors.primary, isDark ? 0.20 : 0.10),
   ```

5. **Test in light & dark modes**

## Quick Win: Deprecate Static Export

Option A: Remove static export entirely
```typescript
// src/theme/colors.ts
- export const colors = lightColors;  // REMOVE THIS
```

Option B: Add runtime warning
```typescript
export const colors = new Proxy(lightColors, {
  get(target, prop) {
    console.warn('Static colors import detected! Use useTheme() instead.');
    return target[prop as keyof typeof lightColors];
  },
});
```

## Automated Migration Script (Optional)

```bash
# Find all files with static colors import
find src -name "*.tsx" -exec grep -l "import.*colors.*from.*theme" {} \;

# Replace pattern (requires manual review)
sed -i 's/import { colors,/import {/g' FILE
sed -i '/import.*theme/a import { useTheme } from '\''../../contexts/ThemeContext'\'';' FILE
```

## Testing Checklist
- [ ] Toggle System/Light/Dark in AppearanceHub
- [ ] Check all tabs: Home, Characters, My Items, Marketplace, Profile
- [ ] Check Organizer tabs: Events, Logistics
- [ ] Verify text readability in dark mode
- [ ] Check modals/overlays
- [ ] Test auth screens (Login/Register)

## Timeline Estimate
- Priority 1 (10 files): 4-6 hours
- Priority 2 (17 files): 6-8 hours  
- Priority 3 (2 files): 1 hour
- Priority 4 (38 files): 12-15 hours
- **Total: ~25-30 hours** of focused work

## Notes
- `ThemeModeControl` component (44x44 buttons, accessibility labels) is ready for reuse
- `withAlpha()` helper is in `theme/colors.ts`
- `useTheme()` hook returns: `{ themeColors, isDark, mode, setMode, isLoading, toggleTheme }`
- Legacy color names still exist for backward compatibility during migration
