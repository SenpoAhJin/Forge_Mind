# ForgeMind System Report

**Date:** 2026-09-30
**Scope:** Step A, read-only. No app code, schema, dependency, or stored data was changed.
**Demo constraint that governs everything below:** the app is demonstrated only in Expo Go
over LAN or phone hotspot, with no internet. Metro is the only guaranteed process. No native
modules, no config plugins, no dev client. Web preview is not evidence for iOS or Android.

## Verification status

| Check | Result |
|---|---|
| `npx tsc --noEmit` (forgemind-mobile) | exit 0 |
| PostgreSQL connectivity, live query | ran this session (see §3) |
| Migration ledger query | ran this session |
| Row counts, 38 tables | ran this session |
| iOS device / simulator | **NOT TESTED (2026-09-30)** |
| Android device / emulator | **NOT TESTED (2026-09-30)** |
| Web preview | **NOT TESTED (2026-09-30)** |
| Flask `/api/match` | **NOT TESTED (2026-09-30)** — service not started |
| Automated test suite | none exists; no `test` script in any `package.json` |

---

## 1. Architecture as it really is

Four services exist across three folders. Only two of them are connected to each other, and
the connection is narrower than the design documents describe.

### 1.1 Process table

| # | Process | Folder | Port | Binds to | Start command | Status this session |
|---|---|---|---|---|---|---|
| 1 | **Metro** (Expo) | `forgemind-mobile` | 8081 (also 19006) | LAN + loopback | `npx expo start` | 8081 was already listening |
| 2 | **Express API** | `forgemind-backend` | 3000 | `config.port` only, **all interfaces** | `npm run dev` (= `ts-node src/index.ts`) | not running |
| 3 | **PostgreSQL 18** | system service `postgresql-x64-18` | 5432 | loopback | OS service, auto-start | running |
| 4 | **Flask AI** | `forgemind-ai` | 5000 | `0.0.0.0` | `.\start_api.ps1` (activates `venv`, runs `python src/api.py`) | not running |

### 1.2 What the mobile app actually needs from each

| Service | Needed for | Actually required? |
|---|---|---|
| Metro | serving the JS bundle to Expo Go | **Yes, always** |
| Express :3000 | `POST /auth/register`, `/auth/login`, `/auth/logout` | Only for the 3 auth calls |
| PostgreSQL | reached only by the backend process, never by the app | Only while the backend is up |
| Flask :5000 | nothing — the app has zero references | **No.** No call site exists |

### 1.3 Env files and what they set

| File | Variable | Value | Notes |
|---|---|---|---|
| `forgemind-mobile/.env.local` | `EXPO_PUBLIC_API_URL` | `http://localhost:3000` | gitignored, inlined into the bundle at build time |
| `forgemind-mobile/.env.example` | `EXPO_PUBLIC_API_URL` | `http://localhost:3000` | committed; documents the Android `10.0.2.2` and LAN-IP cases |
| `forgemind-mobile/src/config/api.ts:19` | `DEFAULT_DEV_API_URL` | `http://localhost:3000` | fallback when the var is unset; overridden by any real value |
| `forgemind-backend/.env` | `PORT` | `3000` | |
| | `DB_NAME` / `DB_USER` | `forgemind_dev` / `forgemind_app` | app role is a non-superuser, as intended |
| | `DB_PASSWORD` | 10 characters, present | not printed anywhere in this report |
| | `DB_URL` | a full connection string | **stale-duplicate hazard** — see D-6 |
| | `CORS_ORIGINS` | `http://localhost:8081,http://localhost:19006,http://localhost:8082` | only affects browsers; native ignores CORS |

`forgemind-ai` reads no environment variables and holds no configuration file. Its dataset path
is hardcoded relative to the working directory — see D-11.

### 1.4 The connection graph as built

```
Expo Go  --8081-->  Metro                 [works]
Expo Go  --3000-->  Express  --5432-->  PostgreSQL   [auth only, 3 endpoints]
Flask :5000  -->  nobody                [fully disconnected]
Express  -->  Flask                     [never written; no client, no call]
```

`forgemind-backend/src/index.ts:21-24` states the screener is "deliberately NOT implemented —
it is gated on the Path 1 / Path 2 decision". So the missing backend→Flask link is a recorded
decision, not an oversight. What is missing is only the screen that consumes it.

---

## 2. Network audit

### 2.1 Every network call in `src/`

There is exactly **one** `fetch()` in the entire mobile source tree, wrapped by one helper.
No other networking exists: no `axios`, no `WebSocket`, no `XMLHttpRequest`, no
`expo-network`, no realtime library.

