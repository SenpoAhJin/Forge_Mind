# ForgeMind Mobile App

**Version:** FE-5 (Owned-Item Logging)  
**Date:** September 16, 2026  
**Framework:** Expo SDK with React Native + TypeScript

---

## Project Status

✅ **FE-1 Complete** — Design system + role-based app shell  
✅ **FE-2 Complete** — Onboarding flow (Welcome → Role → Account → Body Slider)  
✅ **FE-3 Complete** — Character browse, variant selection, match results  
✅ **FE-4 Complete** — Projects, dashboard, create project, readiness score  
✅ **FE-4.5 Complete** — Persisted mock auth (AsyncStorage), login/register, logout  
✅ **FE-5 Complete** — **Owned-item logging** (photo / text / voice entry)  
🔧 **Next Phase:** FE-6 (Marketplace)

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
npm run web      # Web browser (fastest for testing — recommended)
```

---

## Project Structure

```
forgemind-mobile/
├── src/
│   ├── theme/           # Design system tokens (colors, typography, spacing)
│   ├── components/      # Reusable components (buttons, cards, inputs, sliders)
│   ├── navigation/      # Navigation structure (role-based tabs + stacks)
│   ├── contexts/        # State: User, Selection, Projects, OwnedAttire
│   ├── types/           # Schema-mirroring TS interfaces (snake_case)
│   ├── data/            # Mock seeds (characters, variants, projects, owned attire)
│   ├── utils/           # Readiness formula, mock catalog helpers
│   └── screens/         # Screen components (cosplayer, organizer, shared)
├── App.tsx              # Entry point (providers + phone-frame on web)
└── package.json
```

---

## Features Implemented

### FE-1 — Foundation & Design System
- ✅ Complete color palette (17 colors from Phase 0 spec)
- ✅ Typography scale (H1-H3, Body, Caption, Button Text)
- ✅ Buttons (primary/secondary/tertiary/destructive), cards, tags, badges
- ✅ Body size slider (0.0-1.0) + condition slider (1-5)
- ✅ Chat bubbles, status badges, 4 input types
- ✅ Role-based navigation (cosplayer/organizer toggle)

### FE-2 — Onboarding
- ✅ 4-screen onboarding flow with validation
- ✅ `UserContext` + `OnboardingNavigator`

### FE-3 — Character Browse & Variant Selection
- ✅ Search + media-type filter, variant list, mock match results
- ✅ `SelectionContext` + seeded characters/variants

### FE-4 — Projects
- ✅ Projects list, project dashboard (tasks + budget), create project
- ✅ `ProjectsContext` + readiness score util (deterministic)

### FE-4.5 — Mock Auth
- ✅ `AuthService` (multi-account + session on AsyncStorage)
- ✅ Login/Register screens, `AuthNavigator`, root auth gating
- ✅ Profile screen with real logout + Test Mode persona switcher

### FE-5 — Owned-Item Logging
- ✅ **Entry method selection** — Take Photo / Type Description / Voice Input → `entry_method`
- ✅ **Photo entry** — expo-image-picker (gallery), mocked AI categorization → `photo_urls`, `entry_method='photo'`
- ✅ **Text entry** — describe color/type/style/condition, English/Taglish toggle, keyword-extracted mock categorization → `original_input_text`, `entry_language`, `entry_method='text'`
- ✅ **Voice entry** — mock mic recorder (pulse indicator + timer), English/Taglish toggle, mocked transcription → `entry_method='voice'`
- ✅ **Item confirmation** — editable `auto_categorized_type/color/style`, `flexibility_tag`, `condition_rating`, `acquired_date`, `acquisition_cost`, `notes`
- ✅ **Owned-Item Dashboard** — filterable by `availability_status` / type / color
- ✅ **Owned-Attire Detail** — full fields, condition history, edit/delete, "Commit to Project" (free → committed)
- ✅ Persisted inventory via `@forgemind:owned_attire` (AsyncStorage, same pattern as auth)

---

## What's NOT in the app yet (coming later)

- ❌ Real backend (BE-1) — auth, image classification, speech-to-text are all mocked
- ❌ Marketplace (FE-6)
- ❌ Organizer events / logistics / meetups (FE-7)
- ❌ Real AI matching
- ❌ Custom Inter font (system fonts)
- ❌ Dropdown picker modal (shell only)

---

## Known Issues

1. **Mock AI** — photo categorization and voice transcription are randomized/mocked, not real (by design, backend is BE-1)
2. **Web vs. device storage** — web and Expo Go use separate AsyncStorage; data won't carry across
3. **Shadow style props deprecated on web** — cosmetic warning only

---

## Documentation

- **Full Deliverable Report:** `FE-1_DELIVERABLE_REPORT.md`
- **Phase 0 Spec:** `ForgeMind_Phase0_Foundation.md` (v0.2.1)
- **Schema Corrections:** `SCHEMA_CORRECTIONS_v0.2.md`
- **Web Testing Guide:** `WEB_TESTING_GUIDE.md`

---

## Contact

**Project:** ForgeMind — AI-Assisted Cosplay Platform  
**Phase:** FE-5 (Owned-Item Logging)  
**Status:** ✅ Complete