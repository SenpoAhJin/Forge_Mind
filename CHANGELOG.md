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

The app currently has a complete **design foundation** (a consistent look-and-feel across every screen), a fully working **4-step welcome/setup flow**, and a **working character browser**: after setup, cosplayers can search characters, browse each character's costume variants, and see a preview of matching them against owned items. The remaining tabs (Home, Marketplace, Events, Logistics, Meetups) are readable placeholder pages, and Profile is real. Everything still uses **demo (mock) data** — there is no real account system, server, or AI yet, by design.

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

## Session — Sept 15, 2026, 21:25 (FE-3: character browse & variant selection)

### What we did

**20:25 — Built the character & variant browser (demo data).** Cosplayers now land on a working **Characters** tab instead of a "coming soon" page:
- **Character Browse** — a searchable list of characters (try "Gojo" or "Jujutsu Kaisen"), with filter chips for media type (anime, manga, game, original). Each character card shows its source media and how many variants it has.
- **Variant List** — tapping a character opens all its variants. Each variant shows a name, an origin tag (canon / fan-art-inspired / user-original), a build difficulty rating out of 5, a short description, and a "candidate" badge when it hasn't been confirmed yet. Tapping a variant stores it as your current selection.
- **Match Results (preview)** — opens right after selecting a variant. It shows a clearly labeled **preview** of "match against your owned items": sample rows with colored match badges (Exact / Close / Loose) plus a notice that real AI matching arrives with the backend. Purely mock/static for now.

**21:25 — Made it ready for real data later.** The mock dataset lives on its own in `src/data/characters.json` and `src/data/variants.json`, formatted as **two separate, normalized tables** — each character in its own record, each variant in its own record pointing to a character by ID (no flattened or duplicated data). Every field name and type matches the Character and Variant tables in the foundation spec, so a real CSV/JSON dump can be dropped in later as a **file replacement, not a code rewrite**.

**21:26 — Verified and shipped.** TypeScript type-check passes with zero errors (re-confirmed at 21:26), and the app rebuilt cleanly in the browser test frame with the new screens and dataset confirmed inside the bundle. Committed and pushed as `8f76817`.

### Few notes/assumptions made this phase
- The real Character/Variant schema doc was not handed over this phase, so the mock data uses the **Character and Variant field names from the project's foundation spec** (`ForgeMind_Phase0_Foundation.md`, v0.2.1). If the real dataset uses different names, only the JSON files plus the two type definitions in `src/types/catalog.ts` need touching.
- The spec says IDs are database-generated UUIDs; the demo uses readable stand-in IDs (e.g. `char-jujutsu-kaisen-gojo`) so humans can follow the data.
- Reference images are intentionally left empty in the demo, so pages show initials avatars instead of relying on internet images.

### New screens/flow added
- **Characters (tab)** now hosts a three-screen flow: Character Browse → Variant List → Match Results. The selected variant is stored in a small in-memory store (fresh on reload) that later stages (attire matching, 3D viewer) will consume.
- Character Browse, Variant List, and Match Results reuse existing design-system parts (cards, tags, buttons, text field). No shared components were modified.

