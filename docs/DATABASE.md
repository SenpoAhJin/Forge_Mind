# ForgeMind — Target Database (SQLite via expo-sqlite)

**Created:** Wednesday, September 30, 2026, 17:55
**Phase:** Phase 1 — design only. **Nothing has been migrated.** No `expo-sqlite` dependency is
installed yet, and no migration has been run.
**Status of this document:** a proposal. Every decision marked **[NEEDS DECISION]** is waiting on an
answer from `SCOPE.md` §6 before the corresponding migration step can be written.

---

## 0. How to read this

- **§1** what is in AsyncStorage today, per key, with owner and read/write rules.
- **§2** the class tags (A/B/C/D) and what each one obliges.
- **§3** the normalized target schema. Full DDL.
- **§3.11** the sync-envelope compliance check, one row per syncable table.
- **§4** conflict rules, one per class-B table.
- **§5** the migration plan, ordered, with risk per step.
- **§6** SQLite-specific decisions and the Postgres gaps they close.
- **§7** the cross-service mapping tables that the schema alone cannot express.
- **§8** what the backend does not give us and must be added.

`expo-sqlite` is an Expo Go module — it is bundled in Expo Go on both iOS and Android, no custom
native code, no config plugin, no dev client. It satisfies the Expo Go rule. It is **not** currently
in `package.json`; adding it is migration step M-0 and needs your approval.

---

## 1. AsyncStorage inventory as it exists now

**22 live key templates.** 20 of them are fixed strings; 2 are per-email composites (`…:<email>`), so a
device with *N* registered accounts holds `20 + 2N` keys on disk. Adding the dead strings, the whole
codebase mentions **28 concrete key strings** (22 live + 6 dead/broken) plus 2 never-written prefixes
(`@ForgeMind:` and `FM_`) — see the reconciliation note under the dead-key table.
Shape, owner and access are quoted from the code, not inferred.

Legend for *Access*: **R** = any user of the app can read the whole key; **R(owner)** = filtered by
owner; **W(owner)** = only the owning context writes; **W(role)** = gated by a role check in the
writer; **G** = device-global, no user dimension at all.

| # | Key | Shape | Owner | Who can read | Who can write |
|---|---|---|---|---|---|
| 1 | `@forgemind:accounts` | `StoredAccount[]` | `AuthService.ts:24` | R — every screen, every account | W(`AuthService` only, 9 methods) |
| 2 | `@forgemind:active_session` | `StoredAccount` object | `AuthService.ts:25` | R (in-memory) | W(`AuthService.setActiveSession`) |
| 3 | `@forgemind:session_token` | **raw `string`**, not JSON | `AuthService.ts:26` | W: `login()` only. R: `logout()` only | W(`AuthService.login`) |
| 4 | `@forgemind:events` | `Event[]` | `EventsContext.tsx:15` | R | W(role) — `requireHeadOrganizer()` at `:212` |
| 5 | `@forgemind:logistics_entries` | `LogisticsEntry[]` | `LogisticsContext.tsx:22` | R | W(role) — `requireHeadOrganizer()` at `:258` |
| 6 | `@forgemind:commitment_log` | `CommitmentLogEntry[]` | `CommitmentLogContext.tsx:11` | R | W(append only, never updated or deleted) |
| 7 | `@forgemind:marketplace_listings` | `Listing[]` | `MarketplaceContext.tsx:13` | R — `getActiveListings` filters by status only, never by owner | W(owner) via `createListing` |
| 8 | `@forgemind:marketplace_offers` | `Offer[]` | `OffersContext.tsx:29` | R | W(party) — proposer or listing seller |
| 9 | `@forgemind:marketplace_chat` | `{ threads: ChatThread[]; messages: ChatMessage[] }` | `ChatContext.tsx:35` | R — the whole message body is in memory for every account | W(party) — sender / thread participants |
| 10 | `@forgemind:commission_milestones` | `CommissionMilestone[]` | `CommissionMilestonesContext.tsx:20` | R | W(party) |
| 11 | `@forgemind:contest` | `{ criteria: ContestCriterion[]; optIns: ContestOptIn[] }` | `ContestContext.tsx:13` | R | W(role) — organizer |
| 12 | `@forgemind:calendar_entries` | `CalendarEntry[]` | `CalendarContext.tsx:17` | R | W(organizer) |
| 13 | `@forgemind:event_meetups` | `Meetup[]` with nested `rsvps[]` | `MeetupsContext.tsx:29` | R | W(party) |
| 14 | `@forgemind:invite_meetups` | `InviteMeetupWithParticipants[]` | `InviteMeetupsContext.tsx:16` | R, but `getMeetupByCode` is a linear scan gated on a 6-char `invite_code` | W(party) |
| 15 | `@forgemind:owned_attire` | `OwnedAttire[]` | `OwnedAttireContext.tsx:25` | **R — unbounded cross-account leak**, see §1.1 | W(**any** account) — `deleteItem` filters on `attire_id` only |
| 16 | `@forgemind:diary_entries` | `DiaryEntry[]` | `DiaryContext.tsx:11` | R | W(owner) |
| 17 | `@forgemind_event_staff_members` | `EventStaffMember[]`, dates re-hydrated to `Date` on read | `OrganizerService.ts:12` | R | W(role) — organizer hierarchy |
| 18 | `@forgemind_organizer_access_requests` | `OrganizerAccessRequest[]`, dates re-hydrated on read | `OrganizerService.ts:11` | R | W(requester + Holder) |
| 18a | **separator warning** | keys 17 and 18 use `_` where all 20 others use `:`. Both are live and both are written on every mutation (`OrganizerService.ts:50,104,132,204,241,265,368`). | — | — | **M-1 hazard:** the migration must read these two exact strings. "Normalising" the separator without moving the data silently empties the organizer hierarchy. |
| 19 | `@forgemind:notification_seen:<email>` | `{ marketplace?; staff?; cancelled_events? }` | `UserContext.tsx:14` | R(owner) — the **key** is the ownership boundary | W(owner) |
| 20 | `@forgemind:shown_decisions:<email>` | `{ cancelled_events: string[] }` | `GlobalNotificationHandler.tsx:15` | R(owner) | W(owner) |
| 21 | `@forgemind:data_consent` | `{ accepted: true; timestamp: string }` | `ConsentBanner.tsx:13` | G | W(first account to accept) — **no revoke path** |
| 22 | `@forgemind:user_theme` | `{ theme: 'purple'\|'blue'\|'pink'\|'green'\|'orange' }` | `ThemeContext.tsx:10` | G — 30 consumers | W(any account) |

**Entities with no key at all, and therefore no persistence whatsoever:**

| Entity | Where it lives | Consequence |
|---|---|---|
| Projects | `src/contexts/ProjectsContext.tsx:55-58`, `useState` only | `DiaryEntry.project_id` and `OwnedAttire.committed_to_project_id` are permanently orphaned; `MeetupsContext.checkLinkage:110` fails for every meetup after reload |
| Tasks | same | IN-54 unimplementable; no learned model possible |
| Budget items | same (`src/data/budget_items.json` is a static seed) | — |
| Project milestones | same | — |
| Selection state | `SelectionContext.tsx` | — |
| Permitted categories | `src/constants/marketplaceCategories.ts` (code constant) | see §7.4 |
| Characters / variants | `src/data/characters.json`, `variants.json`, `match_components.json` (bundled) | see §7.1 |
| Contest results (years, placements, awards) | nowhere | `DATA §24` unimplemented |
| Value Reference | nowhere on device | `DATA §17` unimplemented |
| AI results | nowhere | the `exact/close/loose` output is not persisted at all |

**Legacy keys — renamed, so no code reads them, but upgraded devices still hold the data.**
These are the ones that actually occupy space on a user's phone. Migration step M-9 deletes them.

| Key | Where it was renamed | Evidence | State |
|---|---|---|---|
| `@forgemind:logistics` | → `@forgemind:logistics_entries` | `CHANGELOG.md:4125`: "Storage key changed to `@forgemind:logistics_entries` (legacy `@forgemind:logistics` ignored) — no migration logic" | Orphaned logistics rows on any device that ran the pre-rename build. **Never migrated, never deleted.** |
| `@forgemind:current_user` | → `@forgemind:active_session` | `CHANGELOG.md:960` still names it as the portfolio-photo path; `AuthService.ts:25` is the live key | Orphaned account object, including a copy of `password_hash` and `body_size_slider`. |

**Dead and broken keys — do not migrate, delete in step M-9:**

| Key | Where | State |
|---|---|---|
| `@ForgeMind:Events` | `DiagnosticsScreen.tsx:40` | never written; capital `M`; always returns `null` |
| `@ForgeMind:Projects` | `DiagnosticsScreen.tsx:45` | never written; capital `M`; `ProjectsContext` has no persistence at all |
| `@forgemind_accounts` | `debugLogger.ts:8-9` | wrong separator; always `[]` |
| `@forgemind_active_session` | `debugLogger.ts:8-10` | wrong separator; always `null` |
| `@forgemind_organizer_requests` | `debugLogger.ts:8-11` | wrong name **and** wrong separator; always `[]` |
| `@forgemind_users` | `test-web-storage.js:19` | dead root script, bare global `AsyncStorage`, never bundled |
| `@ForgeMind:` prefix | `diagnostics.ts:14,33` | nothing is ever written with a capital `M` |
| `FM_` prefix | `diagnostics.ts:15,34` | nothing is ever written with it |

**Reconciliation of the count.** 22 live (rows 1–22 above) + 2 legacy + 6 dead concrete strings =
**30 concrete key strings** the app or its tooling has ever named. The 2 never-written prefixes are
not keys. Both prefixes are why `clearAllData()` (`diagnostics.ts:14,33`) is a **guaranteed no-op**:
it filters on `@ForgeMind:` and `FM_`, and every real key is lowercase `@forgemind:`, so no diagnostic
has ever been able to clear stale test data.

### 1.1 The `owned_attire` ownership defect, in detail

`OwnedAttireContext.tsx` stamps `user_id: user?.email` on insert (`:98`) and rewrites every seed
row's `user_id` to the current user on first load (`:46-53`), but the key has **no user suffix** and
the context exposes the raw `items` array to every consumer (`:28`). There is no
`getItemsForUser()`. Consequence: account A sees and can delete account B's inventory on the same
device. `deleteItem` (`:147`) filters on `attire_id` only. This is the strongest argument for
partitioning by owner in the target schema, and it is open question Q-6.

### 1.2 Identity is `email`, not `id` — a migration hazard

`StoredAccount` has **no `user_id`**. `email` is the de-facto primary key, and it is compared with
`.toLowerCase()` in `AuthService` but **case-sensitively** in `OrganizerService.getAccessRequestByUserId:65`
and in `debugLogger.logAccountByEmail:59`. Worse, the two per-email keys build their key from the
**raw, un-normalised** address (`UserContext.tsx:156`, `GlobalNotificationHandler.tsx:33`), so a
casing change silently resets the notification state. Additionally `OrganizerService.sendStaffInvite:176`
synthesises `staff_user_id` as `` `user-${staffEmail.split('@')[0]}` `` — an email prefix wearing an
`_id` name. **The migration must normalise every email to lowercase and resolve these synthetic ids
before any table is created**, or FKs will point at nothing.

---

## 2. Class tags

Every table carries one. The tag dictates sync behaviour, the conflict rule, and what the UI may do
while offline.

