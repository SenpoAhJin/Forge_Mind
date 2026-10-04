# ForgeMind Build Status Audit

Generated: 2026-10-03
Workspace: CosForge_System - Copy

## PHASE 0: Foundation

### 0.1 Database Schemas

| Item | Status | Table Name | Row Count | Evidence |
|------|--------|------------|-----------|----------|
| Character/variant references | REAL | characters, variants, components, variant_components | 0, 0, 0, 0 | migrations/003_domain_3_catalog.js |
| Owned attire records | REAL | owned_attire, attire_usage_history | 0, 0 | migrations/005_domain_5_owned_attire.js |
| User account with body slider | REAL | users | 0 | migrations/001_domain_1_identity_auth.js |
| Marketplace listing | REAL | listings | 0 | migrations/007_domain_7_marketplace_transactions.js |
| Marketplace offer | REAL | structured_offers | 0 | migrations/007_domain_7_marketplace_transactions.js |
| Marketplace chat | REAL | chat_threads, chat_messages | 0, 0 | migrations/007_domain_7_marketplace_transactions.js |
| Event records | REAL | events, public_event_listings | 0, 0 | migrations/008_domain_8_events.js |
| Logistics records | REAL | guest_logistics | 0 | migrations/009_domain_9_organizer_tools.js |
| Contest history | REAL | contest_opt_ins, contest_criteria | 0, 0 | migrations/009_domain_9_organizer_tools.js |
| Live-location sessions | REAL | live_location_sessions, meetup_members | 0, 0 | migrations/010_domain_10_extras_cross_cutting.js |
| Shareable-card records | no table | not found | - | not found |
| Diary entries | REAL | diary_entries | 0 | migrations/010_domain_10_extras_cross_cutting.js |
| Project/milestone records | REAL | projects, project_milestones, tasks, budget_line_items | 0, 0, 0, 0 | migrations/006_domain_4_marketplace_reference.js |

### 0.2 Permitted Categories

**Definition:** forgemind-backend/migrations/015_marketplace_categories.js
**Storage:** permitted_categories table (0 rows)
**Count:** 5 categories (Wigs, Materials & Fabric, Makeup & Contacts, Photography Services, Commissions & Crafting Services)


## PHASE 1: Front-end Shell

| Item | Label | Evidence | Note |
|------|-------|----------|------|
| 1.1 Onboarding: base body & slider | REAL | BodySliderOnboardingScreen.tsx:22, AuthService | Saved via AuthService register |
| 1.2 Project dashboard | MOCK | ProjectDashboardScreen.tsx, ProjectsContext AsyncStorage | Local data only |
| 1.3 Character/variant browser | MOCK | CharacterBrowseScreen.tsx, VariantListScreen.tsx | Local JSON data |
| 1.4 Attire logging: photo | STUB | PhotoEntryScreen.tsx:44 | Auto-categorization placeholder only |
| 1.4 Attire logging: text | MOCK | TextEntryScreen.tsx, OwnedAttireContext AsyncStorage | Local data only |
| 1.4 Attire logging: voice | STUB | VoiceEntryScreen.tsx:125 | No speech recognition implemented |
| 1.5 3D dress-up viewer | PARTIAL | Preview3DTestScreen.tsx:58 | Real 3D, no garments loaded |
| 1.6 Marketplace: listing create | REAL | CreateListingScreen.tsx:25, MarketplaceService | API-backed via checkListing |
| 1.6 Marketplace: browse | MOCK | MarketplaceScreen.tsx, MarketplaceContext AsyncStorage | Local data, no backend fetch |
| 1.6 Marketplace: trade/commission | MOCK | OfferLogScreen.tsx, OffersContext AsyncStorage | Local data only |
| 1.6 Marketplace: chat UI | MOCK | ChatListScreen.tsx, ChatContext AsyncStorage | Local data only |
| 1.6 Marketplace: offer log UI | MOCK | OfferDetailScreen.tsx, OffersContext | Local data only |
| 1.7 Organizer: logistics tracker | MOCK | LogisticsContext AsyncStorage | Local data only |
| 1.7 Organizer: commitment log | MOCK | CommitmentLogContext AsyncStorage | Local data only |
| 1.7 Organizer: contest-tier view | MOCK | ContestsListScreen.tsx, ContestContext | Local data only |
| 1.8 Group meetup: conflict view | STUB | not found | No schedule-conflict screen found |
| 1.8 Group meetup: live map | NOT STARTED | not found | No live map screen |
| 1.8 Group meetup: per-event toggle | MOCK | InviteMeetupsContext AsyncStorage | Local data only |
| 1.9 Shareable card: profile card | NOT STARTED | not found | No card generation screen |
| 1.9 Shareable card: QR | NOT STARTED | not found | react-native-qrcode-svg installed unused |
| 1.9 Shareable card: share | NOT STARTED | not found | expo-sharing installed unused |
| 1.10 Appearance Hub: theme picker | NOT STARTED | not found | No theme picker screen |
| 1.10 Appearance Hub: profile layout | NOT STARTED | not found | No layout customization |
| 1.11 Cosplay Diary | MOCK | CosplayDiaryScreen.tsx, DiaryContext AsyncStorage | Local data only |