### Commits
- `8f76817` — `FE-3: character browse & variant selection` (GitHub: https://github.com/SenpoAhJin/Forge_Mind/commit/8f76817)

---

## Session — Wednesday, Sept 16, 2026, 11:02 (logo integration: in-app + outer-app)

### What we did

**11:01 — Located and brought in the two real logo files.** They were found at `forgemind-mobile/image_assets_logo/`:
- `in-app_logo.png` — 1254×1254, solid dark-navy/indigo artwork. This is the **in-app logo**: shown inside app screens.
- `outer-app_logo.png` — 564×564, transparent background with a light blue-white glyph. This is the **outer-app logo**: the app icon, splash image, and Android adaptive icon.

The mapping matched the files (a full-color in-app mark vs. a transparent icon-style mark), so the assumption was confirmed, not corrected.

**11:01 — Applied the logos.**
- `src/assets/in-app_logo.png` added. The Welcome screen's placeholder (purple circle with "ForgeMind" text) was replaced with the real image at 160×160 — it's the only in-app placeholder logo from FE-1/FE-2.
- The outer-app logo was derived into the Expo asset slots: `assets/icon.png` (1024×1024), `assets/splash-icon.png` (1024×1024), `assets/android-icon-foreground.png` (1024×1024), `assets/android-icon-monochrome.png` (grayscale 1024×1024), and `assets/favicon.png` (48×48).
- `app.json` now points `icon`, `splash`, and the Android `adaptiveIcon` (foreground + monochrome) at those files.

**11:02 — Verified.** TypeScript passes. The app icon renders as the dark-navy logo on a transparent background; the Welcome screen shows the full-color logo on the light background.

### Commits
- (hash filled after push — `Add app logos (in-app + outer-app)`)

---

## Session — Wednesday, Sept 16, 2026, 11:22 (FE-4: project dashboard & readiness)

### What we did

**11:05 — Built the project data layer, schema-aligned.** Created `src/types/projects.ts` with `Project` and `Task` matching the foundation spec **verbatim** (from `ForgeMind_Phase0_Foundation.md`, section D — quote in the FE-4 report). `BudgetLineItem` is flagged as an **assumed** structure — no Budget table exists in the foundation spec yet. Mock data lives in three normalized files under `src/data/`: `projects.json`, `tasks.json`, `budget_items.json`, plus `match_components.json` (reuses FE-3's mock match items).

**11:10 — Readiness engine written as explicit math, not a black box.** `src/utils/readiness.ts` derives the `ProjectReadiness` value: 40% task completion (completed=1, in-progress=0.5), 30% owned-item match (exact=1, close=0.5, loose=0.25), 30% budget health (1 − spent/stated budget). Also emits matched/missing components, budget utilization, and skill-gap details.

**11:14 — Projects state store.** `src/contexts/ProjectsContext.tsx` seeds from the mock data and supports creating projects, adding tasks, advancing task status, and adding budget line items (in-memory, fresh on reload — same standard as FE-3's selection store).

**11:22 — Three screens built.**
- **Home / Projects list** — replaces the FE-2 empty state: project cards show character/variant, readiness bar, status; a start-card turns the FE-3-selected variant into a project.
- **Project Dashboard** — task list (add / Start / Complete / Reopen), budget tracker (stated vs planned vs spent, running total, add line items), computed readiness with breakdown, and a **clearly-labeled static 3D preview slot** ("coming in a later stage" — no real 3D, per the Phase 2 scope note).
- **Create Project** — form mirroring Project schema field names (name, skill level, budget, dates, readiness opt-in).

**11:24 — Navigation.** New `ProjectStackNavigator` hosts Projects → Dashboard → Create on the Home tab (mirrors the FE-3 characters stack). Match Results (FE-3 screen) gained a "Start Project with This Variant" button that jumps to Home. Two FE-1/FE-3 shell files were modified to wire this (flagged in the FE-4 report).

**11:25 — Verified and shipped.** TypeScript type-check passes with zero errors; the Android bundle rebuilds clean in the dev server. Committed and pushed.

### Few notes/assumptions made this phase
- Real Project/Task schema **exists** in `ForgeMind_Phase0_Foundation.md` (section D) — used verbatim, quoted in the report.
- No Budget table exists in the spec; `BudgetLineItem` field names/types are an **assumption**, flagged for backend mapping.
- Readiness is mock math (explained above); AI-driven readiness forecasting is a later backend phase.
- App uses lasting demo IDs (e.g. `proj-gojo-s2-uniform`) just like FE-3's readable stand-ins; the schema says UUIDs.

### Commits
- (hash filled after push — `FE-4: project dashboard & readiness`)

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
| Characters | Searchable list of characters, filter by media type |
| Character Variants | Pick a character's costume variant (origin tag, difficulty, description) |
| Match Results | Preview of "match against owned items" (mock until AI backend) |
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
- **Folder layout:** `src/theme` (design tokens), `src/components` (building blocks), `src/navigation` (onboarding + tab + character-stack navigators), `src/screens` (cosplayer / organizer / shared / onboarding), `src/contexts` (demo user + demo selected-variant state), `src/data` (mock character/variant dataset, import-ready), `src/types` (schema-shaped type definitions).
- **Git:** everything is committed and pushed to GitHub (`SenpoAhJin/Forge_Mind`, branch `master`). Commit history: `01659ea` (scaffold) → `c53ba56` (FE-2) → `a9c3407` (FE-2.1) → `a09c8a5` (FE-2.2) → `7fc5a0d` (changelog) → `edd44d5` (changelog) → `8f76817` (FE-3).

---

## 5. Known Limits (by design, not bugs)

- **No real accounts/login** — everything is demo data stored in the app's memory. Reloading the app resets the setup flow.
- **No server yet** — no real database, AI, photo upload, or payments.
- **No 3D preview, real matching, or marketplace listings yet** — character browsing works on demo data, but matching is only a preview and the 3D viewer/marketplace come in later stages.
- Tab icons and layout are now done; the remaining "coming soon" areas are all planned future stages.

---

## 6. What's Planned Next (Roadmap)

1. ~~**FE-3 — Character Browse & Variant Selection**~~ **(done — Sept 15, 2026)**: searching characters, choosing a variant, seeing match results against your owned items.
2. **FE-4 — Project Dashboard & Readiness:** creating projects, task lists, budgets, readiness score, 3D preview.
3. **FE-5 — Owned-Item Logging:** photo/text/voice input with AI categorization.
4. **FE-6 — Marketplace:** browse, list items, screening, condition, prices, trades, commissions, chat.
5. **FE-7 — Organizer tools:** events, logistics tracker, contest tier suggestions, group meetups.
6. **FE-8 — Holder verification surface:** a separate web app for vetting sellers and moderating listings.

---

*Need something in even simpler terms? Just ask — I'm happy to re-explain any part.*