| # | Method | Endpoint | File:line | Caller | Screen(s) |
|---|---|---|---|---|---|
| 1 | POST | `{API_BASE_URL}/auth/register` | `src/services/AuthService.ts:140` via `:272` | `AuthService.register` | `AccountCreationScreen`, `RegisterScreen` |
| 2 | POST | `{API_BASE_URL}/auth/login` | `src/services/AuthService.ts:140` via `:315` | `AuthService.login` | `LoginScreen` |
| 3 | POST | `{API_BASE_URL}/auth/logout` | `src/services/AuthService.ts:140` via `:382` | `AuthService.logout` | `ProfileScreen` |

All three go through `authUrl()` (`src/config/api.ts:34`), which prefixes `/auth`.

### 2.2 URL resolution and whether it works from a phone

`src/config/api.ts:21` reads `process.env.EXPO_PUBLIC_API_URL` with dot notation, which is
required for Expo's build-time inlining. That is correct and the comment at `:8-11` is accurate.

| Environment | Resolved URL | Reaches the backend? |
|---|---|---|
| iOS simulator | `http://localhost:3000` | **yes** — the simulator shares the host's loopback |
| Expo web | `http://localhost:3000` | yes, subject to CORS |
| Android emulator | `http://localhost:3000` | **no** — `localhost` is the emulator itself; needs `10.0.2.2` |
| Physical phone (Expo Go) | `http://localhost:3000` | **no** — the phone's own loopback; needs the PC's LAN IP |

**`EXPO_PUBLIC_API_URL=http://localhost:3000` only works for the iOS simulator and for web.
It cannot work from a physical phone, and it cannot work on an Android emulator.** Because
the phone is the stated demo target, the current value guarantees the reported
"Failed to fetch" on the device the demo is actually run on.

### 2.3 Why the backend is not reachable from the phone even when the URL is fixed

`src/index.ts:66` calls `app.listen(config.port, callback)` with **no host argument**. Node's
default is to bind the unspecified address, which on this machine means all interfaces, so the
backend does listen on 0.0.0.0 in practice. Two things still stand in the way:

- Windows Firewall will prompt to allow inbound connections on a private network the first
  time, and a denied prompt is silent from the app's point of view.
- The PC and the phone must be on the same LAN or the same hotspot. There is no internet, so
  a phone on cellular data can never reach the PC.

### 2.4 The two P0 findings from `TEST_MATRIX.md` are not defects here

`TEST_MATRIX.md` R-1 and R-2 record missing `expo-camera` / `expo-image-picker` config plugins
and the Android `localhost` problem as P0. Under the Expo Go constraint those are the wrong
rankings, and I am recording that disagreement rather than changing the earlier document:

- **Config plugins.** `app.json` lists 4 plugin entries, and neither camera nor image-picker
  is among them. Both libraries ship config plugins, so a *prebuilt* iOS binary would be
  terminated on the first permission prompt. In **Expo Go** the host app already declares
  `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription`, so the app runs. The
  finding is real for any future standalone build and **inert for the demo**. Downgrading to
  P2, with the note that it must be re-raised before any build outside Expo Go.
- **Android `localhost`.** Real, and P0 for Android, but it is a *configuration* defect, not a
  code defect: `.env.local` is a local file. Its correct fix is one edit plus
  `npx expo start -c`, which is Step B item 3.

### 2.5 `confirm()` is undefined on native — a real crash, and it is demo-critical

`src/screens/organizer/ContestManageScreen.tsx:85` calls a bare global `confirm()`:

```ts
if (!confirm(confirmMsg)) return; // Simple browser confirm for demo
```

There is no `confirm` global in React Native, and the repo's own convention forbids it. The
same file already imports and uses `ConfirmationModal` at `:11` and `:217`, and nine other
screens use `ConfirmationModal` correctly. So this one line is both a convention violation and
a runtime `ReferenceError` on **both iOS and Android** the moment an organizer confirms or
declines a contest entry — one of the exact flows named in the defense demo script.

**Static evidence only. I did not run it on a device, so this is `NOT TESTED`; the conclusion
rests on the absence of any `confirm` polyfill in the dependency tree, not on an observed crash.**

---

## 3. Backend inventory

### 3.1 Routes — 4 total

| Method | Path | File:line | Auth | Purpose |
|---|---|---|---|---|
| GET | `/health` | `src/index.ts:25` | none | `SELECT current_database(), current_user()`; 200 or 500 |
| POST | `/auth/register` | `src/auth/router.ts:103` | none | validate → 400; email taken → 409; else 201 with the public user. **Issues no session.** |
| POST | `/auth/login` | `src/auth/router.ts:164` | none | 401 on unknown email *and* wrong password alike; 200 with `user` + `session_token` |
| POST | `/auth/logout` | `src/auth/router.ts:214` | `Bearer` | deletes the session row; 401 if unknown |
| — | anything else | `src/index.ts:44` | — | 404 JSON |

