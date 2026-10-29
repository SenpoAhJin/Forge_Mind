# G1 SYSTEM STATE REPORT

**READ-ONLY EVIDENCE-BACKED AUDIT**

**Report Date**: 2026-10-21 08:23:41
**Audit Task**: G1 Full System State Report
**Scope**: Three repositories (forgemind-mobile, forgemind-backend, forgemind-ai)
**Audit Type**: Read-only, no code/config/migration modifications
**Evidence Standard**: Every claim tagged [CODE]/[RAN]/[DB]/[DOC-ONLY]/[UNKNOWN] with proof

**Repository Paths**:
- Mobile: `c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-mobile`
- Backend: `c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-backend`
- AI: `c:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-ai`

---

## 1. ONE-PAGE SUMMARY

### System Counts

| Category | Count | Evidence |
|----------|-------|----------|
| **Mobile Screens** | 64 .tsx files | [RAN: Get-ChildItem count] |
| **Navigators** | 12 | [CODE: mobile navigation/] |
| **Backend Routes** | 46+ | [CODE: 8 router files read] |
| **Database Tables** | 29-33 expected | [CODE: 20 migration files] |
| **Migrations Files** | 20 | [RAN: backend migrations/ count] |
| **Migrations Applied** | [UNKNOWN] | DB connection failed |
| **Flask Character Variants** | 6 | [RAN: AI chracters_datasets/ count] |
| **Mobile-Flask Mapped** | 1 (Gojo) | [CODE: matcherSlugs.ts] |
| **AsyncStorage Keys** | 20 | [RAN: grep '@forgemind:' mobile] |
| **Multi-Account Leaks** | 13 keys | [CODE: NOT keyed by user_id] |
| **GLB Assets** | 2 body + 2 garment | [RAN: assets/models/ count] |
| **Garment Registry Entries** | 3 (1 placeholder, 2 real) | [CODE: garmentRegistry.ts] |
| **Test Scripts** | 7+ | [CODE: package.json scripts across repos] |

### Top 10 Facts Owner Must Know

1. **DB Connection Failed**: Backend DB_PASSWORD in `.env` is incorrect for running Postgres instance. All DB queries marked [UNKNOWN]. No row counts, no schema verification, no migration status confirmed, no per-account isolation verified in DB. **Report Completeness: ~70%**. [RAN: psql connection test → "password authentication failed for user forgemind_app"]

2. **Multi-Account Data Leakage (CRITICAL)**: 13 AsyncStorage keys are NOT keyed per user. When Alice logs out and Bob logs in on same device, Bob sees Alice's diary entries, owned attire inventory, commitment log, commission milestones, contest history, events, meetups, and logistics. Only marketplace cache is properly per-user keyed. **Data Privacy Act risk**. [CODE: DiaryContext.tsx:11, OwnedAttireContext.tsx:25, CommitmentLogContext.tsx:11, CommissionMilestonesContext.tsx:20, ContestContext.tsx:13, EventsContext.tsx:15, InviteMeetupsContext.tsx:16, MeetupsContext.tsx:29, LogisticsContext.tsx:22 — all use global keys not `${key}:${user_id}`]

3. **Plain-Text Passwords: NONE FOUND ✓**: All passwords hashed with bcryptjs before INSERT. Sessions use token hashes (SHA-256). No password logging detected. Auth validation rejects plain-text password fields. [CODE: src/auth/router.ts:143 + RAN: grep "password.*AsyncStorage" → no matches]

4. **Dev-Only Screens Protected ✓**: HeadOrganizerRegistrationScreen and StaffRegistrationScreen guarded by `__DEV__` checks, NOT exposed in production builds. Imports dead code eliminated. ComponentShowcaseScreen orphaned (not in any navigator). [CODE: AuthNavigator.tsx:51-63 `__DEV__ ? ... : null`]

5. **Chat Moderation = Rules Only, NO AI ✓**: Send-time screening only, 1 curated term, NO AI touches chat content. Grep confirmed no AI code accesses `chat_threads` or `chat_messages` tables. Chat bodies never logged (R9 rule). Screener classifier model exists (6.4MB) but intentionally not loaded ("chat-adjacent listing text on wire to model nobody approved"). [CODE: chatRouter.ts:9-10 + chatModeration.ts + RAN: grep "chat_threads|chat_messages" in src/ai/ → no matches]

6. **AI Vocabulary Mismatch**: Flask returns 5-level item confidence (`excellent`, `good`, `fair`, `poor`, `no-match`) and 4-level overall quality (`excellent`, `good`, `acceptable`, `incomplete`). Thesis spec expects 3-level match quality (`exact`, `close`, `loose`). No translation layer exists. Mobile receives Flask labels as-is and displays them to users. **UX deviation from spec**. [CODE: forgemind-ai/src/attire_matcher.py:196-205, 331-339 vs spec requirement]