## PHASE 2: 3D Layer

| Item | Label | Evidence | Note |
|------|-------|----------|------|
| 2.1 Base body meshes (M/F) | REAL | forgemind-ai/models/male_base_body.glb (1.4MB), female_base_body.glb (1.3MB) | In forgemind-ai models directory |
| 2.1 Continuous size blend | REAL | body_size_bone_scale.json:1 | JSON mapping for bone scaling |
| 2.2 Starter garment set | NOT STARTED | not found | No garment glb files found |
| 2.3 Dress-up renderer in app | REAL | Preview3DTestScreen.tsx:58, Preview3D.tsx | React Three Fiber working |
| 2.4 Drape tuning | NOT STARTED | Preview3D.tsx:65 | Comment: Load garment meshes next |


## PHASE 3: Backend

| Item | Label | Evidence | Note |
|------|-------|----------|------|
| 3.1 Auth: register | REAL | auth/router.ts:111, sessions table | POST /auth/register |
| 3.1 Auth: login | REAL | auth/router.ts:192, sessions table | POST /auth/login |
| 3.1 Auth: logout | REAL | auth/router.ts:242 | POST /auth/logout |
| 3.1 Auth: session | REAL | auth/router.ts:296 | GET /auth/me |
| 3.2 Verification workflow | REAL | users/router.ts:238, holder_verification_records table | PATCH /users/:id/verification, Head role name |
| 3.2 ID upload | NOT STARTED | not found | No upload endpoint found |
| 3.2 Status flag | REAL | users.verification_status column | Database column exists |
| 3.3 Character/variant storage | REAL | characters, variants, components, variant_components | Unused by routes |
| 3.3 Owned attire storage | REAL | owned_attire, attire_usage_history | Unused by routes |
| 3.3 Project storage | REAL | projects, project_milestones, tasks, budget_line_items | Unused by routes |
| 3.3 Marketplace storage | REAL | listings, structured_offers | Used by /marketplace routes |
| 3.3 Chat storage | REAL | chat_threads, chat_messages | Tables exist, no routes |
| 3.3 Event storage | REAL | events, public_event_listings | Used by /calendar routes |
| 3.3 Logistics storage | REAL | guest_logistics | Tables exist, no routes |
| 3.3 Contest storage | REAL | contest_opt_ins, contest_criteria | Tables exist, no routes |
| 3.3 Live-location storage | REAL | live_location_sessions, meetup_members | Tables exist, no routes |
| 3.3 Diary storage | REAL | diary_entries | Tables exist, no routes |
| 3.4 Listing screener trigger | REAL | screener.ts:54, checkListingContent | Rules-based only |
| 3.4 AI layer call | NOT STARTED | screener.ts:122 aiSecondLayerNoop | Placeholder function only |
| 3.5 Offer log backend | NOT STARTED | not found | structured_offers table exists unused |
| 3.6 Chat backend | NOT STARTED | not found | chat_threads/messages tables exist unused |
| 3.6 Chat AI passthrough check | NOT STARTED | not found | No chat routes exist |
| 3.7 Live-location relay | NOT STARTED | not found | No socket.io in dependencies |
| 3.8 Shareable-card endpoint | NOT STARTED | not found | No generation route found |