### 3.2 Auth method

- `bcryptjs` hashes, cost 12 by default from `src/auth/crypto.ts`.
- Login runs a **decoy** bcrypt verify on an unknown email so response time does not reveal
  which addresses exist (`router.ts:187`). This is correct and worth keeping.
- Session token is 256-bit random from `crypto.randomBytes`; only its **SHA-256** hash is
  stored in `sessions.refresh_token_hash`, so a database dump yields no usable token.
- TTL 30 days from `SESSION_TTL_DAYS`.
- **`Authorization` is verified on `/auth/logout` only.** `verifyPassword` and
  `hashSessionToken` are the only crypto used; there is no `requireAuth` middleware, so no
  other route checks a token. That is safe *today* because `/health` and the three auth routes
  need none, but it means the first real data route added will have no auth to build on. This
  was already recorded as a backend gap in Phase 1 and is confirmed here.

### 3.3 CORS

`src/index.ts:14-16` registers `cors({ origin: config.corsOrigins, credentials: true })` **only
when the list is non-empty**; empty means no CORS middleware at all, i.e. browsers are blocked.
`.env` currently allows 8081, 19006, 8082. Native clients ignore CORS entirely, so this affects
Expo web only. Correctly implemented.

### 3.4 Listen address

`src/index.ts:66` — no host argument, so all interfaces in practice. CORS origins are printed
at startup, the listen port is printed, the DB password never is.

### 3.5 Migrations — exist, and **have been run**

`node-pg-migrate` v9, wrapped by `scripts/migrate.mjs` so the `DB_*` parts stay the single
source of truth and the password reaches the child process only through its environment.

```
npm run migrate          # = node scripts/migrate.mjs up
npm run migrate:status   # dry run
npm run migrate:down
```

10 migration files, `001_domain_1_identity_auth` through `010_domain_10_extras_cross_cutting`.
Live ledger query this session — all 10 recorded, in order, at `2026-09-29 09:57:01.413269`:

| # | File | Domain |
|---|---|---|
| 001 | identity_auth | users, sessions, email_otp_requests |
| 002 | holder_verification | holder_verification_records |
| 003 | catalog | characters, variants, components, variant_components, value_references |
| 004 | marketplace_reference | permitted_categories, component_category_map |
| 005 | owned_attire | owned_attire, attire_usage_history, portfolio_photos |
| 006 | projects | projects, tasks, budget_line_items, project_milestones |
| 007 | marketplace_transactions | listings, structured_offers, chat_threads, chat_messages, transaction_milestones |
| 008 | events | events, event_participant_applications, group_meetups, meetup_members, guest_logistics |
| 009 | organizer_tools | contest_criteria, contest_opt_ins, commitment_change_log, invite_meetups, invite_meetup_participants |
| 010 | extras_cross_cutting | calendar_entries, diary_entries, live_location_sessions, user_notification_state, user_marketplace_participant_types, audit_events |

### 3.6 Tables and row counts — measured live this session

38 tables exist besides `pgmigrations`. Ten of them hold data; **28 are completely empty.**

| Table | Rows | | Table | Rows |
|---|---|---|---|---|
| users | 8 | | attire_usage_history | 0 |
| characters | 4 | | audit_events | 0 |
| variants | 12 | | calendar_entries | 0 |
| permitted_categories | 5 | | chat_messages | 0 |
| listings | 6 | | chat_threads | 0 |
| projects | 2 | | commitment_change_log | 0 |
| tasks | 8 | | components | 0 |
| budget_line_items | 7 | | contest_criteria | 0 |
| events | 3 | | contest_opt_ins | 0 |
| owned_attire | 3 | | diary_entries | 0 |
| | | | email_otp_requests | 0 |
| | | | event_participant_applications | 0 |
| | | | group_meetups | 0 |
| | | | guest_logistics | 0 |
| | | | holder_verification_records | 0 |
| | | | invite_meetup_participants | 0 |
| | | | invite_meetups | 0 |
| | | | live_location_sessions | 0 |
| | | | meetup_members | 0 |
| | | | portfolio_photos | 0 |
| | | | project_milestones | 0 |
| | | | sessions | 0 |
| | | | structured_offers | 0 |
| | | | transaction_milestones | 0 |
| | | | user_marketplace_participant_types | 0 |
| | | | user_notification_state | 0 |
| | | | value_references | 0 |
| | | | variant_components | 0 |

### 3.7 Seed data

`npm run seed` = `ts-node src/scripts/seed.ts`. Read-only against
`forgemind-mobile/src/data`, and it **has been run** — that is where all 10 non-empty tables
above come from.

Design points worth keeping:

- **Deterministic UUIDv5** from `(entity, source id)`, so re-running produces byte-identical
  ids and never breaks the FK graph. Every insert is `ON CONFLICT DO UPDATE`. Idempotent.
- **Seeded users cannot authenticate.** `password_hash` is the literal
  `!SEED_ACCOUNT_CANNOT_AUTHENTICATE`, not a hash. Correct choice.
- **Transparent omissions.** 6 items with no schema home are printed, not dropped silently,
  including that `match_components.json` has no target table.

8 seeded users: `head.organizer@forgemind.dev` (Head Organizer, secretariat),
`demo-user-1` (Cosplayer, buyer), `demo-seller@forgemind.test` (seller),
`demo-crafter@forgemind.test` (both), `demo-photographer@forgemind.test` (seller),
`seed-system`, `user-oc-creator`, `seed-user`.

**Consequence for the demo: there is no seeded account that can log in.** Every seeded user is
synthetic and password-blocked, so a phone demo with the backend up still cannot sign in as
any of them. Step B item 2 has to solve this; it cannot lean on the seed.

---

## 4. Source-of-truth table

Postgres = the backend's storage. AsyncStorage = the device. `—` = neither.

| Entity | Postgres | AsyncStorage | Where the app actually reads it | Mismatch vs `docs/DATABASE.md` |
|---|---|---|---|---|
| **accounts** (auth) | yes `users` | cache + session | `AuthService` → Postgres | **Split.** Postgres is authoritative; the device holds a cache and the active session. `DATABASE.md` does not describe this split. |
| **accounts** (roles, dept, marketplace reg, payout, portfolio) | `users` has the columns | **yes, authoritative** | `AuthService.ts:84-106` | **Split, inverted.** `updateOrganizerRole`, `setStaffDepartment`, `updateDepartmentVerificationStatus`, `submitMarketplaceRegistration` are **AsyncStorage-only** (`:438-684`). Postgres columns exist and are never written by the app. |
| **verification** (Holder) | `holder_verification_records` (0 rows) | `verification_status` on the account | `VerifyCosplayersScreen` | **Split.** Status is decided in AsyncStorage; the Postgres table it maps to is never written. |
| **listings** | yes `listings` (6) | yes `@forgemind:marketplace_listings` | AsyncStorage via `MarketplaceContext` | **Dual, AsyncStorage authoritative.** No listing API exists. |
| **offers** | `structured_offers` (0) | `@forgemind:marketplace_offers` | AsyncStorage via `OffersContext` | **Dual, AsyncStorage authoritative.** |
| **chat** | `chat_threads`, `chat_messages` (0) | `@forgemind:marketplace_chat` | AsyncStorage via `ChatContext` | **Dual, AsyncStorage authoritative.** Spec §Data-18 also requires it transaction-scoped; see D-8. |
| **events** | `events` (3) | `@forgemind:events` | AsyncStorage via `EventsContext` | **Dual, AsyncStorage authoritative.** |
| **logistics** | `guest_logistics` (0) | `@forgemind:logistics_entries` | AsyncStorage via `LogisticsContext` | **Dual, AsyncStorage authoritative.** |
| **commitment log** | `commitment_change_log` (0) | `@forgemind:commitment_log` | AsyncStorage via `CommitmentLogContext` | **Dual, AsyncStorage authoritative.** |
| **contests** | `contest_criteria`, `contest_opt_ins` (0) | `@forgemind:contest` | AsyncStorage via `ContestContext` | **Dual, AsyncStorage authoritative.** |
| **projects** | `projects`, `tasks`, `budget_line_items` (2/8/7) | **neither** | `useState` only | **Neither in the app.** `ProjectsContext.tsx:53-71` holds everything in memory and re-seeds from `src/data` on every mount. Also `projects`, `tasks`, `budget_items` are **bundled JSON**, not AsyncStorage. |
| **owned attire** | `owned_attire` (3) | `@forgemind:owned_attire` | AsyncStorage via `OwnedAttireContext` | **Dual, AsyncStorage authoritative.** |
| **notifications** | `user_notification_state` (0) | `@forgemind:notification_seen` | AsyncStorage via `UserContext` | **Dual, AsyncStorage authoritative.** No push capability at all. |
| **AI results** | — | — | `src/data/match_components.json`, **bundled** | **Neither.** The one AI artifact is a static 607-byte JSON file. No engine, no version label. |

### 4.1 Full mismatch list against `docs/DATABASE.md`

**`DATABASE.md` proposes 47 `CREATE TABLE` statements. Postgres has 38 tables. The two lists
barely overlap.**

Proposed in `DATABASE.md`, **absent from Postgres** (21):