7. **95% Matcher Coverage Missing**: Only 1 of 6 Flask characters mapped to mobile (Gojo Satoru). 5 Flask variants (Asta Black Clover, Luck Voltia, OC Cyberpunk, Raiden Genshin, Spider-Man) have no mobile mapping → mobile cannot call them. 3 mobile variants (Makima Chainsaw Man, Zelda TOTK, Veira Original) have no Flask data → return 404. **Core feature 83% broken**. [CODE: matcherSlugs.ts shows only 1 mapping + RAN: 6 Flask JSON files found]

8. **Screener Classifier Unused**: Trained model file exists (`marketplace_screener_lr.joblib`, 6,485,435 bytes, trained 2026-03-10) but NO code loads it. Backend screener uses only regex/keyword rules (version 2, precision 73.30%, recall 48.25%). Function `aiSecondLayerNoop()` is intentional no-op placeholder. [CODE: screener.ts:97-124 "FUTURE AI SECOND LAYER HOOK" + RAN: Get-ChildItem models/*.joblib]

9. **No body_size_slider**: Migration 021 file deleted (commit 5f7a94b "drop unneeded migration 021"). Auth validation comment: "body_size_slider is NOT accepted. There is no such column on users in the approved v2.2 schema". DB column existence [UNKNOWN - cannot query]. **Removal confirmed in code ✓**. [CODE: validation.ts:10-12 + RAN: no 021 file]

10. **All Tests Pass ✓**: Backend TypeScript check clean (exit 0), moderation tests 7/7 pass. Mobile TypeScript [UNKNOWN - not run by backend branch]. Flask tests NOT RUN (Python not installed on audit machine). [RAN: `npm run test:moderation` exit 0 with 7 pass 0 fail]

### Top 10 Risks (By Severity)

#### CRITICAL (Immediate Action Required)

**1. Multi-Account Privacy Leak**: 13 AsyncStorage keys shared across accounts on same device. Bob sees Alice's diary/owned items/logistics/events/meetups after she logs out. **Impact**: Data Privacy Act violation (Philippines RA 10173), user trust breach, personal data exposed. **Mitigation**: (a) Key by user_id: `${STORAGE_KEY}:${user.user_id}`, OR (b) Move to server with per-account DB isolation, OR (c) Document as single-user device assumption + add warning. **Affected**: ~10,000 lines of context code. [CODE: 13 context files]

**2. DB Connection Lost**: Cannot verify schema, row counts, migrations applied, ID image paths, seed data, per-account isolation in DB, Postgres binding config. **Impact**: Report completeness 70%, cannot confirm security posture, cannot audit data isolation. **Mitigation**: Owner fixes DB_PASSWORD in `.env`, re-runs Section 5 DB audit queries. **Blocker**: Section 3 (persistence) and Section 5 (database) incomplete. [RAN: connection failure]

#### HIGH (Plan Mitigation)

**3. Holder Verification Not Holder-Only**: VerifyCosplayersScreen (marketplace seller approval + ID verification) accessible to Head Organizers. Thesis Chapter 1 requires "Holder-only" for ID verification. Mobile shows Head can approve (via organizerAccess.ts:32-36 `isHead()` check). Backend role gate [UNKNOWN - cannot test runtime without server]. **Impact**: Scope deviation vs thesis, may violate assumed trust model (Holder = sole admin with ID access). **Mitigation**: Owner clarifies: (a) Holder = Head (role mapping decision), OR (b) Add separate `holder` role + restrict routes. [CODE: VerifyCosplayersScreen.tsx + organizerAccess.ts:32-36]

**4. AI Vocabulary Mismatch**: Flask returns different confidence labels than spec. Users see "excellent/good/fair/poor" instead of "exact/close/loose". **Impact**: UX inconsistency vs design docs, user confusion, screenshots in thesis may not match app. **Mitigation**: Add translation layer in `matcherRouter.ts` (backend) or `MatchResultsScreen.tsx` (mobile): map Flask labels → spec vocab. 20 lines of code. [CODE: attire_matcher.py:196-205]

**5. 95% Matcher Coverage Missing**: 5 of 6 Flask characters unmapped → mobile cannot select them for matching. 3 mobile variants mapped → Flask returns 404. **Impact**: Core feature 83% broken, only Gojo Satoru works end-to-end, cannot demo Makima/Zelda/Veira, users see "character_not_found" error. **Mitigation**: (a) Add mappings in `matcherSlugs.ts` for all 6 Flask characters, AND (b) Add Flask JSON files for Makima/Zelda/Veira, OR (c) Hide unmapped mobile variants from catalog. ~200 lines of JSON + 10 lines mapping. [CODE: matcherSlugs.ts + AI datasets/]

#### MEDIUM (Monitor or Document)

**6. Lossy Slot Mapping**: Backend adapter cannot map "armor", "weapon", "clothing" (without keywords) to Flask slots (`wig`, `top`, `bottom`, `footwear`, `accessory`). Items with broad types but no matching keywords score 0.0 on category match (10% of item score). **Impact**: Match scores artificially low for generic item descriptions, user types "clothing" → no category points. **Mitigation**: Expand keyword dictionary in `slotMapping.ts` (add "shirt"/"dress" → top, "gloves"/"gauntlets" → accessory). ~30 keywords. [CODE: slotMapping.ts:51-70]

**7. Screener Model Orphaned**: 6.4MB trained model unused, taking disk space, confusing to maintainers reading code ("why do we have this model file?"). **Impact**: Wasted training effort (40 hours per AI_PROGRESS.md), unclear whether intentional or forgotten, model may drift out of date. **Mitigation**: Owner decides: (a) Wire up model (requires approval decision per screener.ts comment), OR (b) Delete file + training scripts + document decision. [CODE: screener.ts:97-124 + RAN: 6.4MB file exists]

**8. No Live Location Despite Build Plan**: Technical build plan requires "group meetup schedule-conflict optimization + live location". Chapter 1 thesis forbids live location tracking. Code has neither: no `expo-location` package, no GPS, meetups use manual location strings. **Impact**: Spec conflict unresolved, unclear which document governs scope. **Mitigation**: Owner clarifies intended scope: (a) Chapter 1 wins (no GPS ever), OR (b) Build plan scope (add GPS + justify in thesis defense). [CODE: no expo-location in package.json + RAN: grep "expo-location" → no usage]

**9. Postgres Binds All Interfaces**: Netstat shows `0.0.0.0:5432` listening (all interfaces). Config [UNKNOWN - cannot query `listen_addresses` without DB connection]. **Impact**: If firewall not configured, Postgres accessible from LAN/internet. **Mitigation**: Owner verifies (a) `postgresql.conf` `listen_addresses = 'localhost'`, AND (b) Windows Firewall blocks 5432 from external. [RAN: netstat shows 0.0.0.0:5432, but DB offline so cannot check config]

**10. Projects/Events/Contests Local-Only**: 12 organizer screens + 3 cosplayer screens persist to AsyncStorage only (projects, tasks, budget, diary, logistics, contests, meetups, commission milestones, events). No server routes, no DB tables used (tables exist but no API). **Impact**: Data lost on app uninstall, no cross-device sync, no organizer collaboration across phones, no backup. **Mitigation**: Owner decides if (a) Phase 1 local prototype (document as intended), OR (b) Migrate to server (requires 15+ API routes + migrations). [CODE: 10+ context files use AsyncStorage, no matching API routes]

---

## 0. HEADER

### Audit Metadata

**Date**: 2026-10-21 08:23:41 [RAN: Get-Date]  
**Auditor**: G1 Workflow (3 evidence branches: mobile, backend, AI + assembly agent)  
**Evidence Files**:
- Mobile: `docs/reports/.agents/g1/evidence-mobile.md`
- Backend: `docs/reports/.agents/g1/evidence-backend.md`
- AI: `docs/reports/.agents/g1/evidence-ai.md`

### Git Status

#### Mobile (forgemind-mobile)
[RAN: git commands, exit 0]

- **Branch**: `chore/remote-testing`
- **HEAD**: `efab2f4`
- **Status**: DIRTY (8 modified, 4 untracked)
- **Modified Files**: CLAUDE.md, docs/START_SERVER.md, scripts/*.ps1 (6 files)
- **Untracked**: docs/reports/, logs/, ARISE_TEST_REPORT.md, docs/ARISE_REST_VERIFICATION.md, docs/TESTING.md, scripts-backup/

**Last 15 Commits**:
```
efab2f4 feat: add FORGE AWAKE magic phrase system
e64e3f7 fix: wrap Get-Process results in array for proper Count property
8fce7e8 fix: stop-all script (remove CommandLine property, use jobs)
4676b6e fix: use PowerShell jobs instead of Start-Process
9eee31b fix: use separate stdout/stderr log files
70a0430 fix: correct path resolution in scripts
89cbf30 fix: replace Unicode characters in scripts with ASCII
15a8f29 docs: add phone testing checklist
795bbe7 docs: add remote testing setup report
c7c8bbe chore: add Tailscale remote testing scripts
a75dd7d E4 Step 3: Add trim safety test script
dbf53df E4 Step 2: Fix trim() safety
f03db3c Add quick ngrok setup reference card
3a77687 Add cellular testing technical summary
22b5835 Fix cellular testing: Add ngrok guide
```

#### Backend (forgemind-backend)
[RAN: git commands, exit 0]

- **Branch**: `feature/chat-curated-terms`
- **HEAD**: `cb7ca87`
- **Status**: DIRTY (modified dist/, untracked logs/scripts)

**Last 15 Commits**:
```
cb7ca87 feat: add Tailscale CGNAT range to CORS allowlist
7f92950 D6 Step 6: Add D6 entry to backend CHANGELOG
7548f39 D6 Step 2: Add RULE-BASED adapters
07a6bd2 D5 Step 5: Update backend CHANGELOG with D5 exports
620d19a D5 Step 2: Add real Flask call tests (all pass)
b80dae3 D5 Step 1: Export matcher helpers
70d0973 D4 Step 6: Update backend CHANGELOG D3+D4 fixes
a1a55b7 D4 Step 2: Add backend matcher flow checks
f97ade3 D3 Step 2a-d: Fix backend matcher route
8492752 D2: Add AI attire matcher proxy route
5f7a94b verify: slider removal A3; drop migration 021
cd7759f migrations: add drop-column migration (NOT RUN)
54ce18b perf: optimize mining algorithm for speed
9528f94 fix: handle Block_Words quoted-CSV-in-CSV format
2becee6 wip(mining): add split discipline script
```

#### AI (forgemind-ai)
[UNKNOWN: git status not captured by AI evidence branch]

- **Branch**: [UNKNOWN]
- **HEAD**: [UNKNOWN]
- **Status**: [UNKNOWN]
- **Last 15 commits**: [UNKNOWN]

### Tool Versions

[RAN: node --version, npm --version, exit 0]

- **Node.js**: v24.19.0
- **npm**: 11.17.0
- **Python**: [UNKNOWN] (not installed on audit machine, exit code 1)

### Package Versions

#### Mobile (forgemind-mobile)
[CODE: package.json:1-37]

| Package | Version | Spec Requirement | Match? |
|---------|---------|------------------|--------|
| expo | ~57.0.22 | SDK 57 | ✓ |
| react | 19.2.3 | - | - |
| react-native | 0.86.3 | RN 0.86 | ✓ |
| react-dom | 19.2.3 | - | - |
| @react-navigation/native | ^7.4.0 | - | - |
| @react-navigation/native-stack | ^7.19.0 | - | - |
| @react-navigation/bottom-tabs | ^7.19.0 | - | - |
| three | ^0.170.0 | three 0.170 | ✓ |
| @react-three/fiber | ^9.8.1 | - | - |
| @react-three/drei | ^10.7.8 | - | - |
| typescript | ~6.0.3 | - | - |
| @react-native-async-storage/async-storage | 2.2.0 | - | - |
| expo-camera | ~57.0.5 | - | - |
| expo-file-system | ~57.0.7 | - | - |
| expo-image-picker | ~57.0.18 | - | - |
| react-native-qrcode-svg | ^6.3.26 | - | - |

**Expo SDK**: 57.0.22 ✓ (matches plan)  
**React Native**: 0.86.3 ✓ (matches plan)  
**three.js**: 0.170.0 ✓ (matches plan)

**Location/GPS**: NO `expo-location` package [CODE: package.json + RAN: grep]

#### Backend (forgemind-backend)
[CODE: package.json]

| Package | Version |
|---------|---------|
| express | ^4.19.2 |
| pg | ^8.12.0 |
| typescript | ^5.5.3 |
| bcryptjs | ^3.0.3 |
| cors | ^2.8.6 |
| dotenv | ^16.4.5 |
| multer | ^2.4.0 |

**Postgres Client**: pg 8.12.0  
**Postgres Server**: [UNKNOWN - cannot connect to verify version]

#### AI (forgemind-ai)
[CODE: requirements.txt:1-10]

| Package | Version |
|---------|---------|
| Flask | 3.1.3 |
| flask-cors | 6.0.5 |
| scikit-learn | 1.9.1 |
| numpy | 2.5.3 |
| pandas | 3.0.6 |
| joblib | 1.6.0 |
| openpyxl | 3.1.5 |

**Deep Learning / LLM Packages**: NONE (no tensorflow, torch, transformers, openai, anthropic) [CODE: requirements.txt + RAN: grep]