| Tag | Meaning | Offline read | Offline write | Sync | Conflict rule |
|---|---|---|---|---|---|
| **A** | Offline-full | works fully offline | works fully offline | **never** | n/a — device-only, no server copy |
| **B** | Offline + sync | works fully offline | works fully offline, queued | yes, via outbox | per-table, §4 |
| **C** | Online-required | **no** | **no** | yes, server-authoritative | server wins; client rejects offline |
| **D** | Online-enhanced | works offline with a cached/degraded answer | works offline, result is a guess | yes, opportunistic | local wins until server answers |

The A/B/C/D split matters because the spec demands offline-first (`DATA` module intent) while the
marketplace and AI are inherently online. Getting this wrong in either direction is a defect:
treating a C table as B produces a purchase that cannot be completed; treating a B table as C
produces a lost logistics field.

**What is class C and why:** accepting an offer is a class-C action. First-accepted wins, and the
winner must be decided server-side, or two devices will both believe they own the same wig. Nothing
in the current app can express this — `acceptOffer` (`OffersContext.tsx:189`) runs entirely on
AsyncStorage.

---

## 3. Target schema

Conventions:

- **PK** is always a client-generated UUID (`TEXT`, 36 chars). Server ids are never assumed to exist.
- **Every syncable table (class B, C, or D) carries the same six columns, without exception:**
  `id` (client UUID), `created_at`, `updated_at`, `version` (INTEGER, server-assigned, monotonic),
  `deleted_at` (soft delete; NULL = live), and `sync_state`
  (`'synced' | 'pending' | 'conflict'`). This holds even for append-only tables, where
  `updated_at`/`version`/`sync_state` are structurally constant and `deleted_at` is always NULL —
  see §3.11 for the per-table proof and §4.5 for the append-only argument.
- **Class-A tables are exempt.** They are device-local with no server copy, so a sync envelope would
  be dead weight. Their exemption is listed one by one in §3.9, so the exemption is auditable rather
  than assumed.
- **Timestamps** are `TEXT` ISO-8601 UTC, format `YYYY-MM-DDTHH:MM:SS.sssZ`. Calendar dates are
  `TEXT` `YYYY-MM-DD` **local**, never derived from `toISOString().slice(0,10)` — `dateHelpers.ts:150-165`
  documents the UTC+8 off-by-one that causes. Wall-clock times are `TEXT` `HH:MM` 24-hour.
  This preserves the app's existing encodings exactly, so the migration is byte-faithful.
- **Money** is `INTEGER` minor units (centavos). SQLite `NUMERIC` is a float, and `price > 0`
  comparisons in the existing `chk_listing_price_required` behave differently as floats. **[NEEDS DECISION]** — the Postgres schema uses `NUMERIC(12,2)`.
- **Enums** are `TEXT` with `CHECK (col IN (...))`, exactly mirroring the Postgres CHECKs so a row
  can move between engines without transformation.
- **Arrays and objects** that the app treats as one value are `TEXT` holding JSON, with
  `CHECK (json_valid(col))`. Only where the field is queried relationally do we normalise it into a
  child table. This is a deliberate trade: chat bodies and note text stay as JSON-ish text, but
  `rsvps`, `participants`, `condition_photo_history`, `variant_components` and `costume_requirements`
  all become real child tables because they are queried, filtered and joined.
- `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` are set on open, so FKs are actually
  enforced (SQLite defaults them **off**) and writes survive a crash mid-sync.

### 3.0 Metadata and sync infrastructure

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Local schema version, for future migrations.
CREATE TABLE schema_meta (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL
);
INSERT INTO schema_meta (key, value) VALUES ('schema_version', '1');
INSERT INTO schema_meta (key, value) VALUES ('migration_state', 'not_started');

-- M-2. Records which AsyncStorage keys have been imported, so a re-run is a no-op.
CREATE TABLE migration_ledger (
  storage_key   TEXT PRIMARY KEY,
  row_count     INTEGER NOT NULL,
  imported_at   TEXT NOT NULL,
  checksum      TEXT
);

-- Outbox: every pending local write lands here before it is attempted.
CREATE TABLE outbox (
  op            TEXT NOT NULL CHECK (op IN ('insert','update','delete')),
  target_table  TEXT NOT NULL,
  record_id     TEXT NOT NULL,
  payload       TEXT NOT NULL CHECK (json_valid(payload)),
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TEXT NOT NULL,
  next_attempt_at TEXT,
  PRIMARY KEY (target_table, record_id, op)
);
CREATE INDEX idx_outbox_pending ON outbox(next_attempt_at) WHERE attempts < 10;

-- Class A. Per-key acknowledgement of "I have shown you this".
CREATE TABLE shown_notifications (
  id            TEXT PRIMARY KEY,
  user_email    TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('marketplace','staff','event_cancelled')),
  subject_id    TEXT,
  shown_at      TEXT NOT NULL,
  UNIQUE (user_email, kind, subject_id)
);
-- Collapses keys 19 and 20 into one table. subject_id is NULL for status modals.
```

### 3.1 Identity and session — class A, with one class-B carve-out

```sql
-- Class A. Local mirror of the server's users row. Never the store of record.
CREATE TABLE users (
  id                          TEXT PRIMARY KEY,
  email                       TEXT NOT NULL UNIQUE,        -- lowercased, see §1.2
  display_name                TEXT NOT NULL,
  is_cosplayer                INTEGER NOT NULL DEFAULT 0 CHECK (is_cosplayer IN (0,1)),
  is_organizer                INTEGER NOT NULL DEFAULT 0 CHECK (is_organizer IN (0,1)),
  base_body_selection         TEXT NOT NULL CHECK (base_body_selection IN ('male','female')),
  is_holder_verified          INTEGER NOT NULL DEFAULT 0 CHECK (is_holder_verified IN (0,1)),
  verification_status         TEXT NOT NULL DEFAULT 'not_submitted'
                                CHECK (verification_status IN ('not_submitted','pending','verified','rejected','revoked')),
  organizer_role              TEXT CHECK (organizer_role IN ('head','staff')),
  head_organizer_department   TEXT CHECK (head_organizer_department IN
                                ('logistics','programs','sponsorship','secretariat','technical_production','marketing')),
  department                  TEXT CHECK (department IN
                                ('logistics','programs','sponsorship','secretariat','technical_production','marketing')),
  department_verification_status TEXT CHECK (department_verification_status IN ('pending','approved','rejected')),
  marketplace_role            TEXT CHECK (marketplace_role IN ('buyer','seller','both')),
  seller_display_name         TEXT,
  payout_method_label         TEXT,
  payout_method_number        TEXT,   -- see §6.3
  agreed_to_marketplace_terms INTEGER CHECK (agreed_to_marketplace_terms IN (0,1)),
  data_consent_given          INTEGER NOT NULL DEFAULT 0 CHECK (data_consent_given IN (0,1)),
  theme_preference            TEXT NOT NULL DEFAULT 'purple'
                                CHECK (theme_preference IN ('purple','blue','pink','green','orange')),
  portfolio_photos            TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(portfolio_photos)),
  password_hash               TEXT NOT NULL DEFAULT '',   -- always ''; server holds the real hash
  created_at                  TEXT NOT NULL,
  updated_at                  TEXT NOT NULL
);
CREATE INDEX idx_users_organizer_role ON users(organizer_role) WHERE organizer_role IS NOT NULL;
CREATE INDEX idx_users_verification  ON users(verification_status);

-- Class A. Credentials must not live in a world-readable table. See §6.3.
CREATE TABLE session (
  id                TEXT PRIMARY KEY,
  token             TEXT NOT NULL,       -- bearer token; plaintext is the only workable
                                        -- choice without expo-secure-store. See §6.3.
  user_email        TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  device_info       TEXT CHECK (device_info IS NULL OR json_valid(device_info)),
  issued_at         TEXT NOT NULL,
  expires_at        TEXT,
  revoked_at        TEXT
);

-- Class A. Consent becomes per-user, which the current global key is not (§1, key 21).
CREATE TABLE user_consent (
  user_email      TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  accepted        INTEGER NOT NULL CHECK (accepted IN (0,1)),
  accepted_at     TEXT NOT NULL,
  withdrawn_at    TEXT            -- the current key has no revoke path at all
);
```

`body_size_slider` is **not** in this schema, matching `forgemind-backend/migrations/001_*.js`
(confirmed: `users` has `base_body_selection` and no size column) and the standing DROPPED ruling.
See `SCOPE.md` §4, Decision B.

### 3.2 Reference data — the shared catalog

```sql
-- Class D. Bundled read-only, refreshed from the server when online.
CREATE TABLE characters (
  id                 TEXT PRIMARY KEY,
  slug               TEXT NOT NULL UNIQUE,
  character_name     TEXT NOT NULL,
  source_media       TEXT NOT NULL,
  media_type         TEXT NOT NULL CHECK (media_type IN
                       ('anime','manga','game','movie','original','other')),
  description        TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  version            INTEGER NOT NULL DEFAULT 1,
  deleted_at         TEXT,
  sync_state         TEXT NOT NULL DEFAULT 'synced'
                       CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_characters_media ON characters(media_type);

-- Class D. One row per named style variant. origin_tag is the spec's origin tag.
CREATE TABLE variants (
  id                     TEXT PRIMARY KEY,
  character_id           TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slug                   TEXT NOT NULL UNIQUE,
  variant_name           TEXT NOT NULL,
  origin_tag             TEXT NOT NULL CHECK (origin_tag IN
                           ('canon','fan-art-inspired','user-original')),
  origin_description     TEXT,
  build_difficulty_rating INTEGER CHECK (build_difficulty_rating BETWEEN 1 AND 5),
  status                 TEXT NOT NULL DEFAULT 'candidate'
                           CHECK (status IN ('confirmed','candidate')),
  candidate_source       TEXT CHECK (candidate_source IN ('ai-flagged','user-submitted')),
  difficulty_label       TEXT CHECK (difficulty_label IN ('easy','medium','hard')),
  -- The dataset's defining feature, which new-variant detection keys off. See §7.2.
  defining_feature       TEXT,
  reference_image_urls   TEXT CHECK (reference_image_urls IS NULL OR json_valid(reference_image_urls)),
  confirmed_by_email     TEXT,
  created_by_email       TEXT,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  version                INTEGER NOT NULL DEFAULT 1,
  deleted_at             TEXT,
  sync_state             TEXT NOT NULL DEFAULT 'synced'
                           CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_variants_character ON variants(character_id);
CREATE INDEX idx_variants_origin    ON variants(origin_tag);

-- Class D. The five renderer slots from the Phase 2 outfit spec, plus the wider
-- taxonomy the Postgres schema already models. See §7.3 for the mapping problem.
CREATE TABLE components (
  id                TEXT PRIMARY KEY,
  component_type    TEXT NOT NULL CHECK (component_type IN
                      ('wig','top','bottom','shoes','accessory','armor','weapon','prop','makeup','other')),
  component_name    TEXT NOT NULL,
  description       TEXT,
  is_renderer_slot  INTEGER NOT NULL DEFAULT 0 CHECK (is_renderer_slot IN (0,1)),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  version           INTEGER NOT NULL DEFAULT 1,
  deleted_at        TEXT,
  sync_state        TEXT NOT NULL DEFAULT 'synced'
                     CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE UNIQUE INDEX idx_components_slot ON components(component_type) WHERE is_renderer_slot = 1;
-- Required, not cosmetic: §7.3's component_category_map has a FOREIGN KEY to
-- components(component_type), and SQLite (like Postgres) rejects a foreign key that
-- does not point at a PRIMARY KEY or UNIQUE column. Without this the map table fails
-- to create.
CREATE UNIQUE INDEX idx_components_type ON components(component_type);

-- Class D. Child table: the spec's "component list, typical materials" per variant.
CREATE TABLE variant_components (
  id                  TEXT PRIMARY KEY,
  variant_id          TEXT NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  component_id        TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  is_defining_feature INTEGER NOT NULL DEFAULT 0 CHECK (is_defining_feature IN (0,1)),
  is_required         INTEGER NOT NULL DEFAULT 1 CHECK (is_required IN (0,1)),
  -- Dataset's primary_colors[] / secondary_colors[]. List form, not a scalar, because
  -- the on-disk data is a list and Phase 2 must score the best match, not the first.
  primary_colors      TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(primary_colors)),
  secondary_colors    TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(secondary_colors)),
  keywords            TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(keywords)),
  style_notes         TEXT,
  -- The dataset's per-category weight. The Python matcher ignores it and hard-codes
  -- 0.7/0.2/0.1 (attire_matcher.py:109-112). Stored here so the TS port can honour it.
  weight              REAL NOT NULL DEFAULT 1.0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  version             INTEGER NOT NULL DEFAULT 1,
  deleted_at          TEXT,
  sync_state          TEXT NOT NULL DEFAULT 'synced'
                       CHECK (sync_state IN ('synced','pending','conflict')),
  UNIQUE (variant_id, component_id)
);
CREATE INDEX idx_variant_components_defining
  ON variant_components(variant_id) WHERE is_defining_feature = 1;