`ai_results`, `attire_condition_photos`, `commission_milestones`, `commitment_log`,
`component_category_map`, `event_meetups`, `event_staff_members`, `logistics_entries`,
`logistics_field_versions`, `marketplace_registration`, `meetup_rsvps`, `migration_ledger`,
`notification_state`, `offers`, `organizer_access_requests`, `outbox`, `reference_cache`,
`schema_meta`, `session`, `shown_notifications`, `user_consent`

Present in Postgres, **absent from `DATABASE.md`** (12):

`audit_events`, `commitment_change_log`, `email_otp_requests`, `group_meetups`,
`guest_logistics`, `live_location_sessions`, `meetup_members`, `sessions`,
`structured_offers`, `transaction_milestones`, `user_marketplace_participant_types`,
`user_notification_state`

Root cause, and it is a design decision rather than a bug: `DATABASE.md` was written in
Phase 1 as an **on-device SQLite** target keyed to AsyncStorage, while `forgemind-backend` is a
**server-side PostgreSQL** schema keyed to the spec's normalized entities. They are two
different systems that the documents never reconciled. The reconciliation is D-1 and it is the
single most consequential decision in this report.

Three name pairs are the same concept under two names, which is why the raw diff looks worse
than the reality:

| `DATABASE.md` (SQLite) | Postgres | Verdict |
|---|---|---|
| `session` | `sessions` | same |
| `commitment_log` | `commitment_change_log` | same |
| `offers` | `structured_offers` | same |
| `event_meetups` | `group_meetups` | same |
| `logistics_entries` | `guest_logistics` | same |
| `notification_state` / `shown_notifications` | `user_notification_state` | same |
| `offers` + `structured_offers` **both** | `structured_offers` | **`DATABASE.md` double-counts offers** |

Two gaps that are neither a naming nor a scope difference:

- **`live_location_sessions` exists in Postgres** but the spec is self-contradictory about it:
  `ForgeMind.docx` §Scope says the system does **not** "track live location", while
  `ForgeMind_Overall_Data_Information.docx` §Phase 1 and §Phase 3 build a live-location relay
  and §Phase 6 put a two-device live-location demo in the defense script. I am not resolving
  this. It is D-9.
- **`socket.io` is not a dependency.** The build plan names it for the location relay. There
  is no realtime path in the mobile app or the backend.

---

## 5. Dependency map

65 screen files. Categorised by what they actually need at run time.

### (a) Metro only — 62 of 65

Everything except the three auth screens. These read bundled JSON (`src/data/*.json`),
AsyncStorage, or `useState`. They need no server, and they work on a phone in Expo Go today.

Cosplayer (33): CharacterBrowse, VariantList, MatchResults, EntryMethod, PhotoEntry, TextEntry,
VoiceEntry, OwnedItemDashboard, OwnedItemDetail, PortfolioManagement, AppearanceHub, Marketplace,
CreateListing, ListingDetail, MakeOffer, OfferDetail, OfferLog, ItemConfirmation,
CommissionProgress, MarketplaceRegistration, Projects, ProjectDashboard, CreateProject,
CalendarBrowse, CosplayDiary, ContestsList, EventMeetups, CreateInviteMeetup,
InviteMeetupsHome, InviteMeetupDetail, JoinInviteMeetup, ChatList, ChatThread

Organizer (16): Events, EventDetail, CreateEvent, LogisticsHome, AddLogisticsEntry,
LogisticsEntryDetail, EventLogistics, GroupMeetup, Meetups, CalendarManage, CalendarApproval,
ContestManage, VerifyCosplayers, VerifyStaff, ManageStaff, RequestOrganizerAccess

Holder / dev / shared (13): HolderReviewQueue, HeadOrganizerRegistration, StaffRegistration,
RoleSelection, Welcome, BodySliderOnboarding, Profile, ShareableCard, PolicyViewer,
Diagnostics, ComponentShowcase, Preview3DTest, FE-5-5-PhoneFrameTest

33 + 16 + 13 = 62, plus the 3 auth screens = 65, matching the 65 `.tsx` files under
`src/screens/`.

Caveat: all 62 are `NOT TESTED` on a device. "Metro only" is a static claim from reading the
imports, not an observed run.

### (b) Metro + backend — 3 of 65

`LoginScreen`, `RegisterScreen`, `AccountCreationScreen`. All three reach only
`/auth/login`, `/auth/register`, `/auth/logout`.

### (c) Metro + backend + Flask — **0 screens**

No screen, no service, and no util in the mobile app references port 5000, `/api/match`, or
`forgemind-ai`. The three textual hits I searched for were false positives: a `15000` timeout
constant, the word "matcher" in a `variants.json` prose field, and a comment in
`listingScreener.ts` saying real classification is Phase 4 work.