**Backend Routes Mounted:**
- /auth (auth/router.ts)
- /calendar (calendar/router.ts)
- /users (users/router.ts)
- /marketplace (marketplace/router.ts: registration and listings only)

**Role Names Used:** Code uses "Head" and "Head Organizer" (head_organizer_department column)


## PHASE 4: AI/ML

| Item | Label | Evidence | Note |
|------|-------|----------|------|
| 4.1 Attire-to-character matching | REAL | forgemind-ai/src/attire_matcher.py:187, Flask /api/match | Rule-based scorer port 5000 |
| 4.2 New-variant detection | NOT STARTED | not found | No variant detection code |
| 4.3 Text classification | REAL | forgemind-ai/models/marketplace_screener_lr.joblib (6.5MB) | Trained model, not connected |
| 4.3 Image classification | NOT STARTED | not found | No image classifier |
| 4.4 Readiness forecasting | NOT STARTED | not found | No forecasting code |
| 4.5 Trade-fairness pricing | NOT STARTED | not found | No pricing model |
| 4.6 Contest-tier suggestion | NOT STARTED | not found | No contest model |

**forgemind-ai Service:** Flask on port 5000 (forgemind-ai/src/api.py:285)


## PHASE 5: Integration and Testing

### 5.1 Context API Status

**API-Backed (2):**
- CalendarContext (CalendarService)
- UserContext (AuthService for register/login)

**AsyncStorage-Only (13):**
- ChatContext
- CommissionMilestonesContext
- CommitmentLogContext
- ContestContext
- DiaryContext
- EventsContext
- InviteMeetupsContext
- LogisticsContext
- MarketplaceContext (browse only, create is API)
- MeetupsContext
- OffersContext
- OwnedAttireContext
- ProjectsContext

### 5.2 Automated Tests

**Backend (3 test files):**
- tests/marketplace-rules.test.ts
- tests/moderation-data.test.ts
- tests/moderation.test.ts

**Mobile (1 test file):**
- src/utils/__tests__/run-pure-logic-tests.mjs

**Manual Test Checklists:**
- forgemind-backend/scripts/verify_marketplace.ps1
- forgemind-mobile/HOW_TO_TEST.md


## PHASE 6: Defense Demo Loop

| Step | Status | Evidence | Note |
|------|--------|----------|------|
| D1 Character selection | MOCK ONLY | CharacterBrowseScreen.tsx local JSON | No API connection |
| D2 Attire matching | PARTIAL | attire_matcher.py Flask, mobile stub only | AI ready, mobile not wired |
| D3 3D preview multi-slider | REAL | Preview3DTestScreen.tsx, body_size_bone_scale.json | No garments loaded yet |
| D4 Listing block+appeal+answer | PARTIAL | Screener real, appeal route exists, no Head UI | Backend ready, mobile incomplete |
| D5 Live-location two-device | MISSING | not found | No socket/relay implementation |
| D6 Contest-tier suggestion | MISSING | not found | No contest AI model |


---

## SUMMARY COUNTS