-- Class D.
CREATE TABLE permitted_categories (
  id              TEXT PRIMARY KEY,
  category_name   TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL,
  examples        TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(examples)),
  edge_case_notes TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  deleted_at      TEXT,
  sync_state      TEXT NOT NULL DEFAULT 'synced'
                   CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_permitted_categories_active ON permitted_categories(is_active) WHERE deleted_at IS NULL;

-- Class D. Typical prices. sample_count and the window are carried over verbatim.
CREATE TABLE value_references (
  id                       TEXT PRIMARY KEY,
  item_category            TEXT NOT NULL,
  material_category        TEXT,
  typical_price_min        INTEGER NOT NULL,
  typical_price_max        INTEGER NOT NULL,
  sample_count             INTEGER NOT NULL,
  aggregation_window_start TEXT NOT NULL,
  aggregation_window_end   TEXT NOT NULL,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL,
  version                  INTEGER NOT NULL DEFAULT 1,
  deleted_at               TEXT,
  sync_state               TEXT NOT NULL DEFAULT 'synced'
                             CHECK (sync_state IN ('synced','pending','conflict')),
  CHECK (typical_price_min <= typical_price_max)
);
CREATE INDEX idx_value_references_category ON value_references(item_category);
```

### 3.3 Owned attire and inventory

```sql
-- Class B.
CREATE TABLE owned_attire (
  id                      TEXT PRIMARY KEY,
  user_email              TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  entry_method            TEXT NOT NULL CHECK (entry_method IN ('photo','text','voice')),
  entry_language          TEXT CHECK (entry_language IN ('english','taglish')),
  original_input_text     TEXT,
  photo_urls              TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(photo_urls)),
  auto_categorized_type   TEXT NOT NULL CHECK (auto_categorized_type IN
                            ('wig','clothing','footwear','accessory','armor','weapon','prop','fabric','material','other')),
  auto_categorized_color  TEXT,       -- raw, per the store-raw convention
  auto_categorized_style  TEXT,
  flexibility_tag         TEXT NOT NULL CHECK (flexibility_tag IN
                            ('restyle-willing','dye-willing','as-is-only')),
  condition_rating        INTEGER NOT NULL CHECK (condition_rating BETWEEN 1 AND 5),
  availability_status     TEXT NOT NULL DEFAULT 'free' CHECK (availability_status IN ('free','committed')),
  committed_to_project_id TEXT,       -- FK added in §3.4 after projects exists
  acquired_date           TEXT,       -- YYYY-MM-DD local
  acquisition_cost        INTEGER,    -- minor units
  notes                   TEXT,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  version                 INTEGER NOT NULL DEFAULT 1,
  deleted_at              TEXT,
  sync_state              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_owned_attire_user   ON owned_attire(user_email);
CREATE INDEX idx_owned_attire_status ON owned_attire(availability_status);
CREATE INDEX idx_owned_attire_type   ON owned_attire(auto_categorized_type);

-- Class B. Normalised from condition_photo_history[] (DATA §15: "periodically logged").
CREATE TABLE attire_condition_photos (
  id               TEXT PRIMARY KEY,
  attire_id        TEXT NOT NULL REFERENCES owned_attire(id) ON DELETE CASCADE,
  photo_url        TEXT,
  condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
  captured_at      TEXT NOT NULL,
  -- Append-only (§4.6: union by id). updated_at/version/sync_state are structurally
  -- constant; deleted_at is always NULL because a photo is never retracted, only
  -- superseded by a later capture of the same item.
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  version          INTEGER NOT NULL DEFAULT 1,
  deleted_at       TEXT,
  sync_state       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_attire_condition_photos ON attire_condition_photos(attire_id, captured_at);

-- Class B. "Item match ratings improve as actual-use history ... raises its confidence" (ML §31).
CREATE TABLE attire_usage_history (
  id          TEXT PRIMARY KEY,
  attire_id   TEXT NOT NULL REFERENCES owned_attire(id) ON DELETE CASCADE,
  project_id  TEXT NOT NULL,
  variant_id  TEXT NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  used_date   TEXT NOT NULL,
  -- Append-only (§4.6: union by id). A wear is a fact that happened; it is never
  -- edited. The envelope is present for uniformity, and the three mutable-looking
  -- columns are structurally constant.
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  deleted_at  TEXT,
  sync_state  TEXT NOT NULL DEFAULT 'pending'
                CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_usage_attire  ON attire_usage_history(attire_id);
CREATE INDEX idx_usage_variant ON attire_usage_history(variant_id);
```

### 3.4 Projects, tasks, budget

Currently **no persistence at all**. This is the largest single gap (`SCOPE.md` D-11, IN-48…IN-56).

```sql
-- Class B.
CREATE TABLE projects (
  id                         TEXT PRIMARY KEY,
  user_email                 TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  character_id               TEXT NOT NULL REFERENCES characters(id),
  variant_id                 TEXT NOT NULL REFERENCES variants(id),
  project_name               TEXT NOT NULL,
  stated_budget              INTEGER,        -- minor units; DATA §10
  stated_skill_level         TEXT NOT NULL CHECK (stated_skill_level IN
                               ('beginner','intermediate','advanced','expert')),
  start_date                 TEXT NOT NULL,  -- YYYY-MM-DD local
  target_completion_date     TEXT,
  linked_event_id            TEXT,           -- FK added in §3.7
  opted_in_readiness_sharing INTEGER NOT NULL DEFAULT 0 CHECK (opted_in_readiness_sharing IN (0,1)),
  status                     TEXT NOT NULL DEFAULT 'planning'
                               CHECK (status IN ('planning','in-progress','completed','abandoned')),
  created_at                 TEXT NOT NULL,
  updated_at                 TEXT NOT NULL,
  version                    INTEGER NOT NULL DEFAULT 1,
  deleted_at                 TEXT,
  sync_state                 TEXT NOT NULL DEFAULT 'pending'
                               CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_projects_user    ON projects(user_email, status);
CREATE INDEX idx_projects_variant ON projects(variant_id);

-- Class B. The time-and-effort ledger. Nothing writes it today; ML §31 needs it to exist first.
CREATE TABLE tasks (
  id                      TEXT PRIMARY KEY,
  project_id              TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_description        TEXT NOT NULL,
  task_order              INTEGER NOT NULL,
  difficulty_rating       INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  technique_tags          TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(technique_tags)),
  estimated_time_hours    REAL,
  actual_completion_date  TEXT,   -- YYYY-MM-DD local; IN-54
  actual_time_spent_hours REAL,   -- IN-54
  status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','in-progress','completed','skipped')),
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  version                 INTEGER NOT NULL DEFAULT 1,
  deleted_at              TEXT,
  sync_state              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_tasks_project ON tasks(project_id, task_order);
CREATE INDEX idx_tasks_status  ON tasks(status);

-- Class B.
CREATE TABLE budget_line_items (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_name      TEXT NOT NULL,
  category       TEXT NOT NULL CHECK (category IN ('material','labor','tool','other')),
  planned_amount INTEGER NOT NULL,
  actual_amount  INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  version        INTEGER NOT NULL DEFAULT 1,
  deleted_at     TEXT,
  sync_state     TEXT NOT NULL DEFAULT 'pending'
                   CHECK (sync_state IN ('synced','pending','conflict'))
);

-- Class B.
CREATE TABLE project_milestones (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_label TEXT NOT NULL,
  target_date   TEXT NOT NULL,
  is_completed  INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0,1)),
  completed_at  TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  deleted_at    TEXT,
  sync_state    TEXT NOT NULL DEFAULT 'pending'
                  CHECK (sync_state IN ('synced','pending','conflict'))
);

-- Class A. The Cosplay Diary is explicitly kept separate from the AI-facing build
-- history (PLAN P1). No sync columns, and no column any engine may read.
CREATE TABLE diary_entries (
  id               TEXT PRIMARY KEY,
  user_email       TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  project_id       TEXT,       -- no FK: projects are class B and this is class A
  project_name     TEXT,       -- snapshot; survives a project delete
  character_name   TEXT,
  variant_name     TEXT,
  photos           TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(photos)),
  rating           INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes            TEXT,
  completion_date  TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX idx_diary_user ON diary_entries(user_email, completion_date);
```

### 3.5 Marketplace

```sql
-- Class B. Drafts sync; publication is gated (see §4.1).
CREATE TABLE listings (
  id                 TEXT PRIMARY KEY,
  seller_email       TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  item_title         TEXT NOT NULL,
  item_description   TEXT NOT NULL,
  category_name      TEXT NOT NULL REFERENCES permitted_categories(category_name),
  transaction_type   TEXT NOT NULL CHECK (transaction_type IN ('buy','trade','both')),
  price              INTEGER NOT NULL DEFAULT 0,   -- minor units
  price_outlier      TEXT CHECK (price_outlier IN
                       ('above-typical','below-typical','within-range','insufficient-data')),
  condition          TEXT NOT NULL CHECK (condition IN
                       ('new','like_new','good','fair','well_loved')),
  photo_urls         TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(photo_urls)),
  screening_result   TEXT NOT NULL DEFAULT 'pending'
                       CHECK (screening_result IN ('pending','passed','blocked')),
  screening_reason   TEXT,
  screening_engine   TEXT,       -- engine + version, per the two-engine rule
  screening_engine_version TEXT,
  listing_status     TEXT NOT NULL DEFAULT 'draft'
                       CHECK (listing_status IN ('draft','active','sold','cancelled','blocked')),
  appeal_status      TEXT NOT NULL DEFAULT 'none'
                       CHECK (appeal_status IN ('none','pending','upheld','overturned')),
  appeal_message     TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  version            INTEGER NOT NULL DEFAULT 1,
  deleted_at         TEXT,
  sync_state         TEXT NOT NULL DEFAULT 'pending'
                       CHECK (sync_state IN ('synced','pending','conflict')),
  CHECK ((transaction_type IN ('buy','both') AND price > 0) OR transaction_type = 'trade')
);
CREATE INDEX idx_listings_seller     ON listings(seller_email, listing_status);
CREATE INDEX idx_listings_screening  ON listings(screening_result);
CREATE INDEX idx_listings_appeal     ON listings(seller_email) WHERE appeal_status <> 'none';