**Consequence: no screen can be demonstrated with Flask doing anything.** The listing screener
is a local rule-based blocklist (`src/utils/listingScreener.ts`), and the attire matcher is a
bundled `match_components.json`. The two-engine pattern (`LocalEngine` / `RemoteEngine` with an
`engine` + `engine_version` label) that the standing rules require **does not exist anywhere in
the codebase** — I searched for `engine_version`, `LocalEngine`, and `RemoteEngine` and got
zero hits.

---

## 6. Failure behavior

### 6.1 Backend unreachable

| Path | Current behavior | Verdict |
|---|---|---|
| Register | `authFetch` rejects → `catch` at `AuthService.ts:298` → `'Failed to create account. Please try again.'` | **Generic. Indistinguishable from a real failure.** |
| Login | same → `'Login failed. Please try again.'` at `:343` | **Generic** |
| Logout | inner `try/catch` logs, clears local session anyway (`:386-390`) | **Graceful — the right behaviour** |
| Everything else | never calls the network | n/a |

Three distinct problems in the register/login path:

1. **A wrong password, an email already taken, and a dead backend all produce a generic
   sentence.** The server does distinguish them properly — 401 `invalid_credentials`, 409
   `email_taken`, both with a `message` — and `errorMessage()` (`:154-168`) reads that message
   correctly. The information is thrown away at the `catch`, because a network failure never
   produces a `Response` to pass to `errorMessage()`. So the code already does the right thing
   for the cases that respond, and nothing for the case that does not.
2. **`IS_API_URL_CONFIGURED` is checked but almost never true.** `:164` substitutes
   "Cannot reach the server" when the env var is unset. `.env.local` *does* set it, so that
   branch is dead in this checkout — which is exactly the configuration where the generic
   message appears.
3. **The 15-second timeout is the only backstop.** `AUTH_TIMEOUT_MS = 15000` (`:30`) with an
   `AbortController`. The button stays disabled for up to 15 s with a spinner, then shows a
   generic error. No spinner can hang forever, so the "endless spinner" failure mode is already
   prevented — but the wait is long enough to look broken on a demo.

`LoginScreen` clears `isLoading` in all paths (`:108`) and renders `loginError` inline, so
there is no stuck spinner and no crash. Same shape in `RegisterScreen`. **The failure is
graceful but uninformative** — which is precisely Step B item 1.

### 6.2 Flask unreachable

Unreachable *and irrelevant*: nothing calls it. No screen is affected.

### 6.3 PostgreSQL unreachable

The backend process survives it. `pool.on('error')` logs idle-client failures without the
connection string (`db.ts:18-21`). Every query rejects, `asyncHandler` forwards to the error
handler, and the client gets a 500 with `'Something went wrong. Please try again.'`.
`/health` returns 500 with the raw `err.message` — useful for diagnosis, and a small
information-disclosure surface on a LAN. The app then shows the same generic auth error as in
§6.1, so **a dead database and a dead backend look identical to the user**.

---

## 7. Needed updates, ranked

Effort: S ≈ under a day, M ≈ 1-2 days, L ≈ a week or more. All `NOT TESTED` until run.

### P0 — blocks the demo

| # | Item | Effort | Serves |
|---|---|---|---|
| 1 | **Auth failure classification.** Route a `fetch` rejection into `errorMessage()` so "cannot reach server" is distinct from a 401 and a 409, with a retry affordance. The server already returns the right messages; only the transport failure is mishandled. | S | `ForgeMind.docx` §Data-20, §AI-Output-36 (no action without confirmation) |
| 2 | **Offline demo mode.** AsyncStorage-backed seeded Cosplayer / Head Organizer / Staff accounts, a visible banner, per-screen mode label, and no silent mixing with backend data. | **L** | §Data-20, Phase 3 §32 |
| 3 | **`EXPO_PUBLIC_API_URL` → LAN IP, documented, with `npx expo start -c`.** Reaches every physical-phone demo. | S | demo constraint |
| 4 | **Replace `confirm()` at `ContestManageScreen.tsx:85` with `ConfirmationModal`.** Convention violation *and* a probable `ReferenceError` on both platforms, inside a named defense-demo flow. | S | Phase 6 §58 |
| 5 | **Verify a demo login exists.** No seeded account can authenticate (`!SEED_ACCOUNT…`), so a phone demo with the backend up still cannot sign in. | S | §Data-20 |

### P1 — needed for a credible defense

