# ForgeMind Mobile App

**Version:** FE-1 (Foundation & Design System)  
**Date:** September 15, 2026  
**Framework:** Expo SDK with React Native + TypeScript

---

## Project Status

✅ **FE-1 Complete** — App shell and design system ready  
🔧 **Next Phase:** FE-2 (Onboarding & Body Slider)

---

## Quick Start

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm start
```

### Run on Platform
```bash
npm run ios      # iOS simulator (macOS only)
npm run android  # Android emulator
npm run web      # Web browser
```

---

## Project Structure

```
forgemind-mobile/
├── src/
│   ├── theme/           # Design system tokens (colors, typography, spacing)
│   ├── components/      # Reusable components (buttons, cards, inputs, etc.)
│   ├── navigation/      # Navigation structure (role-based tabs)
│   └── screens/         # Screen components (cosplayer, organizer, shared)
├── App.tsx              # Entry point
└── package.json
```

---

## Features Implemented (FE-1)

### Design System
- ✅ Complete color palette (17 colors from Phase 0 spec)
- ✅ Typography scale (H1-H3, Body, Caption, Button Text)
- ✅ 4 button variants (primary, secondary, tertiary, destructive)
- ✅ 3 card types (standard, item/marketplace, match/character)
- ✅ 3 tag types (match rating, status, category)
- ✅ 2 slider types (body size continuous, condition discrete)
- ✅ 3 chat bubble types (sender, receiver, system)
- ✅ Status badges (8px dot + text)
- ✅ 4 input types (text, textarea, dropdown, photo upload)

### Navigation
- ✅ Role-based navigation (cosplayer/organizer toggle)
- ✅ Cosplayer tabs: Home (Projects), Character Browse, Marketplace, Profile
- ✅ Organizer tabs: Events, Logistics, Meetups, Profile
- ✅ All screens navigable (placeholder content)

---

## What's NOT in FE-1 (Coming in FE-2+)

- ❌ Real data (all screens are placeholders)
- ❌ Backend integration (no API calls)
- ❌ Authentication (role switcher uses mock state)
- ❌ Tab bar icons (empty placeholders)
- ❌ Custom Inter font (using system fonts)
- ❌ Dropdown picker modal (shell only)
- ❌ Image picker integration (shell only)

---

## Component Showcase (Dev/QA)

A `ComponentShowcaseScreen` exists at `src/screens/shared/ComponentShowcaseScreen.tsx` demonstrating all design system components. Not in navigation by default — add manually for QA:

1. Edit `src/navigation/CosplayerTabNavigator.tsx`
2. Import: `import { ComponentShowcaseScreen } from '../screens/shared/ComponentShowcaseScreen';`
3. Add tab:
   ```tsx
   <Tab.Screen
     name="Showcase"
     component={ComponentShowcaseScreen}
     options={{ tabBarLabel: 'Components' }}
   />
   ```

---

## Design System Usage

### Import Components
```tsx
import { Button, StandardCard, Tag, StatusBadge } from '../components';
import { colors, typography, spacing } from '../theme';
```

### Button Example
```tsx
<Button
  title="Save Project"
  onPress={() => console.log('Saved')}
  variant="primary"
  fullWidth
/>
```

### Card Example
```tsx
<ItemCard
  photoUrl="https://example.com/wig.jpg"
  title="White Long Wig"
  price={1500}
  condition={4}
  onPress={() => navigateToListing()}
/>
```

### Tag Example
```tsx
<Tag type="match" rating="exact" />
<Tag type="status" label="Active" />
```

---

## Tech Stack

- **Framework:** Expo SDK 57
- **Language:** TypeScript 6.0
- **UI:** React Native 0.86
- **Navigation:** React Navigation 7
- **Slider:** @react-native-community/slider 5.2

---

## Folder Conventions

- **Theme tokens:** `src/theme/` — Design system constants (colors, typography, spacing)
- **Components:** `src/components/[category]/` — Reusable components organized by type
- **Screens:** `src/screens/[role]/` — Screen components organized by user role
- **Navigation:** `src/navigation/` — Navigation structure and tab navigators

---

## Known Issues

1. **Tab bar icons are empty** — Icon library not chosen yet
2. **Dropdown fields don't open pickers** — Picker integration deferred to FE-2+
3. **Photo upload doesn't open image picker** — Image picker integration deferred to FE-2+
4. **Body size slider has no gradient** — React Native limitation, approximated with solid color
5. **Using system fonts, not Inter** — Custom font loading deferred to FE-2+

None of these block FE-2 development.

---

## Documentation

- **Full Deliverable Report:** `FE-1_DELIVERABLE_REPORT.md`
- **Phase 0 Spec:** `ForgeMind_Phase0_Foundation.md` (v0.2.1)
- **Schema Corrections:** `SCHEMA_CORRECTIONS_v0.2.md`

---

## Contact

**Project:** ForgeMind — AI-Assisted Cosplay Platform  
**Phase:** FE-1 (Foundation & Design System)  
**Status:** ✅ Complete, ready for FE-2

---