-- Class C. The moment of first-accept is server-authoritative. See §4.2.
CREATE TABLE offers (
  id                        TEXT PRIMARY KEY,
  listing_id                TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  proposer_email            TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  offer_type                TEXT NOT NULL CHECK (offer_type IN ('purchase','trade','commission')),
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','accepted','declined','withdrawn')),
  offered_price             INTEGER,
  trade_offered_item        TEXT,
  trade_offered_condition   TEXT CHECK (trade_offered_condition IN
                              ('new','like_new','good','fair','well_loved')),
  trade_offered_est_value   INTEGER,
  commission_description    TEXT,
  timeline_days             INTEGER CHECK (timeline_days BETWEEN 1 AND 365),
  created_at                TEXT NOT NULL,
  responded_at              TEXT,
  updated_at                TEXT NOT NULL,
  version                   INTEGER NOT NULL DEFAULT 1,
  deleted_at                TEXT,
  sync_state                TEXT NOT NULL DEFAULT 'pending'
                              CHECK (sync_state IN ('synced','pending','conflict')),
  -- Snapshots removed on purpose. See §6.2.
  CHECK ((offer_type = 'purchase' AND offered_price IS NOT NULL) OR offer_type <> 'purchase')
);
CREATE UNIQUE INDEX idx_offers_one_pending ON offers(listing_id, proposer_email)
  WHERE status = 'pending';
CREATE INDEX idx_offers_listing ON offers(listing_id, status);

-- Class B. Thread existence is a local read; a new thread needs the server (§4.3).
CREATE TABLE chat_threads (
  id                  TEXT PRIMARY KEY,
  listing_id          TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_email         TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  seller_email        TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  thread_status       TEXT NOT NULL DEFAULT 'open' CHECK (thread_status IN ('open','closed')),
  closed_reason       TEXT CHECK (closed_reason IN ('closed_by_participant','listing_unavailable')),
  closed_at           TEXT,
  closed_by_email     TEXT,
  buyer_last_read_at  TEXT,
  seller_last_read_at TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  version             INTEGER NOT NULL DEFAULT 1,
  deleted_at          TEXT,
  sync_state          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (sync_state IN ('synced','pending','conflict')),
  CHECK (buyer_email <> seller_email)
);
CREATE UNIQUE INDEX idx_threads_unique ON chat_threads(listing_id, buyer_email);