| # | Item | Effort | Serves |
|---|---|---|---|
| 6 | **Persist projects.** `ProjectsContext` is `useState` only; every project, task, budget line and milestone vanishes on reload. Postgres already has `projects`/`tasks`/`budget_line_items`. | M | §Data-11, §Data-16 |
| 7 | **Two-engine pattern.** `LocalEngine` always works, `RemoteEngine` when reachable, identical outfit-spec output, both labelled with `engine` + `engine_version`. Zero occurrences today. | **L** | standing rule; §AI-Concept-27 |
| 8 | **Postgres vs SQLite decision** (D-1). Until this is settled, every data item below is ambiguous. | S to decide, **L** to implement | §AI-Concept-3 (four layers) |
| 9 | **Split-brain on roles and verification.** `AuthService.ts:438-684` writes organizer role, staff department, department verification, and marketplace registration to AsyncStorage only, while `users` already has those columns. Two sources of truth for permission decisions. | M | §AI-Concept-5 (Holder is the sole admin role) |
| 10 | **Keyboard avoidance on the 17 forms without it** (`TEST_MATRIX.md` R-3). | M | standing convention |
| 11 | **`DateInput` iOS spinner has no dismiss path** (R-5), 14 call sites in 10 files. | S | standing convention |
| 12 | **`ConfirmationModal` instead of `Alert.alert`** — 27 calls in 7 files (6 screens + `ConfirmationModal.tsx` itself). | M | standing convention |
| 13 | **Add `requireAuth` middleware before the first data route.** | S | §AI-Concept-5 |
| 14 | **Body-size cleanup Decision A** (UI removal only; B and C wait on approval). | S | `DROPPED` per standing rules |

### P2 — correctness and hardening

| # | Item | Effort | Serves |
|---|---|---|---|
| 15 | Re-raise R-1 config plugins before any build outside Expo Go. Inert for the demo. | M | future standalone build |
| 16 | `/health` should not return raw `err.message`. | S | hardening |
| 17 | Delete the stale `DB_URL` from `forgemind-backend/.env`; the wrapper already derives the connection string from `DB_*`. | S | D-6 |
| 18 | Reconcile `DATABASE.md` naming with Postgres (D-1) and drop the duplicated offers pair. | S | §4.1 |
| 19 | Holder verification: write to `holder_verification_records`, not just the AsyncStorage status field. | M | §Data-20 |
| 20 | Live-location relay: `socket.io` dependency, `live_location_sessions` wiring. Blocked on D-9. | **L** | spec is self-contradictory |
| 21 | Rotation / iPad resize: `Dimensions.get` in 2 files, no `useWindowDimensions`. | S | polish |
| 22 | Voice entry: transcript must be shown for confirmation before saving. | S | §Scope-39 |
| 23 | Guard `Map.key` for ids built from `Date.now()` (two additions in the same ms collide). | S | latent bug |

### Explicitly not started

AI Phase 2 — dataset folder work, matcher port, outfit spec. `forgemind-ai/datasets` exists and
`src/api.py` imports `AttireMatcher` from it, but the service is not running, no mobile code
references it, and the rule-based scorer in `listingScreener.ts` is explicitly labelled Phase 4
work. It stays NOT started pending approval.

---

## 8. Decisions I must make

| # | Decision | Recommendation | Cost of not deciding |
|---|---|---|---|
| **D-1** | **Postgres or SQLite, and which is authoritative per entity.** | **Postgres is the system of record** — `ForgeMind_Overall_Data_Information.docx` §Overall System Architecture mandates Node/PostgreSQL, the backend exists, 38 tables are migrated and seeded, and only 3 of 65 screens work without it. Keep AsyncStorage as a **read cache and offline write queue**, never a second authority. Drop the `DATABASE.md` "SQLite replaces AsyncStorage" framing. | Every data item in §4 stays ambiguous, and 12 tables in Postgres stay orphaned. |
| **D-2** | **Is the offline demo mode acceptable in a defense?** | Yes, provided it is visibly labelled on every screen. §Phase 6 §58 requires a live demo loop; without a fallback, one Wi-Fi hiccup ends it. | Demo is fragile. Records a §Scope-39 limitation out loud. |
| **D-3** | **Which URL for the phone — LAN IP or hotspot?** | Support both; document both. `npx expo start -c` after any change, since the value is inlined at build time. | Phone demo shows "Failed to fetch" every time. |
| **D-4** | **Is a dead backend allowed to look different from a wrong password?** | Yes, and it is already 80% built — the server distinguishes them and `errorMessage()` already renders the server's message. | The exact complaint that started this review stays unfixed. |
| **D-5** | **Body-size traces: A, B, or C?** | **A now** (UI removal, no data touched). B and C need your explicit approval. | 16 dead traces stay in the code and the schema. |
| **D-6** | **May I delete the stale `DB_URL` from `.env`?** | Yes. `scripts/migrate.mjs` exists precisely to prevent that two-copies failure, and the file currently defeats it. | A future password edit fails with a confusing auth error. |
| **D-7** | **Should `forgemind-ai` be wired at all before the defense?** | No. Keep it out. Nothing in the app calls it, and D-7 is cheaper to defer than to half-wire. | — |
| **D-8** | **Chat scope.** Spec §Data-18 requires a thread to be scoped to two verified parties on one active transaction and to close when it completes. `ChatContext` is device-local with no verification check. | Accept the local model for the demo; document the gap. Building transaction scoping needs D-1 first. | A defensible gap, not a defect, until D-1 lands. |
| **D-9** | **Live location — in or out?** | **Out.** `ForgeMind.docx` §Scope explicitly says the system does not track live location; the build plan says it does, and the defense script demos it. I am not resolving a contradiction between your two source-of-truth documents. | Phase 6 §58's two-device demo cannot run. |
| **D-10** | **Should `docs/DATABASE.md` be rewritten to mirror Postgres?** | Yes, after D-1. As it stands it describes a device-local SQLite schema that no code uses. | The document misleads the next reader, which is what caused §4.1. |
| **D-11** | **Flask dataset path.** `src/api.py:16` uses `datasets_path="../datasets"`, resolved from the working directory. `forgemind-ai/datasets` exists; the parent-of-repo `datasets` does not. Running from `forgemind-ai/` points at a directory that is not there. | Fix when AI is approved. Out of scope now. | Flask cannot start from its own folder. |
| **D-12** | **Who gets a working demo login?** | Decide together with D-2. Either a real account created through the UI during the demo, or a documented offline persona. | With the backend up, nobody can log in at all. |

