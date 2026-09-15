# ForgeMind — Plain-Language Changelog

**Last updated:** September 15, 2026
**What this is:** A simple, everyday-language record of everything built so far, every change we made along the way, and what the app currently contains — so anyone (even without a technical background) can understand the state of the project.

---

## 1. What is ForgeMind?

ForgeMind is an **AI-assisted cosplay planning app**. It helps cosplayers:
- Find characters and "variants" (e.g., Gojo Satoru — Season 2 Uniform) and see what they already own vs. what they need to buy or make.
- Plan projects with a task list, budget, and a readiness score (how close they are to done).
- Log the items they own (by photo, text, or voice) and let the AI categorize them.
- Buy, sell, and trade cosplay items in a marketplace, and request commissions from crafters.
- Organizers plan events, track guests/sponsors/performers, and see how ready attending cosplayers are.

It is being built **mobile-first** (a phone app) using Expo (a tool that lets one codebase become an Android app, an iPhone app, and a website).

---

## 2. Current Status (one paragraph)

The app currently has a complete **design foundation** (a consistent look-and-feel across every screen) and a fully working **4-step welcome/setup flow**. After setup, the app opens into the main screen, where tabs now have proper icons and readable, informative placeholder pages for everything that comes in later stages. Everything still uses **demo (mock) data** — there is no real account system or server yet, by design.

---

## 3. Session History

## Session — FE-1 (project setup & design foundation)

What we did:
- Created the app shell using Expo + TypeScript (typed JavaScript for safety).
- Built the **design system** — the set of standard colors, text styles, spacing, and reusable building blocks so every screen looks the same:
  - 17 brand & support colors (purple = main actions, pink = organizer accent, teal = marketplace, plus neutrals and status colors like green/amber/red).
  - A text size scale (big titles down to small labels).
  - Reusable **components**: 4 button styles (main, outline, text-only, delete), 3 card styles, status tags/badges, two slider types, chat bubbles, and form fields (text, long text, dropdown, photo upload).
- Set up **role-based navigation**: cosplayers see Home, Characters, Marketplace, Profile. Organizers see Events, Logistics, Meetups, Profile. Users who are both get a switcher to flip between the two views.
- Added placeholder pages for every main screen so the shell could be navigated end-to-end.

