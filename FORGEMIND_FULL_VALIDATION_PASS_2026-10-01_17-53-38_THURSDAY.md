# FORGEMIND FULL VALIDATION PASS

**Generated:** Thursday, 2026-10-01 17:53:38 +08:00
**Repos:** `forgemind-mobile` (branch `master`), `forgemind-backend` (branch `master`)
**Commits covered:** `c0d9b06`, `2f315ab`
**Node:** v24.19.0 · **Shell:** PowerShell 5.1 · **Platform:** win32

> Secrets are masked as `****` throughout. Nothing in this document is a claim I
> did not run — anything not executed is marked **NOT RUN**.

---

## Table of contents

1. [Part 1 — Phone cannot reach the server](#part-1--phone-cannot-reach-the-server)
2. [Part 2 — Verify Staff by Department](#part-2--verify-staff-by-department)
3. [Part 3 — Marketplace validation](#part-3--marketplace-validation)
4. [Part 4 — Full function and button validation](#part-4--full-function-and-button-validation)
5. [Part 5 — "Not yet done" report](#part-5--not-yet-done-report)
6. [Commits, verification output, NOT TESTED list](#6-commits-verification-output-and-not-tested-list)

---

## Part 1 — Phone cannot reach the server

### Root cause: two independent faults, both confirmed

#### Fault A — the backend was not running at all

`netstat -ano | findstr :3000` returned **no output**. No process held port 3000.
`POST /auth/login` could not have succeeded from anywhere, web included. This
alone explains every symptom.

After starting it (`npm run dev`, forgemind-backend):

```
forgemind-backend listening on 0.0.0.0:3000 (development)
CORS origins: http://localhost:8081, http://localhost:19006, http://localhost:8082 (plus private-LAN origins on Expo dev ports)
  phone / LAN:  http://192.168.254.168:3000
  this PC:      http://localhost:3000
  android emu:  http://10.0.2.2:3000
  health:       GET /health
```

#### Fault B — Windows Firewall, and the network profile is Public

```
=== firewall rules allowing TCP 3000 ===
NO firewall rule references local port 3000

=== connection profiles ===
Name            InterfaceAlias  NetworkCategory
Reiatsu Wi-Fi                   Public

=== netsh advfirewall show allprofiles state ===
Domain Profile Settings:  State ON
Private Profile Settings: State ON
Public Profile Settings:  State ON
```

All three profiles are ON, there is **no inbound allow rule for TCP 3000**, and
the active Wi-Fi is categorised **Public**, not Private. Even with the server
running, packets from the phone are silently dropped — which surfaces on Android
as exactly `fetch failed: Fetch request has been canceled`.

Metro on 8081 worked because Windows permits that port for the Expo dev loop;
3000 has no equivalent rule.

**Your base-URL logic was correct all along.** The log line

```
[api] backend base URL: http://192.168.254.168:3000 (source: Metro hostUri; platform: android)
```

proves the phone derived the right LAN IP from Metro, and `src/config/api.ts:109-127`
never allows a loopback value on native. **Do not hardcode an IP.**

### A third, separate problem: the database password

`GET /health` returns 500 because of this:

```json
{"status":"error","message":"password authentication failed for user \"forgemind_app\""}
```

`forgemind-backend/.env` has `DB_PASSWORD` set to the literal string `****` — a
mask, not a password. PostgreSQL uses `scram-sha-256` for `host 127.0.0.1/32`,
so nothing can authenticate. Confirmed independently:

```
psql: connection to server at "127.0.0.1", port 5432 failed:
FATAL:  password authentication failed for user "forgemind_app"
```

```
POST /auth/register -> HTTP 500
[auth] unhandled error: password authentication failed for user "forgemind_app"
```

`forgemind-mobile/docs/SYSTEM_REPORT.md:59` claims the password is "10
characters, present". The file no longer contains it. **You must restore the
real `DB_PASSWORD`** (`.env` is gitignored, so it was never committed). Until
then every DB-backed endpoint fails regardless of Wi-Fi. I did not invent a value.

### Ordered diagnosis results

| # | Check | Result |
|---|---|---|
| 1 | Listen address | `0.0.0.0:3000` — correct, no fix needed. `forgemind-backend/src/index.ts:120`; host default `0.0.0.0` at `src/config.ts:39`. `HOST` absent from `.env` so the safe default applies. |
| 2 | `curl http://192.168.254.168:3000/health` | **HTTP 500** (not a timeout) — reachable, DB query inside fails |
| 3 | Firewall | **No allow rule for TCP 3000; Wi-Fi profile is Public** |
| 4 | Phone browser test | See [operator actions](#operator-actions--you-must-run-these-yourself) |
| 5 | Abort origin | `AuthService.ts` `AbortController` with a **10 s** timeout |
| 6 | `console.error` on network failure | Yes — login, logout and register all used it |
| 7 | Dev health ping | Did not exist — added |
| 8 | Base-URL logic | Correct, verified in code |

### What I changed (commit `c0d9b06`)

**`src/services/AuthService.ts`**

- `AUTH_TIMEOUT_MS` 10000 → **15000**. 10 s aborted legitimate cold-start
  requests; the first login after a server restart pays a bcrypt hash cost, and
  on a phone the request also crosses Wi-Fi.
- `console.error` → **`console.warn`** on the three expected-failure paths, so
  Expo no longer throws the red error screen: registration, login, and
  server-logout failure. Logout still clears local state on failure — the
  `multiRemove` runs outside the inner catch, preserving the intent of the
  existing comment.
- `transportErrorMessage` now returns the single
  `"Can't reach the server. Check that your phone and PC are on the same Wi-Fi."`
  message for aborts too. Previously an `AbortError` produced a *different*
  "took too long" string, which made one root cause look like two bugs.

**`src/config/api.ts`**

- Added a dev-only startup health ping logging exactly one line: URL, result,
  ms. It never rejects or blocks the bundle, and a 500 is reported as
  `reachable (HTTP 500)` so you can tell "phone can't reach it" from "phone
  reached it, DB is down".

**Line numbers after the edits**

| Symbol | Location |
|---|---|
| `AUTH_TIMEOUT_MS` (15000) | `src/services/AuthService.ts:30` |
| `authFetch` (AbortController) | `src/services/AuthService.ts:196-209` |
| `transportErrorMessage` | `src/services/AuthService.ts:245-250` |
| register `console.warn` | `src/services/AuthService.ts:387` |
| login `console.warn` | `src/services/AuthService.ts:430` |
| logout `console.warn` | `src/services/AuthService.ts:477` |
| logout `multiRemove` (state clear) | `src/services/AuthService.ts:480` |
| dev health ping | `src/config/api.ts:148-183` |

### Operator actions — you must run these yourself

Firewall (needs **Administrator** PowerShell; I did not change the firewall):

```powershell
New-NetFirewallRule -DisplayName "ForgeMind dev 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

Also set **Settings → Network & internet → Wi-Fi → Reiatsu Wi-Fi → Security →
Private**. Right now it is Public, so a Private-profile rule will not match.
Either fix the category or use `-Profile Any` — your call, not mine.

Phone browser test, one line — open `http://192.168.254.168:3000/health` in the
phone's browser:

| Outcome | Meaning |
|---|---|
| JSON with `"status":"error"` | Phone reaches the server. Network is fine; problem is app-side or the DB password. |
| Timeout / cannot connect | Firewall, AP client isolation, or a different network. |
| `{"status":"ok",...}` | Everything is up; go back to the app. |

Then restore `DB_PASSWORD` in `forgemind-backend/.env` and run `npm run dev`.

### NOT RUN (phone taps — I have no device)

- Login from the phone
- Logout from the phone
- Register from the phone
- The on-screen "Can't reach the server" text as rendered on a device
- Expo red-screen suppression on a real device

Server-side substitute I *did* run against the LAN IP:
`POST /auth/login` → **HTTP 400** `invalid_json` (shell quoting, not an app fault
— the correct-body retry reached the DB and returned 500), `POST /auth/register`
→ **HTTP 500** (DB password), `GET /health` → **HTTP 500** (DB password).

---

## Part 2 — Verify Staff by Department

### The layout was never broken — verified with git, not the changelog

```
$ git log --follow --format='%h %ad %s' --date=iso -- src/screens/organizer/VerifyStaffScreen.tsx
a67984c 2026-09-19 21:07:56 +0800 Fix blank button in approve/reject success modal, restore missing confirmation step, audit Verify screen buttons, fix T&C display on all four registration screens
574a5e3 2026-09-19 19:49:30 +0800 Fix Marketplace success modal (dedicated design), fix staff dashboard not reflecting department approval, fix non-functional approve/reject popups
1af87f3 2026-09-19 18:44:24 +0800 Add Head Organizer department ownership with scoped staff verification routing
dd0fb0d 2026-09-19 17:00:09 +0800 Add approve/reject confirmation popups and required rejection reasons for marketplace and staff verification
0152d4e 2026-09-19 10:47:41 +0800 Format verification status labels for display (no raw enums)
cfd7c55 2026-09-19 09:53:31 +0800 Add staff department verification scoped to selected department
```

```
$ git diff --stat a67984c HEAD -- src/screens/organizer/VerifyStaffScreen.tsx
(empty = identical)

$ git log --oneline a67984c..HEAD -- src/screens/organizer/VerifyStaffScreen.tsx
(empty = never touched again)
```

The file has not been touched since Sept 19. `5018aba` (Sept 29) touched
`.env.example`, `CHANGELOG.md`, `src/config/api.ts` and `AuthService.ts` only —
**it never touched VerifyStaffScreen**, so there is nothing to revert and nothing
was reverted.

Also confirmed: `bc8b0d5` was a VerifyCosplayersScreen hooks fix, not a layout
change. `84994d4` predates the department-scoped work. The chip bar has never
had `height: 56` in any revision — `chipScroll` is `flexGrow: 0` at every commit.
The "outer View height 56 + overflow hidden" convention applies to the
**marketplace category bar**, which does have it
(`MarketplaceScreen.tsx:605-609`), and not to VerifyStaff.

### What it looks like now vs the last good version

Identical.

| Element | Current code |
|---|---|
| Department chips | `ScrollView` (`chipScroll`, `flexGrow: 0`) over `chipContainer` with horizontal padding |
| Staff cards | grouped under a per-department header with a count badge (`departmentGroup` / `departmentHeader` / `departmentCount`) |
| Status tags | `department_verification_status` |
| Approve / Reject | `Button` pair |
| Approve confirm | `ConfirmationModal` at `:416` |
| Reject | `ConfirmationModal` at `:426` plus `RejectionReasonModal` |
| Loading / empty | `loading` state and an empty branch |

### Why the content looked wrong — BLOCKED BY STEP 1

The wrong content is not a layout regression. It is the data source:

```
VerifyStaffScreen.tsx:71,124   AuthService.getAccounts()
VerifyCosplayersScreen.tsx:94  AuthService.getAccounts()
LogisticsContext.tsx:450,534,610 AuthService.getAccounts()
OrganizerService.ts:319         AuthService.getAccounts()
```

`getAccounts()` reads `@forgemind:accounts` — the phone-only list. On a device
where the server is unreachable, that list is whatever was cached on that one
phone, so departments and statuses do not match what a Head Organizer expects.
Per your instruction I did **not** patch this with a local workaround.

**Endpoints needed (none exist yet):**

| Need | Required endpoint |
|---|---|
| Staff roster scoped to a Head's department | `GET /auth/staff?department=<dept>` |
| Approve / reject staff | `PATCH /auth/organizer-fields` with `department_verification_status` + `department_rejection_reason` — **exists** |
| Claimed departments for fallback routing | `GET /auth/organizer-departments` |
| Cosplayer verification queue | `GET /auth/verification-queue` |
| Marketplace verification queue | `GET /auth/marketplace-applications` |

The approve/reject **writes** already exist server-side. Only the reads are missing.

One thing to fix when you get there: `VerifyStaffScreen.tsx:136,173,176,201,204`
still call `Alert.alert`, against your standing convention. Report-only here,
since it is outside the FIX list for this pass.

### The other three screens

- **VerifyCosplayersScreen** — also `getAccounts()` at `:94`. Same blocker. Last
  changed Sept 19 (`a67984c`), unchanged since.
- **ManageStaffScreen** — last touched `c063211` (Sept 22, task status). Does
  **not** read the accounts list directly, but its staff rows come from
  `LogisticsContext.getEligibleStaff`, which does.
- **StaffPickerModal** — takes staff as props (`StaffPickerModal.tsx:20-43`); the
  list is fetched by the caller. Same upstream blocker.

---

## Part 3 — Marketplace validation

Validated against the changelog entries of Sept 20, 2026 (10:13 to 16:45).

| Item | STATUS | Evidence |
|---|---|---|
| Category chip bar: outer View height 56 + overflow hidden, no minHeight, all 9 categories | WIRED for 8, SUSPECT on count | `MarketplaceScreen.tsx:605` `height: 56`, `:609` `overflow: 'hidden'`, no `minHeight`. **The shipped list has 8 categories, not 9** — `constants/marketplaceCategories.ts:10-17`. Verified by test assertion. |
| Listing cards: fixed height 140 | WIRED | `MarketplaceScreen.tsx:657` `height: 140` |
| Thumbnail 100 wide, full height | WIRED | `:663` `listingThumbnail` |
| `numberOfLines` on text | WIRED | `:227`, `:240`, plus `:317`, `:337` |
| `formatPHP` everywhere | WIRED | `:238` |
| No remaining `$` price | WIRED | grep across all `.ts`/`.tsx`: zero price renders with a bare `$`; only `₱` via `formatPHP` |
| Empty-state round-icon card | WIRED | `:348-366` `emptyStateCard` + `emptyStateButton` |
| Header: Messages (unread dot) \| Offers \| Create, fits 390 px | WIRED | `:264-292`. Fits 390 px by inspection — no runtime measurement taken. |
| Create listing: prohibited-items banner | WIRED | `CreateListingScreen.tsx:421-428` |
| `screenListing()` runs before `createListing` | WIRED | `:144` screens, `:149` creates |
| Blocked saved as `'blocked'` | WIRED | `:155-157` |
| Blocked never in `getActiveListings` | WIRED | `MarketplaceContext` filters `status === 'active'` |
| Block modal: Edit & Resubmit + Appeal | WIRED | `:171-178`, `:455-459` |
| `AppealModal` stores `appeal_status: 'pending'` | WIRED | `MarketplaceContext.tsx:119` |
| Offers: `getAllowedOfferTypes` per category | WIRED | `offerRules.ts:16-21` — proven by test |
| Duplicate pending offer refused | WIRED | `OffersContext.tsx:109-117` |
| Second accepted purchase/trade refused | WIRED | `:173-180` |
| Commissions can be accepted more than once | WIRED | the guard excludes `'commission'` |
| Withdraw | WIRED | `:214-228` |
| Offer log tabs, Received only for seller/both | WIRED | `OfferLogScreen.tsx:72-80` |
| Chat: one thread per listing+buyer | WIRED | `ChatContext.tsx:143` |
| Chat closes on manual close or inactive listing | WIRED | `:265-283`, `getEffectiveStatus` `:117-125` |
| Sender must be a participant | WIRED | `:202-204`, `:259-261` |
| 1000 char limit | WIRED | `:221-222` |
| Unread dot | WIRED | `ChatListScreen.tsx:142` |
| Chat content never read by rule/AI code | WIRED | `@forgemind:marketplace_chat` imported only by `ChatContext`, `ChatListScreen`, `ChatThreadScreen`, `ListingDetailScreen`, `MarketplaceScreen`, `OfferDetailScreen`. No `listingScreener`, `offerRules` or `logisticsRules` import touches it. |
| Marketplace registration submit reaches the server | **BROKEN — BLOCKED BY STEP 1** | `AuthService.ts:770` reads `getAccounts()`; no `authUrl` call at all. Never had a server path. |
| Storage keys are the real ones | WIRED | all 15 keys confirmed present and used |

**Real storage keys (verified by `npm run check:wiring`):**

| Key | Owner |
|---|---|
| `@forgemind:marketplace_listings` | `MarketplaceContext.tsx:13` |
| `@forgemind:marketplace_offers` | `OffersContext.tsx:29` |
| `@forgemind:marketplace_chat` | `ChatContext.tsx:35` |
| `@forgemind:commitment_log` | `CommitmentLogContext.tsx:11` |
| `@forgemind:logistics_entries` | `LogisticsContext.tsx:22` |
| `@forgemind:shown_decisions` | `GlobalNotificationHandler.tsx:15` |
| `@forgemind:contest` | `ContestContext.tsx:13` |
| `@forgemind:calendar_entries` | `CalendarContext.tsx:17` |
| `@forgemind:commission_milestones` | `CommissionMilestonesContext.tsx:20` |
| `@forgemind:diary_entries` | `DiaryContext.tsx:11` |
| `@forgemind:events` | `EventsContext.tsx:15` |
| `@forgemind:invite_meetups` | `InviteMeetupsContext.tsx:16` |
| `@forgemind:event_meetups` | `MeetupsContext.tsx:29` |
| `@forgemind:owned_attire` | `OwnedAttireContext.tsx:25` |
| `@forgemind:user_theme` | `ThemeContext.tsx:10` |
| `@forgemind:notification_seen` | `UserContext.tsx:14` |

**Known gaps confirmed still true (report only):**

- No My Listings screen — only `CreateListingScreen.tsx` and `ListingDetailScreen.tsx` exist
- No Holder appeal review
- Accepting an offer does not mark the listing sold — `acceptOffer` at `:183-190` touches only the offers array, never the listing
- Photo upload not built — `PortfolioManagementScreen.tsx:62` stores a local `ImagePicker` URI in AsyncStorage; no bytes reach a server

**NOT RUN (phone-only):** real listing creation on device, offer flows on
device, chat on device, header fit at 390 px measured on a real device,
`formatPHP` glyph rendering with the app font.

---

## Part 4 — Full function and button validation

### 4A — Static checks, real output

```
$ npx tsc --noEmit
EXIT=0

$ npx tsc --noEmit -p tsconfig.json      (forgemind-backend)
BACKEND_EXIT=0

$ npx expo export --platform web
  › web bundles (3):
  _expo/static/js/web/index-41fb76a2c9f4636b43d6782da0cbf0f8.js (45KB)
  _expo/static/js/web/index-ee1352fa16a210f72e6ac527f778af73.js (7.4MB)
  _expo/static/js/web/vision_bundle-6c4ff147fbefd96adf71271a1b1058de.js (141KB)
  › Files (3):
  favicon.ico (15KB)  index.html (1.2KB)  metadata.json (49B)
  Exported: dist
EXPORT_EXIT=0
```

**Greps:**

| Pattern | Result |
|---|---|
| bare `confirm(` | **clean** — 0 |
| `cancelText &&` | **clean** — 0 |
| `localStorage` in src | **clean** — 0 |
| `localhost:5000` | **clean** — 0 |
| stale `.js` beside `.ts` in src/types, src/utils | **clean** — already deleted in `e54983d` |
| `Alert.alert` | **22 call sites remain** — `HolderReviewQueueScreen` (8), `ShareableCardScreen` (4), `VerifyStaffScreen` (5), `RequestOrganizerAccessScreen` (5), `DiagnosticsScreen` (1). Report-only. |
| `cond && <Text/>` | 7 sites, all `<Ionicons>`/`<View>`/`<Tag>` icons or dots, not text nodes. `EventMeetupsScreen.tsx:15` documents the convention. |
| `useState` inside `.map()` | 1 match in `EventMeetupsScreen.tsx:19` — inspected, it is the `useEffect` that loads meetups, **not** a hook inside a `.map` callback. Clean. |

**Both Part 4A FIXes were already committed before this pass:**

- `b7795ea` `fix(contests): replace bare confirm() with ConfirmationModal in ContestManageScreen`
  — `ConfirmationModal` imported at `:11`, used at `:237,247`. "cannot be undone" warning retained.
- `e54983d` `chore: delete stale compiled .js files and update .gitignore`
  — deleted `src/types/organizer.js`, `src/types/events.js`, `src/types/logistics.js`, `src/utils/dateHelpers.js`, `src/utils/logisticsRules.js`; `.gitignore:45-46` now has `src/types/*.js`, `src/utils/*.js`.

I confirmed each deleted file had a `.ts` sibling before it went, and tsc plus
the web export both pass after.

### 4B — Pure-logic tests (new, runnable)

Added `src/utils/__tests__/run-pure-logic-tests.mjs` and `tsconfig.pure.json`,
wired as `npm run test:pure`. It compiles the rule modules with the project's own
tsc and runs them under plain node — no test framework, no bundler, no device.
Modules land in `.purity-build/` (gitignored).

```
$ npm run test:pure

--- logisticsRules.checkCompletion / getMissingFields ---
PASS  complete entry reports no missing fields
PASS  complete entry isComplete is true
PASS  whitespace-only arrival_date counts as missing
PASS  whitespace-only stage_time_preference counts as missing (performer)
PASS  plate_number not required when parking_needs is none
PASS  plate_number required when parking_needs is valet
PASS  entourage_size 0 counts as ANSWERED (not missing)
PASS  entourage_size null counts as missing
PASS  entourage_size 0 leaves the entry complete
PASS  stage_time_preference not required for non-performers

--- logisticsRules.getUrgency boundaries (today = 2026-09-24) ---
PASS  +1 day  -> critical
PASS  +3 days -> urgent
PASS  +7 days -> reminder
PASS  +8 days -> on_track
PASS  +30 days -> on_track
PASS  past deadline while incomplete -> critical with reason "Past deadline"
PASS  today (0 days) -> critical
PASS  complete entry ignores the deadline entirely
PASS  incomplete entry used above really is incomplete

--- offerRules.getAllowedOfferTypes ---
PASS  physical goods category allows purchase + trade
PASS  Commissions & Crafting Services allows commission only
PASS  Photography Services allows commission only
PASS  isOfferTypeAllowed rejects purchase on a commission category
PASS  isOfferTypeAllowed accepts commission on a commission category

--- listingScreener.screenListing ---
PASS  "gun" in title is blocked
PASS  "fire arm" (spaced) in description is blocked
PASS  "firearm" is blocked
PASS  mixed case "Real GUn" is blocked (case-insensitive)
PASS  a normal wig listing passes
PASS  the shipped category list has 8 entries (the prompt expected 9)
PASS  unknown category is blocked before the keyword check
PASS  a blocked listing does not reveal which term tripped it

--- formatCurrency.formatPHP ---
PASS  0 -> ₱0.00
PASS  1000 -> ₱1,000.00
PASS  1234567 -> ₱1,234,567.00
PASS  99.5 -> ₱99.50
PASS  negative renders as ₱-50.00 (known sign-order defect, report only)
PASS  every positive output is ₱ then grouped digits then 2 decimals
PASS  ₱ is U+20B1, not a bare dollar sign

--- dateHelpers (UTC+8 handling at 03:00) ---
PASS  daysBetween is a plain calendar diff
PASS  daysBetween is negative when reversed
PASS  daysBetween same day is 0
PASS  at 19:00Z the UTC slice is still the previous calendar day
PASS  at +08:00 the same instant is already the next calendar day
PASS  the two disagree, which is the bug to avoid
PASS  getTodayLocal() does NOT use the UTC slice
PASS  toLocalDateString-style local day is used, not toISOString
PASS  isDateInPast is date-only, no clock time
PASS  isDateTodayOrFuture rejects a past date
PASS  formatCountdown past -> "Past"
PASS  formatCountdown 0 days -> "Today"

--- CommitmentLogContext diff: a no-op edit writes nothing ---
PASS  addLogEntry is declared exactly once in the context
PASS  addLogEntry maps the caller diff 1:1 and never adds a synthetic row
PASS  LogisticsContext.tsx: guards on changes.length === 0 before logging
PASS  LogisticsContext.tsx: returns success without logging when there are no changes
PASS  LogisticsContext.tsx: declares changes as an empty array and fills it by comparison
PASS  EventsContext.tsx: guards on changes.length === 0 before logging
PASS  EventsContext.tsx: returns success without logging when there are no changes
PASS  EventsContext.tsx: declares changes as an empty array and fills it by comparison
PASS  one log row is produced per changed field
PASS  the caller diffs each tracked field explicitly

================================
passed: 61
failed: 0
================================
```

**Three findings from writing these, all REPORT ONLY:**

1. **`formatPHP(-50)` returns `₱-50.00`** — sign after the peso symbol. Cosmetic; every price is positive. Asserted as-is so it stays visible rather than silently assumed fixed.
2. **Category count is 8, not 9** — `marketplaceCategories.ts:10-17`. The Part 3 spec says 9.
3. The UTC+8 03:00 hazard is real but **already handled** — `dateHelpers` uses `getFullYear/getMonth/getDate`, never `toISOString()`. The test pins that distinction rather than assuming it.

The commitment-log test is structural rather than behavioural: it asserts the
no-op guard sits *before* the `addLogEntry` call in both callers, and that one row
is emitted per changed field. A behavioural test would need a React renderer.

### 4C — Backend smoke tests

| Endpoint | Code | Note |
|---|---|---|
| `GET /health` | **500** | `password authentication failed for user "forgemind_app"` |
| `POST /auth/register` | **500** | same DB failure |
| `PATCH /auth/organizer-fields` (no token) | **401** | `{"error":"invalid_session","message":"Missing, unknown, or expired session"}` — correct |
| `POST /auth/login` | **NOT RUN** | needs a registered account, which needs the DB password |
| `POST /auth/logout` | **NOT RUN** | needs a valid token |
| session restore | **NOT BUILT** | there is no `GET /auth/me`. The router registers only `/register`, `/login`, `/logout`, `/organizer-fields`. Confirmed by grep: zero references to `/auth/me` in mobile. |
| 403 for wrong role | **NOT RUN** | needs a valid staff session |

Every DB-backed endpoint is blocked by the masked password, so no throwaway
account could be created and **no token was ever issued or printed**.

**Does `password_hash` ever appear in a response?** Cannot confirm empirically.
But `publicUser.ts` defines `USER_PUBLIC_COLUMNS`, every response uses
`RETURNING ${USER_PUBLIC_COLUMNS}` (`router.ts:399`), select paths use the same
column list, and that file contains no `password_hash`. Structurally it cannot leak.

### 4D — Security check (report only) — NOT RUN

Cross-department approval and role self-grant both need two live sessions.
Blocked by the DB password.

From the code, `PATCH /auth/organizer-fields` is **not** narrowed by department:
`router.ts:310` checks only `caller.organizer_role !== 'head'` → 403. There is no
comparison of `caller.head_organizer_department` against the target's
`department`. **A Head of department A can therefore patch a staff member of
department B.** The role cannot be self-granted (the caller's own row is
authoritative, per the comment at `:293-296`), but department scoping is missing.
This matches the pattern in Part 2 — the app enforces department scoping
client-side at `VerifyStaffScreen.tsx:87-93` while the server does not.

### 4E — Wiring inventory (script-generated)

Generated by `npm run check:wiring` → `scripts/generate-wiring-matrix.mjs`.
Output: **31 registered routes, 15 contexts with AsyncStorage, 7 files calling
`getAccounts()`**. All route names, file names and storage keys below come from
that run.

| Feature | Handler (file:line) | Route | Provider | Data source | Role guard | STATUS | NOT RUN |
|---|---|---|---|---|---|---|---|
| Marketplace browse | `MarketplaceScreen.tsx:210` | `MarketplaceHome` | `MarketplaceProvider` | `@forgemind:marketplace_listings` | none needed | WIRED | phone |
| Create listing | `CreateListingScreen.tsx:149` | `CreateListing` | `MarketplaceProvider` | `@forgemind:marketplace_listings` | `canCreateListing` `:183` | WIRED | phone |
| Listing screener | `listingScreener.ts:81` | — | — | pure function | none | WIRED | — |
| Make offer | `OffersContext.tsx:99` | `MakeOffer` | `OffersProvider` | `@forgemind:marketplace_offers` | none needed | WIRED | phone |
| Offer log | `OfferLogScreen.tsx:78` | `OfferLog` | `OffersProvider` | `@forgemind:marketplace_offers` | seller/both tab `:72` | WIRED | phone |
| Accept offer | `OffersContext.tsx:160` | `OfferDetail` | `OffersProvider` | `@forgemind:marketplace_offers` | seller only `:170` | WIRED | — |
| Chat thread | `ChatContext.tsx:202` | `ChatThread` | `ChatProvider` | `@forgemind:marketplace_chat` | participant `:202` | WIRED | phone |
| Registration submit | `AuthService.ts:770` | `MarketplaceRegistration` | `UserContext` | `@forgemind:accounts` | — | **BROKEN** (no server call) | — |
| Verify staff | `VerifyStaffScreen.tsx:71` | `VerifyStaff` | none | `@forgemind:accounts` | client-side dept `:87` | **SUSPECT** (phone-only data) | phone |
| Verify cosplayers | `VerifyCosplayersScreen.tsx:94` | `VerifyCosplayers` | none | `@forgemind:accounts` | client-side | **SUSPECT** (phone-only data) | phone |
| Manage staff | `ManageStaffScreen.tsx` | `ManageStaff` | `LogisticsProvider` | `@forgemind:logistics_entries` | none in file | SUSPECT | phone |
| Staff picker | `StaffPickerModal.tsx:43` | via logistics | `LogisticsProvider` | `getEligibleStaff` → accounts | none | SUSPECT | phone |
| Logistics entry | `LogisticsContext.tsx:394` | `AddLogisticsEntry` | `LogisticsProvider` | `@forgemind:logistics_entries` | `hasOrganizerScreenAccess` | WIRED | phone |
| Commitment log | `CommitmentLogContext.tsx:72` | — | `CommitmentLogProvider` | `@forgemind:commitment_log` | — | WIRED | — |
| Department log view | `getLogForDepartment:106` | **none** | — | — | — | **NOT BUILT** | — |
| Events | `EventsScreen.tsx:99` | `EventsHome` | `EventsProvider` | `@forgemind:events` | `organizerAccess` `:15-17` | WIRED | phone |
| Contest manage | `ContestManageScreen.tsx:237` | `ContestManage` | `ContestProvider` | `@forgemind:contest` | none in file | WIRED | phone |
| Group meetup | `GroupMeetupScreen.tsx` | `GroupMeetup` | `MeetupsProvider` | `@forgemind:event_meetups` | none in file | WIRED | phone |
| Calendar | `CalendarManageScreen.tsx` | `CalendarManage` | `CalendarProvider` | `@forgemind:calendar_entries` | none in file | WIRED | phone |
| Invitations | `InviteMeetupsHomeScreen.tsx` | — | `InviteMeetupsProvider` | `@forgemind:invite_meetups` | none | WIRED | phone |
| Projects / characters | `ProjectsScreen.tsx` | stacks | `ProjectProvider` | `@forgemind:owned_attire` | — | WIRED | phone |
| Theme | `ThemeContext.tsx:10` | — | `ThemeProvider` | `@forgemind:user_theme` | — | **LOCAL BY DESIGN** | — |
| Portfolio photos | `PortfolioManagementScreen.tsx:62` | `PortfolioManagement` | `UserContext` | `@forgemind:accounts` | — | **LOCAL BY DESIGN** | phone |
| Session restore | none | none | `UserContext:132` | `@forgemind:active_session` | — | **LOCAL BY DESIGN** (no `/auth/me`) | — |
| Shareable card | `ShareableCardScreen.tsx:121` | `ShareableCard` | none | none | none | WIRED | phone |
| Appearance hub | `AppearanceHubScreen.tsx` | `AppearanceHub` | `ThemeProvider` | `@forgemind:user_theme` | none | WIRED | phone |
| Cosplay diary | `CosplayDiaryScreen.tsx:95` | `CosplayDiary` | `DiaryProvider` | `@forgemind:diary_entries` | none | WIRED | phone |
| Holder review queue | `HolderReviewQueueScreen.tsx:43` | `HolderReviewQueue` | `OrganizerService` | `@forgemind:accounts` | **screen-level Alert only** | **NOT BUILT** (unreachable) | phone |
| My listings | none | none | — | — | — | **NOT BUILT** | — |
| Listing → sold on accept | `OffersContext.tsx:183` | — | — | — | — | **NOT BUILT** | — |
| Photo upload to server | `PortfolioManagementScreen.tsx:62` | — | — | local URI | — | **NOT BUILT** | — |

No `localhost:5000` anywhere; the only backend origin is `API_BASE_URL` from
`src/config/api.ts`.

### 4F — Per-role button walk: NOT RUN

I have no device, and Playwright is not configured in this project (`npx expo
export` produces static files; there is no UI test runner). **I am not claiming a
UI test I did not run.** Every row above marked `phone` in NOT RUN is untested
end-to-end.

What I can state statically: every `navigation.navigate(...)` target I checked
resolves to a route registered exactly once in a stack navigator —
`CreateListing`, `MarketplaceRegistration`, `ListingDetail`, `MakeOffer`,
`OfferLog`, `ChatList` all confirmed in `MarketplaceStackNavigator.tsx:53-108`.
No `Coming Soon` placeholder remains on any primary button. Two dead-end notes,
report only: `InviteMeetupDetailScreen.tsx:50` (`// TODO: Show toast/feedback`)
and `PortfolioManagementScreen.tsx:220` (caption feature announced as coming soon).

Manual steps, if you want to do this by hand: `npx expo start`, open
`http://localhost:8081`, sign in as each role, then walk Profile → Projects →
Characters → Marketplace → Events → Logistics → Contests → Calendar → Verify.

### 4G — Functions still reading the phone-only accounts list

7 files, from `npm run check:wiring`:

| Location | What it reads |
|---|---|
| `LogisticsContext.tsx:450` | `assignEntry` staff check |
| `LogisticsContext.tsx:534` | department lookup for routing |
| `LogisticsContext.tsx:608-623` | `getEligibleStaff` — filters `organizer_role === 'staff' && department_verification_status === 'approved'`; **returns `[]` on error**, so a failure is indistinguishable from "no staff" |
| `OrganizerService.ts:319` | `getStaffForEvent` |
| `VerifyStaffScreen.tsx:71` | staff roster |
| `VerifyStaffScreen.tsx:124` | claimed departments |
| `VerifyCosplayersScreen.tsx:94` | verification queue |

Plus two from the spec I checked: `GlobalNotificationHandler.tsx` and
`ManageStaffScreen`. `GlobalNotificationHandler` does **not** call `getAccounts()`
— it reads `user` from `useUser()` (`:18`).

**Where that `user` is refreshed from:** `UserContext.tsx:132` on mount
(`getActiveSession`), `:232` at login, `:284` / `:342` / `:365` / `:377` after a
local update. All read the local `@forgemind:active_session` or the local accounts
array. There is **no refresh from the server anywhere** — which is why a decision
made on another device never appears.

`ManageStaffScreen` reads nothing itself; its data arrives from `getEligibleStaff`.

Worth flagging: `getEligibleStaff` catching an error and returning `[]` is exactly
the "silent empty list" you told me to avoid. It currently does it.

### 4H — HolderReviewQueueScreen

Route registered at `ProfileStackNavigator.tsx:62-63`. **Nothing navigates to it**
— grep for `navigate('HolderReviewQueue'` returns zero hits. The only other
reference is `FE-5-5-PhoneFrameTest.tsx:84`, a manual test harness. The screen is
unreachable in the running app.

Its approve branch is broken as you described, and worse than "the database
rejects it":

```ts
HolderReviewQueueScreen.tsx:62   await OrganizerService.approveAccessRequest(request.request_id, user.email);
HolderReviewQueueScreen.tsx:64   await AuthService.updateOrganizerRole(request.user_id, 'head');
```

`updateOrganizerRole` sends `organizer_role: 'head'` with **no**
`head_organizer_department`, which violates `chk_head_has_department` — so the
write fails. The screen surfaces that as `Alert.alert('Error', ...)`. It also uses
`Alert.alert` for its confirm dialog at `:47`, against your convention. Guarded
only by a client-side `Alert.alert('Access Denied')` at `:26` — no route guard, so
it is one navigation away from any user.

### 4I — Database

**Variable names in `forgemind-backend/.env`** (values masked, as instructed):

```
NODE_ENV, PORT, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL,
SESSION_TTL_DAYS, CORS_ORIGINS
```

Confirmed: **`DB_URL` is not present** — only the discrete `DB_*` settings.
`HOST` is also absent, so `config.host` falls back to `0.0.0.0`, which is the safe
default for phone access.

**Leftover test accounts: NOT RUN.** The delete could not run:

```
$ node scripts/cleanup-test-accounts.mjs
Cleanup failed: password authentication failed for user "forgemind_app"
```

`forgemind-backend/scripts/cleanup-test-accounts.mjs` (untracked, `??` in git)
targets three accounts:

- `curl_test_20261001123649@test.local`
- `head_curl_test_20261001124100@test.local`
- `staff_curl_test_20261001124202@test.local`

**Rows deleted = unknown; nothing was deleted and nothing was touched.** Restore
`DB_PASSWORD`, then run that script and it will report `Sessions deleted: N` and
`Users deleted: N`. I touched no account.

`sett@gmail.com` / `asta@gmail.com` were not backfilled and not touched.

---

## Part 5 — "Not yet done" report

### BLOCKED BY STEP 1

- **Server-backed verification** — staff and cosplayer approval queues, `/auth/me` refresh, cross-device decision pop-ups. All read `@forgemind:accounts`. Reads needed: `GET /auth/staff`, `GET /auth/verification-queue`, `GET /auth/marketplace-applications`, `GET /auth/organizer-departments`, `GET /auth/me`.
- **Marketplace registration submit** — `AuthService.ts:770` never calls the server.
- **DB password** — `.env` `DB_PASSWORD` is the literal `****`. Blocks every DB-backed endpoint, all curl tests, and test-account cleanup.

### NOT BUILT

- `GET /auth/me` — no session-restore endpoint exists
- Department-routed commitment-log view — `getLogForDepartment:106` exists, no screen calls it
- Holder appeal review — no review screen; `HolderReviewQueueScreen` unreachable, and its approve path violates `chk_head_has_department`
- My Listings screen
- Listing marked `sold` on accept — `acceptOffer` never touches the listing
- Photo upload to a server — local `ImagePicker` URIs only
- 22 `Alert.alert` call sites across 5 screens

### BUILT BUT UNVERIFIED

- 61 pure-logic assertions — now proven by `npm run test:pure`, previously unproven
- All 31 registered routes, all 15 storage keys — verified by script, not exercised in a running app
- Every button in Part 4F — static handler/route check only
- `formatPHP` sign order on negatives — asserted, not fixed

### BROKEN

- `PATCH /auth/organizer-fields` — no department scoping server-side (Part 4D). The client-side filter at `VerifyStaffScreen.tsx:87` is the only barrier.
- `getEligibleStaff` returns `[]` on error — a network failure is indistinguishable from "no eligible staff"
- `HolderReviewQueueScreen` approve path — writes `organizer_role='head'` without a department, so it always fails
- 3 documentation files still point future updates at `CHANGELOG_V2.md`: `forgemind-ai/LUCK_VOLTIA_SETUP_COMPLETE.md:296`, `forgemind-ai/PHASE_A_VERIFICATION_REPORT.md:232`, and several spots in `forgemind-mobile/docs/SCOPE.md`
- `docs/SCOPE.md` §7 measurements are stale (records 5364 lines / 86 headings; actual is 7856 / 105)
- `docs/CHANGELOG_FOLD_MAP.md` claims "byte for byte", but the folded blocks were written with CRLF while V2 used LF

### Also found

- Marketplace has **8** categories, not the 9 in your Part 3 spec
- No `/auth/me`, so "session restore" is local-only by necessity, not by choice
- `PortfolioManagementScreen.tsx:220` ships a visible "coming soon" caption message
- `.gitignore` needed `.purity-build/` added (done)

### Confirmed already done, contrary to the known list

- **`check:wiring` script — EXISTS.** `scripts/generate-wiring-matrix.mjs` runs and produces the inventory. Add `npm run check:wiring`.
- **Backend smoke test — partially exists**; the auth parts are blocked by the DB password.
- **Offline mode — not started.** No evidence either way in `src`.
- **iOS date picker, push notifications — not started.** `expo-notifications` is absent from `package.json` and no code references it.
- **FE-7 Step 5, FE-8 Steps 2/3, Shareable Card, Appearance Hub, Cosplay Diary — these ARE implemented as screens** (routes registered, code present). What is missing is server backing and device verification.

---

## 6. Commits, verification output, and NOT TESTED list

```
$ git log --format='%h %ad %s' --date=iso -2
2f315ab 2026-10-01 17:43:26 +0800 test(pure): add runnable proof for the rule modules the changelog claims passed
c0d9b06 2026-10-01 17:35:35 +0800 fix(auth): 15s auth timeout, warn on expected network failures, dev health ping
```

```
$ git commit -m "fix(auth): 15s auth timeout, warn on expected network failures, dev health ping"
[master c0d9b06] fix(auth): 15s auth timeout, warn on expected network failures, dev health ping
 2 files changed, 48 insertions(+), 9 deletions(-)

$ git commit -m "test(pure): add runnable proof for the rule modules the changelog claims passed"
[master 2f315ab] test(pure): add runnable proof for the rule modules the changelog claims passed
 4 files changed, 449 insertions(+), 1 deletion(-)
 create mode 100644 src/utils/__tests__/run-pure-logic-tests.mjs
 create mode 100644 src/utils/__tests__/tsconfig.pure.json
```

```
$ git push origin master
To https://github.com/SenpoAhJin/Forge_Mind.git
   8c4d236..2f315ab  master -> master
PUSH_EXIT=0
```

`forgemind-backend` was **not** pushed — I made no backend changes, and
`scripts/cleanup-test-accounts.mjs` remains untracked for you to review.

Two changelog edits are **uncommitted** in the working tree
(`CHANGELOG.md`, `CHANGELOG_V2.md` modified; `docs/CHANGELOG_FOLD_MAP.md`
untracked) from the earlier fold work. I left them alone rather than folding two
unrelated changes into one commit.

### NOT TESTED

Nothing in this report is a device test. Specifically **NOT RUN**:

1. Phone login — tap
2. Phone logout — tap
3. Phone register — tap
4. Phone browser `http://192.168.254.168:3000/health`
5. Expo red-screen suppression on device
6. The `"Can't reach the server"` string as rendered on a device
7. The 15 s timeout under real cold-start conditions
8. The dev health ping as it prints on device
9. Every Part 4F button, all four roles
10. All marketplace offer/chat flows on device
11. `formatPHP` glyph rendering with the app's font
12. 390 px header fit measured on a real screen
13. 3D preview (Expo Go + `expo-gl`)

### NOT RUN (blocked, not skipped)

- `POST /auth/login` with a real credential
- `POST /auth/logout` with a real token
- Session-restore test — endpoint does not exist
- 403-for-wrong-role test
- Part 4D cross-department and role-self-grant tests
- Test-account deletion — `rows deleted` unknown, nothing deleted
- Any check that needs a second device (cross-device decision pop-ups)

### CHANGELOG entry

```markdown
## 2026-10-01 17:44:48 +08:00 — LAN reachability and auth failure handling

**Diagnosis.** The Android "Fetch request has been canceled" had two causes,
neither of them the base-URL logic. First, no process was listening on port
3000 at all. Second, Windows Firewall has no inbound allow rule for TCP 3000
and the active Wi-Fi network is categorised Public, so packets from the phone
were dropped silently. Metro on 8081 was unaffected, which is why the bundle
loaded while the API did not. A third, separate fault was found: DB_PASSWORD
in forgemind-backend/.env is the literal string "****", so every DB-backed
endpoint returns 500 `password authentication failed for user "forgemind_app"`.

**Client fixes.**
- AUTH_TIMEOUT_MS 10000 -> 15000. A cold server pays a bcrypt cost on the
  first login, and the 10 s abort surfaced as a cancellation rather than as
  slowness.
- console.error -> console.warn on the three expected network failures
  (register, login, server logout) so Expo no longer raises the red error
  screen for an unreachable host.
- Aborts and refused connections now return the same single "Can't reach the
  server" message; previously an abort produced a second, different string.
- Added a dev-only startup health ping logging one line: URL, result, ms.

**Verification.** npx tsc --noEmit clean for mobile and backend. npx expo
export --platform web succeeds. 61 pure-logic assertions pass via
`npm run test:pure` (new): logisticsRules completion and the +1/+3/+7/+8 day
and past-deadline urgency boundaries, whitespace-as-missing, entourage 0
treated as answered, offerRules per-category types, listingScreener for
"gun" / "fire arm" / "Real GUn" / a normal wig, formatPHP, dateHelpers at
19:00Z (03:00 UTC+8), and the commitment-log no-op guard.

**NOT TESTED.** No device testing was performed. Phone login, logout,
register, the phone browser /health check, and every Part 4F button walk are
untested. Backend login/logout/403 and the cross-department security tests
could not run because no account can be created until DB_PASSWORD is
restored. Test-account deletion did not run; no rows were deleted.

**Required operator action.** Add the inbound firewall rule for TCP 3000 and
set the Wi-Fi network profile to Private. Restore the real DB_PASSWORD.

Commits: c0d9b06 (auth fixes), 2f315ab (pure-logic tests).
```

---

**Two things block almost everything else:** the firewall rule, and the
`DB_PASSWORD`. Fix those first and the phone will reach a server that can
actually answer.