| Phase | REAL | MOCK | PARTIAL | STUB | NOT STARTED |
|-------|------|------|---------|------|-------------|
| 0 Foundation | 11 | 0 | 0 | 0 | 1 |
| 1 Front-end Shell | 2 | 10 | 1 | 3 | 8 |
| 2 3D Layer | 3 | 0 | 0 | 0 | 2 |
| 3 Backend | 17 | 0 | 0 | 0 | 8 |
| 4 AI/ML | 2 | 0 | 0 | 0 | 5 |
| **TOTAL** | **35** | **10** | **1** | **3** | **24** |

## DEMO LOOP READINESS

| Demo Step | Status |
|-----------|--------|
| D1 Character selection | MOCK ONLY |
| D2 Attire matching | PARTIAL |
| D3 3D preview multi-slider | REAL |
| D4 Listing block+appeal+answer | PARTIAL |
| D5 Live-location two-device | MISSING |
| D6 Contest-tier suggestion | MISSING |

## DEVIATIONS FROM PLAN

1. **Role naming:** Plan says "Holder" but code uses "Head" and "Head Organizer" throughout (users table, verification routes, mobile screens)

2. **Marketplace moderation:** Backend uses rule-based screener only. Trained ML classifier exists (marketplace_screener_lr.joblib 6.5MB) but is not called by backend (aiSecondLayerNoop placeholder in screener.ts:122)

3. **3D implementation:** Uses React Three Fiber + expo-gl instead of Unity or WebView bridge mentioned in plan

4. **Attire matching:** Implemented as Flask API service (port 5000) not integrated with mobile app

5. **Additional tables not in plan:** user_notification_state, email_otp_requests, audit_events, portfolio_photos

6. **Marketplace post types:** Extended beyond plan with buy/sell/trade/rent/service_offer/service_request (migration 014, 016)

## RECOMMENDED NEXT TARGETS

### 1. Wire attire matching to mobile (Phase 4, 3 days)
**Why:** Blocks D2 demo step. Core feature for character selection flow.
**What:** Create MatchingService in mobile, call forgemind-ai /api/match from MatchResultsScreen
**Depends on:** Character data API (currently mock JSON)

### 2. Connect marketplace browse to backend (Phase 3, 2 days)
**Why:** Blocks full marketplace demo. Most other marketplace features depend on it.
**What:** Add GET /marketplace/listings route (already exists), update MarketplaceContext to fetch from API
**Depends on:** Nothing

### 3. Add Head appeal review UI (Phase 3, 4 days)
**Why:** Blocks D4 demo step. Completes listing moderation workflow.
**What:** Create HolderAppealQueueScreen, wire to backend PATCH /marketplace/listings/:id/appeal-decision
**Depends on:** Backend route needs to be added

### 4. Implement live-location relay (Phase 3, 7 days)
**Why:** Blocks D5 demo step. Major technical challenge with socket.io.
**What:** Add socket.io to backend, create location relay service, mobile screens for sharing/viewing
**Depends on:** Nothing

### 5. Load starter garments in 3D preview (Phase 2, 5 days)
**Why:** Needed for complete D3 demo. Makes 3D preview useful for users.
**What:** Create/import garment glb files, update Preview3D component to load and position garments
**Depends on:** Garment 3D models (need creation or sourcing)

## RISKS: Top 3 Defense Failures

### 1. Live-location relay (D5) - HIGH RISK
**Issue:** No implementation exists. Socket.io adds complexity. Two-device demo needs coordination.
**Mitigation:** Prioritize early. Test with real devices on different networks. Have fallback demo video.

### 2. Character/attire data completeness - MEDIUM RISK
**Issue:** Character browser uses local JSON. Attire matcher API exists but not wired. Only 1 character has reference images.
**Mitigation:** Seed database with 5-10 characters minimum. Test matching with real user-uploaded photos.

### 3. Backend-mobile API gaps - MEDIUM RISK
**Issue:** 13 of 15 contexts use AsyncStorage only. Many backend tables unused. Chat, offers, logistics have no routes.
**Mitigation:** Document which features are mock vs real. Focus demo on implemented features (auth, calendar, marketplace create). Avoid navigating to unimplemented screens during defense.