### Commits
- `01659ea` — Initial commit (project scaffold) (GitHub: https://github.com/SenpoAhJin/Forge_Mind/commit/01659ea)

## Session — FE-2 (onboarding flow)

What we did:
- Built the **4-step onboarding flow**:
  1. **Welcome** — logo + tagline + "Get Started" button.
  2. **Role Selection** — tick Cosplayer, Organizer, or both (it refuses to continue unless at least one is chosen).
  3. **Account Creation** — name, email, password, confirm password, with live validation (catches bad emails, short passwords, mismatched confirmation, blank name).
  4. **Body Slider** — choose Male/Female base body and drag a slider (0.0–1.0) that approximates build for the future 3D preview. Clearly states it's "not a scan, not a measurement."
- Added a small **state manager** (records the user's choices) that uses the exact same field names as the planned database — so wiring up a real server later won't require renaming anything.
- After setup, the app shows the right tabs based on which roles were picked.

### Commits
- `c53ba56` — `FE-2: onboarding screens` (GitHub: https://github.com/SenpoAhJin/Forge_Mind/commit/c53ba56)

## Session — Sept 15, 2026 (FE-2.1: navigation & UI improvements)

### Make it testable on a laptop
What we did:
- Installed the pieces Expo needs to also run in a web browser (`react-dom`, `react-native-web`).
- Started the development server and confirmed the app compiles with zero errors (TypeScript check passes).
- Built a **phone-frame preview**: a mock phone device on the screen (bezel, notch, side buttons) that displays the app at a phone-sized viewport inside your browser — so testing on a laptop feels like using a phone. You can switch device sizes (iPhone 14/15, Android, etc.) and reload.

### Navigation & user-friendliness improvements
What we did:
- **Added proper icons to the bottom tab bar** (previously the tabs had no icons at all). Now Home shows a folder, Characters a group of people, Marketplace a cart, Events a calendar, Logistics a car, Meetups a map, Profile a person. Icons highlight when selected.
- **Redesigned the role switcher** (for people who are both cosplayer and organizer) into a clean pill-style toggle with a "Viewing as:" label instead of the old plain buttons.
- **Replaced the blank placeholder screens** with informative pages for Home, Characters, Marketplace, Events, Logistics, and Meetups. Each shows:
  - A friendly greeting or hero card with the screen's icon and purpose,
  - a list of what that feature will do (e.g., Marketplace: browse, trade, commissions),
  - and a small blue note saying which future stage will build it.
- **Made the Profile screen real.** It now shows the user's avatar (initials), display name, email, role badges (Cosplayer/Organizer), body type + size, verification status, and app info — plus a "Reset Onboarding" button that clears the demo data and returns to the Welcome screen (with a confirm popup first).

### Test dependencies & housekeeping
What we did:
- Installed the icon library (`@expo/vector-icons`) so the tab icons work.
- Left small testing files in the project: a log file for the dev server, the testing instructions, and the phone-frame preview. These are not part of the shipped app.

### Commits
- `a9c3407` — `FE-2.1: tab icons, role switcher, placeholder screens, profile screen` (GitHub: https://github.com/SenpoAhJin/Forge_Mind/commit/a9c3407)

---

## Session — Sept 15, 2026 (FE-2.2: role-selection reset bug fix)

**Fixes a bug introduced in the Sept 15 FE-2 session** (role selection reset by account creation).

### The bug

The onboarding flow runs in order: Role Selection → Account Creation → Body Slider. The problem was in how account data was saved. When the user picked their roles (Cosplayer/Organizer/Both) in step 1, that choice was stored. But when they entered their name, email, and password in step 2, the code replaced the entire user record with a fresh copy that hardcoded both role flags back to `false`. The slider step preserved everything correctly, but by then the roles were already lost. This meant `isOnboardingComplete` (which requires at least one role to be `true`) could never become `true` — the app would stay stuck on the onboarding flow every time.

### What was changed

The `setUserAccount` function in `src/contexts/UserContext.tsx` was rewritten to **merge** the new account fields onto whatever already existed in state, instead of replacing the whole object. This preserves the roles (and any other fields) that were set in earlier steps. If called before roles are somehow set, sensible defaults are supplied defensively.

### Commits
- `a09c8a5` — `FE-2.2: fix role-selection reset bug` (GitHub: https://github.com/SenpoAhJin/Forge_Mind/commit/a09c8a5)

### What else was done in this session
- Answered two outstanding FE-2 questions:
  - `is_holder_verified` and `verification_status` **are** part of the v0.2.1 schema (not an extension).
  - FE-1 component reuse across the four onboarding screens was documented; no component code was modified.
- CHANGELOG.md updated with this session entry (the one you're reading now).

---

## 4. What's In the System Right Now (Contents Summary)

### The screens
| Screen | What it does now |
|--------|------------------|
| Welcome | App intro, "Get Started" |
| Role Selection | Pick Cosplayer / Organizer / Both |
| Account Creation | Name, email, password with validation |
| Body Slider | Base body + size slider for 3D preview |
| Home (Projects) | Greeting + "no projects yet" empty state |
| Characters | Explains future browse/select features |
| Marketplace | Explains future buy/sell/trade features |
| Events | Explains future organizer event features |
| Logistics | Explains future guest/performance tracking |
| Meetups | Explains future group-meetup planning |
| Profile | Shows real demo user data + reset button |

### The design system (reusable parts)
- **Colors:** 17 fixed tokens matching the official design spec.
- **Text styles:** 7 sizes/weights from title to caption.
- **Spacing:** standard 4-8-12-16-24-32-48 px rhythm.
- **Components:** Buttons (4 kinds), Cards (3 kinds), Tags, Status badges, Sliders (2 kinds), Chat bubbles (3 kinds), Input fields (4 kinds).

### Tech notes (for the developers)
- **Stack:** Expo SDK 57, React Native 0.86, TypeScript 6.0, React Navigation 7.
- **Folder layout:** `src/theme` (design tokens), `src/components` (building blocks), `src/navigation` (onboarding + tab navigators), `src/screens` (cosplayer / organizer / shared / onboarding), `src/contexts` (demo user state).
- **Git:** everything is committed and pushed to GitHub (`SenpoAhJin/Forge_Mind`, branch `master`). Commit history: `01659ea` (scaffold) → `c53ba56` (FE-2) → `a9c3407` (FE-2.1) → `a09c8a5` (FE-2.2) → `7fc5a0d` (changelog).

---

## 5. Known Limits (by design, not bugs)

- **No real accounts/login** — everything is demo data stored in the app's memory. Reloading the app resets the setup flow.
- **No server yet** — no real database, AI, photo upload, or payments.
- **No 3D preview, character data, or marketplace listings yet** — those come in the next stages.
- Tab icons and layout are now done; the remaining "coming soon" areas are all planned future stages.

---

## 6. What's Planned Next (Roadmap)

1. **FE-3 — Character Browse & Variant Selection:** searching characters, choosing a variant, seeing match results against your owned items.
2. **FE-4 — Project Dashboard & Readiness:** creating projects, task lists, budgets, readiness score, 3D preview.
3. **FE-5 — Owned-Item Logging:** photo/text/voice input with AI categorization.
4. **FE-6 — Marketplace:** browse, list items, screening, condition, prices, trades, commissions, chat.
5. **FE-7 — Organizer tools:** events, logistics tracker, contest tier suggestions, group meetups.
6. **FE-8 — Holder verification surface:** a separate web app for vetting sellers and moderating listings.

---

*Need something in even simpler terms? Just ask — I'm happy to re-explain any part.*