---

## 9. Disagreements found, recorded not changed

| # | Disagreement | Where |
|---|---|---|
| 1 | Live location: forbidden by §Scope, required by §Phase 1/3/6 | `ForgeMind.docx` §Scope-39 vs `…_Overall_Data_Information.docx` §18, §36, §58 |
| 2 | Body-size slider is central to §AI-Concept-7, §AI-Concept-28, §AI-Output-35, and §Scope-38, and is dropped by standing rule | spec vs `DROPPED` |
| 3 | Spec wants a continuous body-size range; the demo constraint bans the config plugins that would deliver it | spec vs demo constraint |
| 4 | AI is "called by the backend rather than directly by the app" (§Overall System Architecture), and the screener trigger belongs in Phase 3. Neither exists. | spec vs `src/index.ts:21-24` |
| 5 | `socket.io` is named for the relay; not a dependency | spec §38 vs `package.json` |
| 6 | Two-engine `engine` + `engine_version` labelling is a standing rule; zero occurrences | standing rule vs codebase |
| 7 | `docs/DATABASE.md` describes on-device SQLite; the real system is server-side PostgreSQL | `DATABASE.md` vs `forgemind-backend` |
| 8 | `TEST_MATRIX.md` R-1/R-2 were ranked P0 against a build the demo constraint forbids | `TEST_MATRIX.md` vs demo constraint |
| 9 | `AuthService.ts:72` still declares `body_size_slider` as a required field and `AuthService.ts:194` still defaults it to 0.5, though the feature is dropped | code vs `DROPPED` |
| 10 | Seeded `users.base_body_selection` is filled with `'female'` purely to satisfy a `NOT NULL CHECK` the app itself has dropped | `seed.ts:262` vs `DROPPED` |

I did not change any of these. Each is a decision for you.

---

## 10. Appendix: commands, verbatim

```powershell
# 1. PostgreSQL (already running as a service)
Get-Service postgresql-x64-18

# 2. Migrations
cd forgemind-backend
npm run migrate          # up
npm run migrate:status   # dry run
npm run migrate:down

# 3. Seed (already run; idempotent, re-runnable)
npm run seed

# 4. Backend
npm run dev              # = ts-node src/index.ts, port 3000
# then:
curl http://localhost:3000/health
# {"status":"ok","database":"forgemind_dev","role":"forgemind_app"}

# 5. Point the phone at the backend (run from forgemind-mobile)
#    find the PC's LAN IP first:  ipconfig   ->  IPv4 Address
#    then set the LAN IP in .env.local, and RESTART Metro with the cache cleared:
npx expo start -c

# 6. Mobile
npx expo start           # Metro, port 8081
#    then scan the QR with Expo Go on the phone

# 7. Flask (NOT started; D-11 applies)
cd ..\forgemind-ai
.\start_api.ps1           # activates venv, runs python src/api.py, port 5000

# 8. Read-only database inspection used for this report
psql -h 127.0.0.1 -U forgemind_app -d forgemind_dev -c "\dt"
psql -h 127.0.0.1 -U forgemind_app -d forgemind_dev -c "SELECT * FROM pgmigrations ORDER BY run_on;"
```