-- Class B. Append-only. AI-EXCLUDED by policy, not by constraint.
-- The sync envelope is present because the table is class B; deleted_at is always
-- NULL (a retraction is impossible) and updated_at/version are written once at insert.
CREATE TABLE chat_messages (
  id           TEXT PRIMARY KEY,
  thread_id    TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  message_text TEXT NOT NULL CHECK (length(message_text) <= 1000),
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1,
  deleted_at   TEXT,
  sync_state   TEXT NOT NULL DEFAULT 'pending'
                 CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_chat_messages_thread ON chat_messages(thread_id, created_at);

-- Class B.
CREATE TABLE commission_milestones (
  id                  TEXT PRIMARY KEY,
  offer_id            TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  milestone_type      TEXT NOT NULL CHECK (milestone_type IN
                        ('payment-sent','payment-received','item-shipped','item-received',
                         'work-started','work-completed')),
  milestone_status    TEXT NOT NULL DEFAULT 'pending' CHECK (milestone_status IN ('pending','confirmed')),
  confirmed_by_email  TEXT,
  evidence_photo_url  TEXT,
  notes               TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  version             INTEGER NOT NULL DEFAULT 1,
  deleted_at          TEXT,
  sync_state          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_milestones_offer ON commission_milestones(offer_id, status);
```

### 3.6 Verification, portfolio, notification state

```sql
-- Class C. Identity verification is a Holder-only, human decision (CONCEPT §4).
CREATE TABLE holder_verification_records (
  id                   TEXT PRIMARY KEY,
  user_email           TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  id_front_image_ref   TEXT NOT NULL,
  id_back_image_ref    TEXT NOT NULL,
  registered_name      TEXT NOT NULL,
  recent_photo_url     TEXT NOT NULL,
  year_on_id           INTEGER,
  verification_status  TEXT NOT NULL DEFAULT 'pending'
                         CHECK (verification_status IN ('pending','approved','rejected')),
  submitted_at         TEXT NOT NULL,
  reviewed_by_email    TEXT,
  reviewed_at          TEXT,
  rejection_reason     TEXT,
  notes                TEXT,
  version              INTEGER NOT NULL DEFAULT 1,
  deleted_at           TEXT,
  sync_state           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (sync_state IN ('synced','pending','conflict'))
);

-- Class B.
CREATE TABLE marketplace_registration (
  id                        TEXT PRIMARY KEY,
  user_email                TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  marketplace_role          TEXT NOT NULL CHECK (marketplace_role IN ('buyer','seller','both')),
  seller_display_name       TEXT NOT NULL,
  contact_email             TEXT NOT NULL,
  contact_phone             TEXT,
  payout_method_label       TEXT,
  payout_method_number      TEXT,   -- see §6.3; MOCK field, not encrypted
  agreed_to_marketplace_terms INTEGER NOT NULL CHECK (agreed_to_marketplace_terms IN (0,1)),
  rejection_reason          TEXT,
  submitted_at              TEXT NOT NULL,
  updated_at                TEXT NOT NULL,
  version                   INTEGER NOT NULL DEFAULT 1,
  deleted_at                TEXT,
  sync_state                TEXT NOT NULL DEFAULT 'pending'
                              CHECK (sync_state IN ('synced','pending','conflict'))
);

-- Class B.
CREATE TABLE portfolio_photos (
  id            TEXT PRIMARY KEY,
  user_email    TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  photo_url     TEXT NOT NULL,
  caption       TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  deleted_at    TEXT,
  sync_state    TEXT NOT NULL DEFAULT 'pending'
                  CHECK (sync_state IN ('synced','pending','conflict'))
);

-- Class B. The Postgres table is mute flags only; the app also needs "already shown".
CREATE TABLE notification_state (
  id                  TEXT PRIMARY KEY,
  user_email          TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  is_chat_muted       INTEGER NOT NULL DEFAULT 0 CHECK (is_chat_muted IN (0,1)),
  is_marketplace_muted INTEGER NOT NULL DEFAULT 0 CHECK (is_marketplace_muted IN (0,1)),
  is_logistics_muted  INTEGER NOT NULL DEFAULT 0 CHECK (is_logistics_muted IN (0,1)),
  is_projects_muted   INTEGER NOT NULL DEFAULT 0 CHECK (is_projects_muted IN (0,1)),
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  version             INTEGER NOT NULL DEFAULT 1,
  deleted_at          TEXT,
  sync_state          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (sync_state IN ('synced','pending','conflict'))
);
```

### 3.7 Events and organizer tools

```sql
-- Class B.
CREATE TABLE events (
  id               TEXT PRIMARY KEY,
  organizer_email  TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  event_name       TEXT NOT NULL,
  description      TEXT,
  venue_name       TEXT NOT NULL,
  city             TEXT,
  start_date       TEXT NOT NULL,
  end_date         TEXT,
  has_contest      INTEGER NOT NULL DEFAULT 0 CHECK (has_contest IN (0,1)),
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','cancelled')),
  confirmed_at     TEXT,
  confirmed_by_email TEXT,
  cancelled_at     TEXT,
  cancelled_by_email TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  version          INTEGER NOT NULL DEFAULT 1,
  deleted_at       TEXT,
  sync_state       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_events_status ON events(status, start_date);

-- Class B. Decomposed from EventLogisticsContext. Field-level merge; see §4.4.
CREATE TABLE logistics_entries (
  id                     TEXT PRIMARY KEY,
  event_id               TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_kind       TEXT NOT NULL CHECK (participant_kind IN ('confirmed_guest','sponsor','performer')),
  participant_name       TEXT NOT NULL,
  participant_email      TEXT,   -- may not be a ForgeMind account, so no FK
  submission_deadline    TEXT NOT NULL,
  arrival_date           TEXT,
  arrival_time           TEXT,   -- HH:MM
  parking_needs          TEXT NOT NULL DEFAULT 'none' CHECK (parking_needs IN ('none','standard','accessible')),
  plate_number           TEXT,   -- NULL when parking_needs = 'none'
  entourage_size         INTEGER,   -- 0 = answered with no entourage, NULL = unanswered
  stage_time_needs       TEXT,
  assigned_to_email      TEXT,
  assigned_at            TEXT,
  assigned_by_email      TEXT,
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','withdrawn')),
  withdrawn_at           TEXT,
  withdrawn_by_email     TEXT,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  updated_by_email       TEXT,
  version                INTEGER NOT NULL DEFAULT 1,
  deleted_at             TEXT,
  sync_state             TEXT NOT NULL DEFAULT 'pending'
                           CHECK (sync_state IN ('synced','pending','conflict')),
  CHECK (parking_needs <> 'none' OR plate_number IS NULL)
);
CREATE INDEX idx_logistics_event     ON logistics_entries(event_id, status);
CREATE INDEX idx_logistics_assigned ON logistics_entries(assigned_to_email)
  WHERE assigned_to_email IS NOT NULL;

-- Class B. Append-only audit trail (DATA §23). Merge by id; see §4.5.
CREATE TABLE commitment_log (
  id                  TEXT PRIMARY KEY,
  entity_type         TEXT NOT NULL CHECK (entity_type IN ('event','logistics_entry')),
  entity_id           TEXT NOT NULL,
  field_name          TEXT NOT NULL,
  old_value           TEXT,
  new_value           TEXT,
  changed_by_email    TEXT NOT NULL,
  changed_by_name     TEXT NOT NULL,   -- snapshot, survives account deletion
  changed_at          TEXT NOT NULL,
  department_routed_to TEXT,
  -- Append-only (DATA §23). Envelope present for class-B uniformity; deleted_at is
  -- always NULL, updated_at mirrors created_at, version stays 1, sync_state is set
  -- once the row has been pushed and is never edited. See §4.5.
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  version             INTEGER NOT NULL DEFAULT 1,
  deleted_at          TEXT,
  sync_state          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_commitment_entity     ON commitment_log(entity_type, entity_id);
CREATE INDEX idx_commitment_department ON commitment_log(department_routed_to, changed_at);
-- A field-level merge (§4.4) never updates a log row, so nothing in the envelope is
-- ever mutated after insert. That is why no UPDATE statement may target this table.

-- Class B. RSVPs were a nested array inside Meetup; now a real table (§6.1).
CREATE TABLE event_meetups (
  id                 TEXT PRIMARY KEY,
  event_id           TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  proposed_by_email  TEXT NOT NULL,
  proposed_by_name   TEXT NOT NULL,
  title              TEXT NOT NULL,
  purpose            TEXT,
  proposed_date      TEXT NOT NULL,
  proposed_time      TEXT NOT NULL,
  proposed_location  TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  version            INTEGER NOT NULL DEFAULT 1,
  deleted_at         TEXT,
  sync_state         TEXT NOT NULL DEFAULT 'pending'
                       CHECK (sync_state IN ('synced','pending','conflict'))
);

-- Class B. Appendix / solution side of a field-level merge, not a conflict. See §4.4.
-- One row per (meetup, cosplayer): a later response REPLACES this row, so unlike the
-- append-only tables deleted_at and updated_at here are genuinely used.
CREATE TABLE meetup_rsvps (
  id               TEXT PRIMARY KEY,
  meetup_id        TEXT NOT NULL REFERENCES event_meetups(id) ON DELETE CASCADE,
  cosplayer_email  TEXT NOT NULL,
  cosplayer_name   TEXT NOT NULL,
  rsvp_status      TEXT NOT NULL CHECK (rsvp_status IN ('going','maybe','declined')),
  responded_at     TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  version          INTEGER NOT NULL DEFAULT 1,
  deleted_at       TEXT,
  sync_state       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE UNIQUE INDEX idx_rsvps_unique ON meetup_rsvps(meetup_id, cosplayer_email);

-- Class B. Invite-code meetups, a separate feature from event meetups.
CREATE TABLE invite_meetups (
  id                TEXT PRIMARY KEY,
  invite_code       TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT,
  meetup_date       TEXT NOT NULL,
  meetup_time       TEXT NOT NULL,
  location          TEXT NOT NULL,
  created_by_email  TEXT NOT NULL,
  created_by_name   TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  version           INTEGER NOT NULL DEFAULT 1,
  deleted_at        TEXT,
  sync_state        TEXT NOT NULL DEFAULT 'pending'
                      CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_invite_meetups_date ON invite_meetups(meetup_date);

CREATE TABLE invite_meetup_participants (
  id               TEXT PRIMARY KEY,
  meetup_id        TEXT NOT NULL REFERENCES invite_meetups(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  participant_name  TEXT NOT NULL,
  joined_at         TEXT NOT NULL,
  -- Joining/leaving is server wins and requires online (§4.6), so a departure is a
  -- soft delete, never a hard delete: the invite code's participant count is audited.
  left_at           TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  version           INTEGER NOT NULL DEFAULT 1,
  deleted_at        TEXT,
  sync_state        TEXT NOT NULL DEFAULT 'pending'
                      CHECK (sync_state IN ('synced','pending','conflict')),
  UNIQUE (meetup_id, participant_email)
);

-- Class B.
CREATE TABLE contest_criteria (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  deleted_at  TEXT,
  sync_state  TEXT NOT NULL DEFAULT 'pending'
                CHECK (sync_state IN ('synced','pending','conflict'))
);

-- Class B. Tier assignment is class C; opt-in and confirmation are class B.
CREATE TABLE contest_opt_ins (
  id                     TEXT PRIMARY KEY,
  event_id               TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  cosplayer_email        TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  cosplayer_display_name TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','confirmed','declined')),
  assigned_tier_id       TEXT REFERENCES contest_criteria(id) ON DELETE SET NULL,
  assigned_at            TEXT,
  confirmed_by_email     TEXT,
  confirmed_at           TEXT,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  version                INTEGER NOT NULL DEFAULT 1,
  deleted_at             TEXT,
  sync_state             TEXT NOT NULL DEFAULT 'pending'
                           CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE UNIQUE INDEX idx_contest_optins_unique ON contest_opt_ins(event_id, cosplayer_email);

-- Class B. [NEEDS DECISION] Q-2: DATA §21 asks for this, SCHEMA_RECONCILIATION.md:1972 says
-- "does this table exist at all?" and :1224 says "do not migrate either table until ruled on".
-- Declared but NOT created; see §5 M-11.
-- CREATE TABLE event_participant_applications ( ... );

-- Class B. Organizer hierarchy, decomposed from the nested JSON.
CREATE TABLE event_staff_members (
  id                TEXT PRIMARY KEY,
  event_id          TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  head_email        TEXT NOT NULL,
  staff_email       TEXT NOT NULL,
  department        TEXT NOT NULL CHECK (department IN
                      ('logistics','programs','sponsorship','secretariat','technical_production','marketing')),
  invite_status     TEXT NOT NULL CHECK (invite_status IN ('pending','accepted','declined','removed')),
  invited_at        TEXT NOT NULL,
  responded_at      TEXT,
  -- invite_status is forward-only and server wins (§4.6), so a removal is a soft
  -- delete. updated_at and version change exactly once, when the status settles.
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  version           INTEGER NOT NULL DEFAULT 1,
  deleted_at        TEXT,
  sync_state        TEXT NOT NULL DEFAULT 'pending'
                      CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_staff_event  ON event_staff_members(event_id, staff_email);
CREATE INDEX idx_staff_staff  ON event_staff_members(staff_email, invite_status);

-- Class B. The synthetic `user-${emailPrefix}` id from OrganizerService:176 is resolved here.
CREATE TABLE organizer_access_requests (
  id                   TEXT PRIMARY KEY,
  user_email           TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  justification        TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
  reviewed_by_email    TEXT,
  reviewed_at          TEXT,
  submitted_at         TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  version              INTEGER NOT NULL DEFAULT 1,
  deleted_at           TEXT,
  sync_state           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_access_requests_status ON organizer_access_requests(status);

-- Class B. Split from the one composite `@forgemind:contest` key.
CREATE TABLE calendar_entries (
  id                       TEXT PRIMARY KEY,
  user_email               TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  title                    TEXT NOT NULL,
  organizer_name           TEXT,
  venue_name               TEXT NOT NULL,
  city                     TEXT NOT NULL,
  start_date               TEXT NOT NULL,
  end_date                 TEXT,
  description              TEXT,
  external_link            TEXT,
  submitted_by_email       TEXT NOT NULL,
  submitted_by_name        TEXT NOT NULL,
  submitted_by_department  TEXT,
  entry_status             TEXT NOT NULL DEFAULT 'pending'
                             CHECK (entry_status IN ('pending','approved','rejected')),
  reviewed_by_email        TEXT,
  reviewed_at              TEXT,
  rejection_reason         TEXT,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL,
  version                  INTEGER NOT NULL DEFAULT 1,
  deleted_at               TEXT,
  sync_state               TEXT NOT NULL DEFAULT 'pending'
                             CHECK (sync_state IN ('synced','pending','conflict'))
);
CREATE INDEX idx_calendar_status ON calendar_entries(entry_status, start_date);
```

Deferred FKs, added after both sides exist:

```sql
ALTER TABLE owned_attire
  ADD CONSTRAINT owned_attire_project_fkey
  FOREIGN KEY (committed_to_project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE attire_usage_history
  ADD CONSTRAINT usage_project_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE projects
  ADD CONSTRAINT projects_event_fkey
  FOREIGN KEY (linked_event_id) REFERENCES events(id) ON DELETE SET NULL;
```

### 3.8 AI results — the two-engine record

Required by the global rule ("label every result with engine + engine_version; never mix scores
across engines") and by Phase 2 item 3. **No such table exists anywhere today**, which is why the
rule is currently unimplementable.

```sql
-- Class D. LocalEngine writes here offline. RemoteEngine writes here when reachable.
CREATE TABLE ai_results (
  id               TEXT PRIMARY KEY,
  -- The inputs, so a result is reproducible and re-runnable when the reference changes.
  input_json       TEXT NOT NULL CHECK (json_valid(input_json)),
  -- The Phase 2 outfit spec, stored whole. Slots + confidence + missing flags.
  spec_json        TEXT NOT NULL CHECK (json_valid(spec_json)),
  engine           TEXT NOT NULL CHECK (engine IN ('local','remote')),
  engine_version   TEXT NOT NULL,
  confidence       REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  generated_at     TEXT NOT NULL,
  -- Which character and variant were scored, so results are queryable.
  character_id     TEXT REFERENCES characters(id),
  variant_id       TEXT REFERENCES variants(id),
  user_email       TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  version          INTEGER NOT NULL DEFAULT 1,
  deleted_at       TEXT,
  sync_state       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (sync_state IN ('synced','pending','conflict'))
);
-- Mixed scores must be impossible to query by accident. engine_version is deliberately
-- part of the key, so a version bump cannot silently average with old results.
CREATE INDEX idx_ai_results_engine  ON ai_results(engine, engine_version, generated_at);
CREATE INDEX idx_ai_results_variant ON ai_results(variant_id, generated_at);
CREATE INDEX idx_ai_results_user    ON ai_results(user_email, generated_at);

-- Class A. Cache of the shared reference, so LocalEngine works with no network and
-- no bundled JSON. Content-addressed on version so a bump invalidates cleanly.
-- Class A, not D, despite looking like synced data: nothing is ever pushed *from*
-- this table. It is a read-only local copy of what the server already holds, so a
-- sync envelope would be write-only dead weight. A cache miss is a re-fetch, not a
-- conflict.
CREATE TABLE reference_cache (
  id            TEXT PRIMARY KEY,
  cache_key     TEXT NOT NULL UNIQUE,
  engine_version TEXT NOT NULL,
  payload       TEXT NOT NULL CHECK (json_valid(payload)),
  fetched_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
```

### 3.9 Class-A tables that do not sync, and why each is exempt

The rule in §3 is that every **syncable** table carries the six-column envelope. Class A is not
syncable, so the exemption is listed per table here — auditable, not assumed.

| Table | Why class A | Has `id`? | Has `created_at`/`updated_at`? |
|---|---|---|---|
| `users` | device-local mirror; the server is the store of record | yes | yes |
| `session` | device-local; the token is cleared on sign-out | yes | `issued_at`/`expires_at` serve instead |
| `user_consent` | recorded locally so the banner can be suppressed offline | `user_email` is the PK | `accepted_at`/`withdrawn_at` serve instead |
| `shown_notifications` | "have I shown this" is a device fact | yes | `shown_at` serves as `created_at` |
| `diary_entries` | explicitly kept out of the AI-facing history (PLAN P1) | yes | yes |
| `reference_cache` | a read-only local copy of server data; nothing is pushed from it | yes | `fetched_at` + yes |
| `component_category_map` | reference data shipped with the app | composite PK | no — static for the app's lifetime |
| `schema_meta`, `migration_ledger`, `outbox` | infrastructure, not domain data | composite PKs | partial, by role |

`Appearance Hub` settings live in `users.theme_preference` and stay class A — the Appearance Hub is
"applied purely to the user's own interface" (`PLAN P1`) and has no cross-device meaning.

### 3.10 Class summary

| Class | Tables |
|---|---|
| **A** offline-full | `users`, `session`, `user_consent`, `shown_notifications`, `diary_entries`, `reference_cache`, `component_category_map`, `schema_meta`, `migration_ledger`, `outbox` |
| **B** offline+sync | `owned_attire`, `attire_condition_photos`, `attire_usage_history`, `projects`, `tasks`, `budget_line_items`, `project_milestones`, `listings`, `chat_threads`, `chat_messages`, `commission_milestones`, `marketplace_registration`, `portfolio_photos`, `notification_state`, `events`, `logistics_entries`, `logistics_field_versions`, `commitment_log`, `event_meetups`, `meetup_rsvps`, `invite_meetups`, `invite_meetup_participants`, `contest_criteria`, `contest_opt_ins`, `event_staff_members`, `organizer_access_requests`, `calendar_entries` |
| **C** online-required | `offers` (accept), `holder_verification_records` (submit/review), tier assignment on `contest_opt_ins` |
| **D** online-enhanced | `characters`, `variants`, `components`, `variant_components`, `permitted_categories`, `value_references`, `ai_results` |

### 3.11 Sync-envelope compliance check, table by table

Every syncable table in §3, against the six required columns. `=1` means the column is present and
populated; `const` means the column exists but is structurally fixed at that value (an append-only
row, or a single-server-authoritative field) so no merge can ever contend on it.

| Table | Class | `id` | `created_at` | `updated_at` | `version` | `deleted_at` | `sync_state` |
|---|---|---|---|---|---|---|---|
| `owned_attire` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `attire_condition_photos` | B | =1 | =1 | const | const | const NULL | =1 |
| `attire_usage_history` | B | =1 | =1 | const | const | const NULL | =1 |
| `projects` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `tasks` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `budget_line_items` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `project_milestones` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `listings` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `offers` | C | =1 | =1 | =1 | =1 | =1 | =1 |
| `chat_threads` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `chat_messages` | B | =1 | =1 | const | const | const NULL | =1 |
| `commission_milestones` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `marketplace_registration` | B | =1 | const `submitted_at` | =1 | =1 | =1 | =1 |
| `portfolio_photos` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `notification_state` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `events` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `logistics_entries` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `logistics_field_versions` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `commitment_log` | B | =1 | =1 | const | const | const NULL | =1 |
| `event_meetups` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `meetup_rsvps` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `invite_meetups` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `invite_meetup_participants` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `contest_criteria` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `contest_opt_ins` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `event_staff_members` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `organizer_access_requests` | B | =1 | const `submitted_at` | =1 | =1 | =1 | =1 |
| `calendar_entries` | B | =1 | =1 | =1 | =1 | =1 | =1 |
| `holder_verification_records` | C | =1 | const `submitted_at` | const `reviewed_at` | =1 | =1 | =1 |
| `characters` | D | =1 | =1 | =1 | =1 | =1 | =1 |
| `variants` | D | =1 | =1 | =1 | =1 | =1 | =1 |
| `components` | D | =1 | =1 | =1 | =1 | =1 | =1 |
| `variant_components` | D | =1 | =1 | =1 | =1 | =1 | =1 |
| `permitted_categories` | D | =1 | =1 | =1 | =1 | =1 | =1 |
| `value_references` | D | =1 | =1 | =1 | =1 | =1 | =1 |
| `ai_results` | D | =1 | =1 | =1 | =1 | =1 | =1 |

**36 syncable tables (27 class B + 2 class C + 7 class D), 0 exceptions.** Three rows carry a
lifecycle timestamp in a domain-specific column instead of a generic `created_at`
(`submitted_at` on `marketplace_registration` and `organizer_access_requests`,
`submitted_at`/`reviewed_at` on `holder_verification_records`); the information is identical and a
duplicate generic column would be a second source of truth for the same fact. The 10 class-A
exemptions are in §3.9, giving **46 tables in total**.

---

## 4. Conflict rules, one per class-B table

Notation: *server* = the authoritative copy once online. *Local wins* means the local value is
carried forward and the server is told. *Server wins* means the local value is discarded and the UI
is told.

### 4.0 The common envelope

Every syncable row carries `version` (server-assigned, monotonic per row), `updated_at`, `deleted_at`,
`sync_state`. A push is:

1. Read the outbox row, apply it, increment `version` server-side, set `updated_at`.
2. If the client's `version` is lower than the server's, the row is a candidate for the table's rule
   below. The rule decides; it does not write a `conflict` state for a field-level merge.
3. If the rule cannot decide, set `sync_state = 'conflict'`, leave both copies, and surface a
   **choice** to the user. Never auto-resolve silently.

`deleted_at` wins over any field edit: a soft-deleted row is not resurrected by a stale update.
A purge job hard-deletes rows whose `deleted_at` is older than 30 days **and** whose `sync_state` is
`synced`, at both ends, in the same order.

### 4.1 `listings` — hybrid, and the reason is the one autonomous AI action

A listing has two lifecycles, and they have different rules:

- **`draft` → `screening`:** local wins. A seller can edit their own draft on a plane.
- **screening:** the outcome is **server wins, no exceptions**. `OUT §36` makes the block the only
  place the AI acts rather than suggests, so it cannot be decided on-device where a modified build
  could bypass it. A local `screening_result = 'passed'` is a prediction for the UI only; the
  server's answer overwrites it and is the one recorded in `screening_engine` /
  `screening_engine_version`.
- **`active` → `sold`/`cancelled`:** server wins, one-way. The first of `sold` / `cancelled` to land
  wins; a later opposing update is rejected and the row goes to `conflict` for the seller to see.
- **price / title / description edits while `active`:** local wins (last write wins), because two
  devices editing one seller's listing concurrently is not a real scenario and blocking the seller
  to resolve a typo is worse than the lost update.
- **appeal_status:** server wins. Only the Holder moves it, and the appeal is the Holder's decision
  (`CONCEPT §36`).

### 4.2 `offers` — first-accepted wins; accept is class C

- **Create / decline / withdraw:** local wins, then the server validates. A withdrawn offer cannot be
  resurrected by an update in flight.
- **Accept: server wins, and the client may not perform it offline.** Two cosplayers on two devices
  must not both believe they bought the same wig. The server holds the first `accepted` for a
  `listing_id`; every other pending offer for that listing is transitioned to `declined` in the same
  transaction. The losing device receives the server's `declined` state and shows it.
- The unique partial index `idx_offers_one_pending` (one pending offer per listing per proposer) is
  a second line of defence, and it ports to SQLite unchanged.
- **Accept requires online. The UI must say so**, or the class-C rule is invisible to the user.
- Commission `offered_price` and `timeline_days` after acceptance: server wins. Once accepted, the
  price is the agreed price; a second device trying to change it is a conflict, not a merge.

### 4.3 `chat_threads`, `chat_messages` — append-only, plus one exclusive open thread

- **Messages:** append-only by id. A message never merges, never overwrites, never deletes. Both
  sides converge by union on `id`. Ordering is `created_at`, with `id` as the tiebreaker so two
  devices that disagree by a millisecond still converge deterministically.
- **`last_message_preview`:** derived on read from the latest message, never synced as a field. The
  current code stores a 60-char slice at write time (`ChatContext.tsx:237`), which goes stale.
- **Read markers** (`buyer_last_read_at` / `seller_last_read_at`): **max wins**. Each side writes
  only its own column, so the two never contend. There is no conflict possible.
- **Thread creation:** the client creates optimistically, but only if both parties are
  Holder-verified and the listing is `active`. **The server re-validates and is authoritative**; if it
  rejects, the local thread is soft-deleted and the message the user just wrote is retained so it can
  be resent. The one case where losing a local write is the correct outcome.
- **Close:** server wins, one-way. `closed_reason` is whichever party won; the loser is told.
- **Never in scope:** no engine reads `chat_messages`. The `AI-EXCLUDED` rule from
  `forgemind-backend/migrations/007_*.js` is preserved as a comment on the table and as a lint
  rule.

### 4.4 `logistics_entries` — field-level merge

The rule the task specifies, written out. Per field, comparing this device's `updated_at` for that
field against the server's:

| Field group | Rule | Why |
|---|---|---|
| `arrival_date`, `arrival_time`, `parking_needs`, `plate_number`, `entourage_size`, `stage_time_needs` | **Field-level last-write-wins, independently per field.** Newest `updated_at` for *that field* wins. | These are the fields staff fill in separately, often on different devices for the same guest. Whole-row LWW would silently discard a plate number because someone else fixed the arrival time. |
| `submission_deadline`, `participant_name`, `participant_kind`, `event_id` | **Server wins, immutable after create.** A local change is a conflict. | Core fields are locked at creation (`LogisticsContext.tsx:343`). Changing them changes what the deadline means for every other field. |
| `assigned_to_email`, `assigned_at`, `assigned_by_email` | **Exclusive: first server commit wins.** A second concurrent assignment is a conflict. | One staff member can own one active entry — the existing
 `idx_unique_staff_assignment` partial index. Two assignments would mean two people chasing one guest. |
| `status`, `withdrawn_at`, `withdrawn_by_email` | **Server wins, one-way.** `withdrawn` is terminal. | A withdrawn entry must not be resurrected by a stale update from a device that was offline. |
| `version` | Server-assigned, monotonic. Never client-set. | The merge needs a total order. |

**Field-level `updated_at`.** The current schema has one `updated_at` per row, which is not enough to
do a per-field merge. Add `field_versions` and use it to decide which device last wrote which field:

```sql
-- Which device last wrote which field, and when. Required by the §4.4 merge.
-- Class B: the server needs the same table to arbitrate the merge, so it syncs and
-- carries the standard envelope. One row per (entry, field) — a later write is an
-- UPSERT that bumps version, which is what makes the merge a total order.
CREATE TABLE logistics_field_versions (
  id          TEXT PRIMARY KEY,
  entry_id    TEXT NOT NULL REFERENCES logistics_entries(id) ON DELETE CASCADE,
  field_name  TEXT NOT NULL,
  written_by  TEXT NOT NULL,
  written_at  TEXT NOT NULL,
  device_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  deleted_at  TEXT,
  sync_state  TEXT NOT NULL DEFAULT 'pending'
                CHECK (sync_state IN ('synced','pending','conflict')),
  UNIQUE (entry_id, field_name)
);
CREATE INDEX idx_field_versions_device ON logistics_field_versions(device_id, written_at);
```

`device_id` is generated once per install and stored in `schema_meta`. It is not a user identifier.

**Corollary for `commitment_log`:** §4.5 says the log merges by id, append-only. That is unaffected by
the logistics merge — the log is an audit trail of the merge, not a participant in it. Each field-level
win writes its own `commitment_log` row.

### 4.5 `commitment_log` — append-only, merged by id

Exactly as the task specifies, and it is the simplest rule in the schema because the table is
append-only by construction: `CommitmentLogContext.tsx:65` is the only writer and there is no update or
delete path.

- **Merge by id, union semantics.** Each device's entries are inserted; nothing is ever updated or
  removed. Convergence is by set union on the primary key.
- **Ids are already unique per device.** The composite is
  `` `${entity_type}_${entity_id}_${ISO}_${index}` ` `` (`CommitmentLogContext.tsx:81`), and the ISO
  timestamp plus index make it collision-free across devices. This is the one place where id
  uniqueness is genuinely load-bearing — do not "simplify" it to a bare UUID without preserving
  the timestamp+index suffix, or two devices writing the same field in the same millisecond will
  collide and one entry will be lost.
- **Ordering is by `changed_at`, not insertion order.** Devices disagree about arrival order; the
  UI sorts by `changed_at` and shows `changed_by_name` so the user can see who did what.
- **The envelope columns exist but are never contended.** `commitment_log` carries the full
  six-column set because it is class B, and §3.11 records the other four columns as `const`. That
  satisfies the uniformity rule without weakening append-only: `deleted_at` is permanently NULL, and
  `updated_at`/`version` are written once at insert. A field-level merge (§4.4) means no log row is
  ever superseded — the newer write is a *new* row, not an update to the old one. If a log row is
  genuinely wrong, the correction is another row. **The sync layer must therefore never emit an
  `update` op against this table, and no `DELETE` op at all.**
- **Retention:** unbounded, because it is the audit trail for commitment changes (`DATA §23`).
  [NEEDS DECISION] whether to cap it; the Postgres `audit_events` proposal was 2 years.

### 4.6 The remaining class-B tables

| Table | Rule |
|---|---|
| `owned_attire` | Local wins, whole row, LWW. One owner, one device in practice. Exception: `availability_status` / `committed_to_project_id` is **server wins** — commitment is a claim on a shared resource, and two projects committing the same wig must not both succeed. Conflict marks the row and tells the user which project holds it. |
| `attire_condition_photos` | Append-only by id, union. Wear history is additive (`DATA §15`). |
| `attire_usage_history` | Append-only by id, union. Feeds confidence (ML §31); must never be edited, only added to. |
| `projects`, `tasks`, `budget_line_items`, `project_milestones` | Local wins, LWW, except `status`. `status = 'completed'` is server-authoritative once any other device has observed a completion, because it feeds build history. `tasks.actual_completion_date` / `actual_time_spent_hours` are **max-wins on the value** for actuals (someone may log more accurate time later) but the first non-null completion date stands, because the completion date is a fact about when it happened. |
| `marketplace_registration` | Server wins, entirely. It gates marketplace access; a local state that differs from the server's is a conflict, never a merge. |
| `portfolio_photos` | Local wins for reordering (`display_order` — whole row, LWW is fine for one owner). Deletion is soft; a photo is never hard-deleted inside 30 days. |
| `notification_state` | Local wins, LWW. Mute flags are private. |
| `events` | Hybrid. Draft fields local wins LWW. `status` transitions are **server wins, forward-only**, and `cancelled` is terminal. Only a Head Organizer may write, and the role check is re-validated server-side. |
| `event_meetups` | Local wins LWW for the proposal fields. `withdraw` is server wins, one-way. |
| `meetup_rsvps` | **Unique index wins.** One row per (meetup, cosplayer). A second response replaces the first — a later RSVP is an answer to the same question, not a conflict. A cosplayer changing `going` to `declined` on a second device simply wins; that is the intent. |
| `invite_meetups`, `invite_meetup_participants` | Proposal local wins LWW. **Join/leave is server wins and requires online**, because the invite code is the sole access control and the participant count must be exact. Server-authoritative `invite_code`; the client never invents one. A leave is `left_at` + `deleted_at`, never a hard delete, so the count is auditable. |
| `contest_criteria` | Server wins. Organizer-defined tiers; a client cannot define a tier. |
| `contest_opt_ins` | `status` (opt-in/decline) local wins, LWW — it is the cosplayer's own consent and must work offline. **`assigned_tier_id` / `assigned_at` are class C, server wins**: a tier is never assigned by a client, because `OUT §36` forbids the AI finalising a tier without human confirmation, and the organizer outranks the device. |
| `event_staff_members` | `invite_status` is server wins and forward-only (`pending → accepted|declined → removed`). An invite is a capability grant; two devices accepting is not a conflict, it is a duplicate that the unique index absorbs. |
| `organizer_access_requests` | `justification` local wins while `status = 'pending'`. `status` and `reviewed_by_email` are **class C, server wins** — a Holder's decision, never made on a device. |
| `calendar_entries` | `status` is server wins, forward-only. A Head Organizer's approval is not something a staff member's offline device can grant. Draft fields local wins. |
| `ai_results` | **Append-only, never merged, never updated.** Two engines' results are different rows with different `engine` and `engine_version`, by design. Overriding a rating (CONCEPT §5) inserts a new result rather than editing the old one, so the override history is auditable. |

---

## 5. Migration plan — AsyncStorage to SQLite, in order

**Not started. Every step below is a proposal with a risk rating and a rollback.** Do not run any of
it until Phase 1 is approved.

Risk scale: **LOW** = reversible with the AsyncStorage keys untouched · **MED** = needs a backup
export first · **HIGH** = touches data that cannot be reconstructed from the app.

**The single safety property that makes this whole plan safe: AsyncStorage is never deleted in any
step.** Every step reads, transforms, writes to SQLite, and verifies. Only step M-12 removes
anything, and only after a verified row-count match on every table. Until then the AsyncStorage keys
remain the rollback.

| # | Step | Risk | Detail and rollback |
|---|---|---|---|
| **M-0** | Add `expo-sqlite`, add a `db.ts` that opens the database, sets `PRAGMA foreign_keys = ON` and `journal_mode = WAL`, and creates `schema_meta` + `migration_ledger` | **LOW** | Read-only at this point; no context is touched. `expo-sqlite` is an Expo Go module on both iOS and Android — verify in Expo Go before writing any of the rest, because everything depends on it. Rollback: remove the dependency. Needs your approval to add the package. |
| **M-1** | Import `users` + `session` + `user_consent` from `@forgemind:accounts`, `@forgemind:active_session`, `@forgemind:session_token`, `@forgemind:data_consent` | **MED** | **Normalise every email to lowercase first** (§1.2) or FKs point at nothing. Drop `body_size_slider` (Decision B) and `password_hash` stays `''` — it is already `''` at `AuthService.ts:189`. Read `user_id` and map to `users.id`. Back up all four keys to a JSON export file before running. Rollback: delete the three tables. |
| **M-2** | Import `characters`, `variants`, `components`, `variant_components`, `permitted_categories` from the bundled `src/data/*.json` **and** from `forgemind-ai/datasets/**.json` | **MED** | Two sources of truth that disagree (§7.1). Do not guess: if a character exists in both, prefer the app's `variants.json` for display fields and the dataset for `costume_requirements`, and record the merge in `migration_ledger.checksum`. Do **not** run the pipeline against `forgemind-ai` yet — its loader is broken (D-6). Rollback: drop the five tables. |
| **M-3** | **Create and import `projects`, `tasks`, `budget_line_items`, `project_milestones`** | **HIGH** | There is **no source data** — `ProjectsContext` was never persisted. This step is a schema-only creation, plus a one-time `useState` → SQLite write in the provider so state survives the next reload. Any project data a user has in memory at the moment of the upgrade is lost unless the provider flushes before switching over. **Write the flush first, then cut over.** The whole of IN-48…IN-56 depends on this. |
| **M-4** | Add the three deferred FKs from §3.7 | **LOW** | DDL only, after both sides exist. `PRAGMA foreign_key_check` must return zero rows. |
| **M-5** | Import `owned_attire`, `attire_condition_photos` | **MED** | **Partition by `user_id`** (open question Q-6). The 3 seed rows carry `user_id: 'demo-user-1'`, which is not a real account — either create a real `demo` user or park those rows under a dedicated seeded account. Do not silently attach them to whoever registers first. |
| **M-6** | Import `events`, `logistics_entries`, `logistics_field_versions`, `commitment_log`, `contest_criteria`, `contest_opt_ins` | **MED** | **Seed FK mismatches must be repaired, not preserved** (§5.1). Seed `logistics_field_versions` from each entry's own `updated_at` so the §4.4 merge has a baseline. `commitment_log` is append-only: copy verbatim, no dedupe, no id rewriting (§4.5). |
| **M-7** | Import `listings`, `offers`, `chat_threads`, `chat_messages`, `commission_milestones` | **MED** | **Seed `screening_result` is absent on 6 old rows** (acknowledged in `CHANGELOG.md:3578`). Default them to `'pending'`, **not** `'passed'` — the Postgres default is `'passed'`, which makes an unscreened listing indistinguishable from a clean one. That is a real hole; the local schema closes it. `chat_messages` has no page limit and the whole history is one blob — expect a large single import; use a transaction and a row-count assertion. |
| **M-8** | Import `diary_entries`, `portfolio_photos`, `calendar_entries`, `event_staff_members`, `organizer_access_requests`, `meetup_rsvps`, `invite_meetups`, `invite_meetup_participants`, `shown_notifications` | **MED** | Diary `project_id` is a dangling reference (no projects persisted) — keep it as a loose `TEXT`, do **not** add an FK, and do not drop the rows. `event_staff_members.staff_user_id` holds `user-${emailPrefix}` — resolve to an email, and where the prefix is ambiguous across accounts, mark the row for manual review rather than guessing. |
| **M-9** | Delete the 8 dead, broken, and legacy keys | **LOW** | 6 dead concrete keys (`@ForgeMind:Events`, `@ForgeMind:Projects`, `@forgemind_accounts`, `@forgemind_active_session`, `@forgemind_organizer_requests`, `@forgemind_users`) and 2 legacy keys (`@forgemind:logistics`, `@forgemind:current_user`). Export the two legacy ones to the JSON backup first — they are the only record of pre-rename data. Also fix `diagnostics.ts:14,33` so `clearAllData()` filters lowercase `@forgemind:`; today it is a guaranteed no-op, which is why stale test data could never be cleared. **Open question Q-7:** if any reviewer workflow depends on `DebugLogger`, that workflow is already broken and says nothing. |
| **M-10** | Switch each context from `AsyncStorage` to the SQLite repository, one context at a time, each with its own changelog entry | **HIGH** | **One context per change, never all at once.** The contexts are independent: `ProjectsContext` → `OwnedAttireContext` → `EventsContext` → `MarketplaceContext` → `ChatContext` → the rest. Each switch: read from SQLite, write to both SQLite and AsyncStorage for one release, so a rollback is a flag flip rather than a restore. Recommended shadow-write window: one release. |
| **M-11** | Create `event_participant_applications` | **BLOCKED** | **[NEEDS DECISION] Q-2.** `SCHEMA_RECONCILIATION.md:1972` asks "does this table exist at all?" and `:1224` says "do not migrate either table until ruled on". The DDL is held as a comment in §3.7 until answered. |
| **M-12** | Stop writing AsyncStorage; leave the keys in place for one release, then remove them | **LOW** *if* M-10 held | Precondition: every table's SQLite row count equals the `migration_ledger` import count, and `PRAGMA integrity_check` returns `ok`. **Do not delete an AsyncStorage key until both are true for the table it fed.** |
| **M-13** | Wire the outbox and first sync | **MED** | Outbox first, so nothing is written that cannot be pushed. Sync is **not** Phase 1; this is where it starts. |
| **M-14** | Add `ai_results` and the LocalEngine writes | **MED** | Phase 2. The table is created here so the two-engine rule has somewhere to record itself. |

### 5.1 Seed data FK mismatches that must be repaired during migration

These are broken **today**, independent of the migration. Each is a real data bug.

| Seed | Problem | Repair |
|---|---|---|
| `@forgemind:logistics_entries` seed, 5 rows, all `event_id: 'evt-manila-coscon'` | No such event. `@forgemind:events` uses `event-manila-coscon-2026`. | Remap to the real id, or drop the seed rows. Today `getEntriesByEvent` returns nothing for all 5. |
| `@forgemind:marketplace_listings` seed, 6 rows, `seller_email` = `demo-seller@forgemind.test`, `demo-crafter@…`, `demo-photographer@…` | Not real accounts. `getListingsBySeller` returns `[]` for every real user. | Create real seeded accounts, or set the seller to null and treat them as reference data. With the §3.5 FK, they cannot be inserted at all until an account exists. |
| `@forgemind:owned_attire` seed, 3 rows, `user_id: 'demo-user-1'` | Not a real account. | Same as above. |
| `OwnedAttireContext.tsx:60-66` | Loads stored items, then re-seeds whenever the array is empty — so a **legitimately empty inventory is re-seeded on every mount**. | Fix before M-5, or the migration imports phantom inventory on every launch. |
| `@forgemind:commitment_log` | `id` embeds the ISO timestamp. Fine, but the format must be preserved (§4.5). | Copy verbatim. |

---

## 6. SQLite-specific decisions

### 6.1 What flattening the nested JSON buys and costs

Six keys store a parent with a nested array. Five become real child tables here: `rsvps` →
`meetup_rsvps`, `participants` → `invite_meetup_participants`, `condition_photo_history` →
`attire_condition_photos`, `costume_requirements` → `variant_components`, and the composite
`@forgemind:contest` → `contest_criteria` + `contest_opt_ins`.

Cost: one extra join and one extra query per screen that previously did `arr.filter(...)` in memory.
At this data volume (a thesis-scale app, 6 characters, ~20 variants, single-digit users per device)
that is free. Benefit: `PRAGMA foreign_keys = ON` can actually enforce referential integrity, which
AsyncStorage cannot do at all, and the §4.4 per-field merge has a table to hang
`logistics_field_versions` off.

**Not flattened:** `chat_messages.message_text` (a body, not a relation), `photos` /
`photo_urls` (a URI list, never queried relationally), `keywords` (a tag list used for substring
matching, not a join). Those stay as `json_valid`-checked `TEXT`.

### 6.2 Snapshots removed

`offers` currently stores `listing_title`, `listing_price`, `listing_seller_email`,
`seller_display_name`, `proposer_display_name`, and `chat_threads` stores `listing_title`,
`seller_email`, `buyer_email` plus both display names. These are frozen at creation and **never
re-synced**, so they are stale by construction whenever a listing is edited.

The target schema drops the duplicated ones and joins instead. Display names that genuinely need to
survive a rename are kept where the spec requires it — `contest_opt_ins.cosplayer_display_name` and
`commitment_log.changed_by_name` are both explicitly "snapshot, survives account deletion" in the
current code, and that is preserved.

This is a behaviour change: a historical offer will now show the listing's **current** title rather
than the title at offer time. That is arguably more correct, but it is a change and it needs your
sign-off. **[NEEDS DECISION]**

### 6.3 Three things that must not go into a plain table

| Item | Problem | Recommendation |
|---|---|---|
| `session.token` | A bearer token in a table every query can reach. `expo-secure-store` is not installed. AsyncStorage is no better — the current token sits in unencrypted AsyncStorage and is read by exactly one function. | Add `expo-secure-store` (Expo Go module) and keep the token out of SQLite entirely. **Needs your approval to add the package.** Until then, keep it in `session` and treat the database as sensitive. |
| `payout_method_number` | An account number, labelled `MOCK FIELD` in the source. | Keep as `TEXT`, never log it, never put it in the outbox `payload` for a table the AI can read. Add a redaction rule in the sync serialiser. |
| `marketplace_registration.payout_method_number` | Same value, duplicated in a second table. | Normalise: one `user_payout_methods` table, referenced by both. **[NEEDS DECISION]** — if the intent is to delete the account, do not create the table at all. |

### 6.4 Gaps in the Postgres schema that SQLite closes

The backend schema has no optimistic concurrency and no soft delete, and both become requirements the
moment the mobile app syncs. Recorded here so the change is visible rather than silent:

| Gap | Evidence | Closed in the target schema |
|---|---|---|
| No `version` column on any of the 38 tables | grep for `version`/`revision`/`etag` in `forgemind-backend/` finds only comments | every class-B/C/D table |
| `updated_at` on 11 tables with no trigger to maintain it | `001`…`010`; no `CREATE TRIGGER` anywhere | the app sets it on every write |
| No `deleted_at` anywhere | migration 010's comment claims a soft-deactivate via `users.is_active`, and **there is no `is_active` column** | `deleted_at` on every syncable table |
| No outbox, no idempotency key | grep confirms | `outbox` |
| No `requireAuth` middleware at all | `forgemind-backend/src/auth/router.ts` — the only token read is logout; `expires_at` is never enforced | must be added before sync; **open question Q-5** |
| `withTransaction` exported but never called | `src/db.ts` | the outbox push is its first real caller |
| `listings.screening_result` defaults to `'passed'` | `007_*.js` | defaults to `'pending'` locally; server-authoritative at sync |

### 6.5 `gen_random_uuid()` and other type mappings

SQLite has no `gen_random_uuid()`. The target schema generates every id in application code via a
UUID v4 helper and stores it as `TEXT`. That is the requirement anyway — "id (client UUID)" — so no
SQLite function registration is needed and no server id is ever assumed.

| Postgres | SQLite | Note |
|---|---|---|
| `UUID` | `TEXT` | 36 chars, generated client-side |
| `TIMESTAMPTZ` | `TEXT` | ISO-8601 UTC, matches the app's existing encodings |
| `DATE` | `TEXT` | `YYYY-MM-DD` **local** — see the UTC+8 rule above |
| `TIME` | `TEXT` | `HH:MM` 24-hour |
| `JSONB` | `TEXT` + `CHECK (json_valid(...))` | normalised to child tables where queried (§6.1) |
| `NUMERIC(12,2)` | `INTEGER` minor units | **[NEEDS DECISION]** — avoids SQLite float comparison for money |
| `INET` | `TEXT` | not needed locally |
| `TEXT[]` | `TEXT` JSON array | `participant_types` only |
| `BOOLEAN` | `INTEGER` + `CHECK (col IN (0,1))` | SQLite's own `BOOLEAN` affinity is a NUMERIC that admits 2 |
| partial index `WHERE ...` | identical | SQLite 3.8.0+ supports these; all 13 port unchanged |
| `CREATE INDEX ... (a, b DESC)` | identical | the four `DESC` indexes port |
| `CHECK` cross-column rules | identical | all 7 port; the `price > 0` caveat applies once money is `INTEGER` |

---

## 7. Mapping tables the schema cannot express

Four places where two layers use different vocabularies for the same thing. Each needs an explicit
table. None can be a join.

### 7.1 Characters and variants: two sources of truth

| Source | Shape | Problem |
|---|---|---|
| `src/data/characters.json` + `variants.json` | app display data, bundled, offline-available | no `costume_requirements`, no `origin` tag confirmed, no difficulty |
| `forgemind-ai/datasets/cosplay_matches/**/*.json` | full component spec with colors and keywords | 6 characters, 1 with images, loader is broken (D-6), lives only on the PC |

`forgemind-ai` uses a different slug convention: `asta_black-bulls-uniform` (dataset) vs whatever
`variants.json` uses, and its own `character_images/README.md` documents hyphens while the folders on
disk use spaces. The loader must walk nested folders with a glob and resolve slugs, not build a flat
path. **[NEEDS DECISION]** which source is authoritative for a character present in both.

### 7.2 Defining features — the new-variant detection hook

`ML §27` and `OUT §35` need "a combination that matches a defining feature but no catalogued variant".
The dataset's `character_traits.distinctive_features` is a free-text array, dead in all 7 files, and
it is the only place a defining feature is recorded. Normalised into `variants.defining_feature`
(§3.2) so it is queryable. Populating it is Phase 2 work.

### 7.3 The two component taxonomies

| `components.component_type` (catalog) | `owned_attire.auto_categorized_type` (wardrobe) |
|---|---|
| wig, top, bottom, shoes, accessory, armor, weapon, prop, makeup, other | wig, clothing, footwear, accessory, armor, weapon, prop, fabric, material, other |

`top` + `bottom` + `shoes` + `makeup` on one side; `clothing` + `footwear` on the other. `fabric` and
`material` are on the wardrobe side with no catalog counterpart at all — the catalog has
`variant_components.typical_materials` for that, which is a different thing.

```sql
-- Class A. Reference data, ships with the app.
CREATE TABLE component_category_map (
  catalog_type  TEXT NOT NULL REFERENCES components(component_type),
  wardrobe_type TEXT NOT NULL,
  -- Direction: which way the mapping is safe to apply.
  direction     TEXT NOT NULL CHECK (direction IN ('exact','catalog_to_wardrobe','lossy')),
  PRIMARY KEY (catalog_type, wardrobe_type)
);
```

`direction` matters: `clothing` → `{top, bottom}` is a **fan-out** (one wardrobe item may satisfy
several catalog slots), and `{fabric, material}` has no mapping, which is a real gap — a cosplayer's
fabric stash can never satisfy a `top`. That gap is in the spec's favour (fabric is not a garment),
so it is left as `lossy` rather than papered over.

### 7.4 Permitted categories

`src/constants/marketplaceCategories.ts` is a code constant; `permitted_categories` is a table. The
table is authoritative per `PLAN P0` ("Decide the permitted-category list … refined later with real
listing data"), so the constant becomes a bundled seed for the class-A offline copy and the table
becomes the source of truth once synced. `listings.category_name` FKs to the table by **name**, not
by id, so a listing survives a category row being re-keyed.

### 7.5 Two different "difficulty"

`variants.difficulty_rating` is an `easy|medium|hard` string in the dataset;
`variants.build_difficulty_rating` is `INTEGER 1..5` in the Postgres schema. Both columns exist in
§3.2. A mapping is needed once, and it belongs in code with a test, not in a `CHECK` constraint.

---

## 8. What the backend must gain before any of this syncs

The sync plan assumes a server that can authenticate a caller and arbitrate. Neither exists.

| # | Gap | Evidence | Needed for |
|---|---|---|---|
| B-1 | **No auth middleware.** No route reads `sessions` to identify the caller; `expires_at` is never enforced; `last_accessed_at` is never updated | `forgemind-backend/src/auth/router.ts` | every class-B/C/D sync |
| B-2 | **No sync endpoint.** No push, no pull, no `version` negotiation, no outbox drain | grep for `outbox`/`version`/`conflict` returns nothing | M-13 |
| B-3 | **No listing-screener endpoint.** `src/index.ts` states it is deliberately not implemented | `forgemind-backend/src/index.ts` | IN-37, and §4.1's "server wins on screening" has no server to win |
| B-4 | **No match endpoint.** `forgemind-ai` is not called by anything | no client in `forgemind-backend/` | IN-18…IN-27, RemoteEngine |
| B-5 | **No permission checks.** `approveAccessRequest(requestId, holderId)` trusts the id; roles are stored and never read | `OrganizerService.ts:88,116` equivalent in the router | IN-3, IN-12 marketplace gating, D-12 |
| B-6 | **28 of 38 tables have no seed and no route.** Only `users` and `sessions` are ever written | `forgemind-backend/src/scripts/seed.ts` covers 10 tables; only `listings` and `owned_attire` are also in the seed list, and both are inserts the app never makes | M-13 |
| B-7 | **`withTransaction` is never called**, so the first-accept rule (§4.2) has no transaction to live in | `src/db.ts` | §4.2, §4.4 assignment |
| B-8 | **No soft delete**, so a `deleted_at` sync has nothing to acknowledge | no `deleted_at` column anywhere | §4.0 |
| B-9 | **No tests and no test runner** in the backend | no `test` script, no Jest/Vitest/node:test | the regression test Phase 2 item 4 needs a home |

The Phase 2 regression test for `attire_matcher.py` and `color_matcher.py` belongs in
`forgemind-ai/tests/` (which has a `.gitkeep` and nothing else) or in the mobile app, which also has
no test runner. **Open question:** where does the TS test suite live? There is no `jest` config, no
`vitest`, no `test` script in `forgemind-mobile/package.json` either. Adding one is a decision, not a
default.
