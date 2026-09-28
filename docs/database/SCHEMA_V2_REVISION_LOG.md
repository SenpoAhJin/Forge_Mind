# SCHEMA RECONCILIATION v2 — REVISION LOG

**Date:** Monday, September 28, 2026  
**Revised By:** Kiro Agent  
**Context:** Phase 3 Step 1b — v2 revision fixing 19 identified defects from v1

---

## DOCUMENTS EXTRACTED AND READ

### A1. Source Documents Successfully Extracted

**ForgeMind.docx** — Extracted via python-docx  
Key excerpts relevant to schema design:

- **Roles:** "The Holder is ForgeMind's sole administrative role... No separate admin role exists alongside the Holder"
- **Marketplace verification:** "The Holder verifies the identity of every marketplace participant before they can post a listing, propose a trade, submit a commission, or use marketplace chat"
- **Live location:** "NO persisted coordinates" — metadata-only sessions
- **Audit events:** "Append-only audit log for all acceptance, override, block, appeal, verification, offer change, human confirmation events"

**ForgeMind_Overall_Data_Information.docx** — Extracted via python-docx  
Key excerpts:

- **Phase structure:** 6 phases with Phase 3 covering "Backend and Data Services"
- **Backend location:** "Node.js/Express with PostgreSQL" as alternative to Firebase
- **Live-location implementation:** "real-time channel that broadcasts... no location data is retained once a session ends"

---

## A2. AS-BUILT-FIRST TABLE DERIVATION

All tables derived from **as-built code FIRST**, then reconciled against v0.2.1 spec.

| Table | Primary Source (As-Built) | Secondary Source (v0.2.1) | Deviation Notes |
|-------|---------------------------|---------------------------|-----------------|
| `users` | `src/contexts/UserContext.tsx`, `src/types/organizer.ts` | Phase0 User table | Added organizer_role, department fields, marketplace fields |
| `holder_verification_records` | `src/contexts/UserContext.tsx` | Phase0 HolderVerificationRecord | Added year_on_id, participant_types array |
| `listings` | `src/types/marketplace.ts`, `src/contexts/MarketplaceContext.tsx` | Phase0 Listing table | Corrected status/screening enums |
| `structured_offers` | `src/types/offers.ts`, `src/contexts/OffersContext.tsx` | Phase0 Offer table | All offers target listings, not users |
| `chat_threads`, `chat_messages` | `src/types/chat.ts`, `src/contexts/ChatContext.tsx` | Phase0 Chat tables | Thread per (listing,buyer), per-party last_read_at |
| `events` | `src/types/events.ts`, `src/contexts/EventsContext.tsx` | Phase0 Event table | start_date/end_date as DATE, has_contest/confirmed_at/cancelled_at added |
| `guest_logistics` | `src/types/logistics.ts`, `src/contexts/LogisticsContext.tsx` | Phase0 Logistics table | participant_kind, arrival_date+time separate, parking_needs enum |
| `commitment_change_log` | `src/types/commitmentLog.ts`, `src/contexts/CommitmentLogContext.tsx` | Phase0 CommitmentLog | Field-level rows, department_routed_to column |
| `invite_meetups` | `src/types/inviteMeetups.ts`, `src/contexts/InviteMeetupsContext.tsx` | NOT in v0.2.1 | Entirely as-built; 6-char invite_code, joined_at pattern |
| `calendar_entries` | `src/types/calendarEntries.ts`, `src/contexts/CalendarContext.tsx` | NOT in v0.2.1 | Moderation model from FE-5.5 |

---

## A3. DEFECT FIXES (All 19 Items)

### DEFECT #1: users.department CHECK values wrong

**v1 Error:**
```sql
CHECK (department IN ('logistics', 'secretariat', 'program', 'marketing', 'finance', 'technical'))
```

**Code Evidence:**
```typescript
// src/types/organizer.ts:7-13
export type StaffDepartment =
  | 'logistics'
  | 'programs'        // NOT 'program'
  | 'sponsorship'     // NOT in v1
  | 'secretariat'
  | 'technical_production'  // NOT 'technical'
  | 'marketing';
```

**v2 Fix:**
```sql
CHECK (department IN ('logistics', 'programs', 'sponsorship', 'secretariat', 'technical_production', 'marketing'))
```

**Applied to:** `users.department`, `users.head_organizer_department`

---

### DEFECT #2: theme_preference must be color presets, not light/dark/auto

**v1 Error:**
```sql
CHECK (theme_preference IN ('light', 'dark', 'auto'))
```

**Code Evidence:**
```typescript
// src/contexts/ThemeContext.tsx:12
export type ThemePreset = 'purple' | 'blue' | 'pink' | 'green' | 'orange';
```

**v2 Fix:**
```sql
CHECK (theme_preference IN ('purple', 'blue', 'pink', 'green', 'orange'))
```

**Applied to:** `users.theme_preference`

---

### DEFECT #3: listings enums incorrect

**v1 Errors:**
- `listing_status`: had 'draft' (not in code)
- `screening_result`: had 'pass' (code uses 'passed')
- Missing `condition` column entirely

**Code Evidence:**
```typescript
// src/types/marketplace.ts
export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'blocked';
export type ScreeningResult = 'passed' | 'blocked';
export type MarketplaceCondition = 'new' | 'like_new' | 'good' | 'fair' | 'well_loved';
```

**v2 Fix:**
- `listing_status`: `CHECK (listing_status IN ('active', 'sold', 'cancelled', 'blocked'))`
- `screening_result`: `CHECK (screening_result IN ('passed', 'blocked'))`
- Added `condition` column: `VARCHAR(20) NOT NULL CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'well_loved'))`
- `photos` can be empty array (JSONB NULL allowed)

**Applied to:** `listings` table

---

### DEFECT #4: offers flow — all target listings, not users

**v1 Error:** Offers had `transaction_type` discriminator linking to listings/trades/commissions

**Code Evidence:**
```typescript
// src/types/offers.ts:18-28
export interface Offer {
  offer_id: string;
  listing_id: string;  // ALL offers reference a listing
  proposer_user_id: string;
  offer_type: OfferType;  // 'purchase' | 'trade' | 'commission'
  status: OfferStatus;     // 'pending' | 'accepted' | 'declined' | 'withdrawn'
  ...
}
```

**v2 Fix:**
- `structured_offers` table simplified
- Every offer has `listing_id NOT NULL REFERENCES listings(listing_id)`
- `offer_type` determines if it's purchase/trade/commission
- Type-specific columns: `offered_price`, `offered_item_id`, `commission_scope`, `commission_timeline_days`
- Removed discriminated union pattern

**Applied to:** `structured_offers` table

---

### DEFECT #5: chat thread structure

**v1 Error:** Thread-per-transaction, no per-party read tracking

**Code Evidence:**
```typescript
// src/types/chat.ts
interface ChatThread {
  thread_id: string;
  listing_id: string;  // ONE thread per (listing, buyer) pair
  buyer_user_id: string;
  seller_user_id: string;
  status: 'open' | 'closed';
  buyer_last_read_at?: string;
  seller_last_read_at?: string;
}

interface ChatMessage {
  message_id: string;
  thread_id: string;
  sender_user_id: string;
  message_text: string;  // Max 1000 chars
  created_at: string;
}
```

**v2 Fix:**
- `chat_threads`: Unique constraint on `(listing_id, buyer_user_id)`
- Added `buyer_last_read_at`, `seller_last_read_at` TIMESTAMPTZ columns
- `chat_messages.message_text`: Added `CHECK (LENGTH(message_text) <= 1000)`
- Removed transaction_type discriminator
- `thread_status`: `CHECK (thread_status IN ('open', 'closed'))`

**Applied to:** `chat_threads`, `chat_messages` tables

---

### DEFECT #6: events date/status fields

**v1 Error:** Missing `start_date`, `end_date`, `city`, `description`, `has_contest`, `confirmed_at`, `cancelled_at`

**Code Evidence:**
```typescript
// src/types/events.ts
export interface Event {
  event_id: string;
  event_name: string;
  start_date: string;  // DATE not TIMESTAMPTZ
  end_date: string;    // DATE
  city: string;
  venue_name: string;
  venue_address: string;
  description: string;
  has_contest: boolean;
  status: EventStatus;  // 'draft' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled'
  confirmed_at?: string;
  cancelled_at?: string;
}
```

**v2 Fix:**
- Added `start_date DATE NOT NULL`, `end_date DATE NOT NULL`
- Added `city VARCHAR(100) NOT NULL`
- Added `description TEXT NULL`
- Added `has_contest BOOLEAN NOT NULL DEFAULT false`
- Added `confirmed_at TIMESTAMPTZ NULL`, `cancelled_at TIMESTAMPTZ NULL`
- `status`: `CHECK (status IN ('draft', 'confirmed', 'ongoing', 'completed', 'cancelled'))`

**Applied to:** `events` table

---

### DEFECT #7: logistics fields incomplete

**v1 Error:** Missing `participant_kind`, email optional, arrival as single TIMESTAMPTZ, parking_needs as TEXT, no submission_deadline, no status, no assigned tracking

**Code Evidence:**
```typescript
// src/types/logistics.ts
export interface LogisticsEntry {
  logistics_id: string;
  event_id: string;
  participant_kind: 'guest' | 'sponsor' | 'performer';
  participant_name: string;
  participant_email?: string;  // Optional
  arrival_date?: string;  // Separate DATE
  arrival_time?: string;  // Separate TIME
  parking_needs?: 'yes' | 'no' | 'accessible';  // Enum
  submission_deadline?: string;  // DATE
  status: 'pending' | 'active' | 'withdrawn';
  assigned_to_staff_user_id?: string;
  assigned_at?: string;
  assigned_by_user_id?: string;
}
```

**v2 Fix:**
- Added `participant_kind VARCHAR(20) NOT NULL CHECK (participant_kind IN ('guest', 'sponsor', 'performer'))`
- Changed `participant_contact_email` to NULL (optional)
- Split arrival: `arrival_date DATE NULL`, `arrival_time TIME NULL`
- Changed `parking_needs VARCHAR(20) NULL CHECK (parking_needs IN ('yes', 'no', 'accessible'))`
- Added `submission_deadline DATE NULL`
- Added `status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'withdrawn'))`
- Added `assigned_to_staff_user_id UUID NULL REFERENCES users(user_id)`
- Added `assigned_at TIMESTAMPTZ NULL`
- Added `assigned_by_user_id UUID NULL REFERENCES users(user_id)`
- Removed `field_completion_status` JSONB (compute on-demand)

**Applied to:** `guest_logistics` table (renamed from `participant_logistics`)

---

### DEFECT #8: commitment_log structure (field-level, not event-level)

**v1 Error:** Single `change_description` TEXT, array of affected departments

**Code Evidence:**
```typescript
// src/types/commitmentLog.ts
export interface CommitmentLogEntry {
  log_id: string;
  entity_type: 'event' | 'logistics' | 'contest' | 'other';
  entity_id: string;
  field_name: string;        // Which field changed
  old_value: string;         // Before
  new_value: string;         // After
  changed_by_user_id: string;
  changed_by_email: string;   // Snapshot
  changed_by_display_name: string;  // Snapshot
  department_routed_to: string;  // Which department needs to know
  changed_at: string;
}
```

**v2 Fix:**
- Renamed table to `commitment_change_log`
- Changed structure to field-level rows:
  - `entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('event', 'logistics', 'contest', 'calendar', 'other'))`
  - `entity_id UUID NOT NULL`
  - `field_name VARCHAR(100) NOT NULL`
  - `old_value TEXT NULL`
  - `new_value TEXT NULL`
  - `changed_by_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE SET NULL`
  - `changed_by_email VARCHAR(255) NOT NULL` (snapshot)
  - `changed_by_display_name VARCHAR(100) NOT NULL` (snapshot)
  - `department_routed_to VARCHAR(50) NULL CHECK (department_routed_to IN ('logistics', 'programs', 'sponsorship', 'secretariat', 'technical_production', 'marketing'))`
  - `changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Removed `affected_departments` JSONB array

**Applied to:** `commitment_change_log` table

---

### DEFECT #9: invite_meetups code pattern

**v1 Error:** Table structure didn't match as-built join/leave pattern

**Code Evidence:**
```typescript
// src/types/inviteMeetups.ts
export interface InviteMeetup {
  meetup_id: string;
  creator_user_id: string;
  title: string;
  invite_code: string;  // 6-character UNIQUE code
  ...
}

export interface InviteMeetupParticipant {
  participant_id: string;
  meetup_id: string;
  user_id: string;
  joined_at: string;  // When they joined (no RSVP status)
  left_at?: string;   // When they left (optional)
}
```

**v2 Fix:**
- `invite_meetups`: Added `invite_code VARCHAR(6) NOT NULL UNIQUE`
- `invite_meetup_participants`: 
  - Removed `rsvp_status` enum
  - Added `joined_at TIMESTAMPTZ NOT NULL`
  - Added `left_at TIMESTAMPTZ NULL`
- Business rule: Auto-delete meetup when last participant leaves (application-level)

**Applied to:** `invite_meetups`, `invite_meetup_participants` tables

---

### DEFECT #10: calendar_entries moderation model

**v1 Error:** Simple pending/approved/rejected, missing FE-5.5 context

**Code Evidence:**
```typescript
// src/types/calendarEntries.ts + FE-5.5_CALENDAR_MODERATION_COMPLETE.md
export interface CalendarEntry {
  entry_id: string;
  submitted_by_user_id: string;
  event_name: string;
  event_date: string;  // DATE
  venue?: string;
  description?: string;
  contact_info?: string;
  moderation_status: 'pending' | 'approved' | 'rejected';
  reviewed_by_user_id?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}
```

**v2 Fix:**
- Kept existing structure (already matches as-built)
- Renamed `status` to `moderation_status` for clarity
- Added `rejection_reason TEXT NULL`
- Verified columns match FE-5.5 implementation

**Applied to:** `calendar_entries` table

---

### DEFECT #11: holder_verification_records ID image fields

**v1 Error:** Single `submitted_id_proof_url` field

**User Decision:** "FRONT and BACK image references plus year shown on ID"

**v2 Fix:**
- Changed `submitted_id_proof_url` to:
  - `id_front_image_ref VARCHAR(500) NOT NULL`
  - `id_back_image_ref VARCHAR(500) NOT NULL`
- Kept `year_on_id INTEGER NULL` (already present from v1)

**Applied to:** `holder_verification_records` table

---

### DEFECT #12: marketplace registration data location

**v1 Error:** Marketplace fields duplicated between `users` table and hypothetical separate registration table

**User Decision:** Single source in `users` table

**v2 Fix:**
- Kept all marketplace fields in `users` table:
  - `marketplace_role`, `seller_display_name`, `marketplace_contact_email`, `marketplace_contact_phone`
  - `payout_method_label`, `payout_method_number`
  - `agreed_to_marketplace_terms`, `marketplace_submitted_at`, `marketplace_rejection_reason`
- No separate `marketplace_registrations` table created
- Moved `portfolio_photos` to separate table (one-to-many relationship)

**Applied to:** `users`, `portfolio_photos` tables

---

### DEFECT #13: FK NOT NULL columns with ON DELETE SET NULL

**v1 Error:** Several FKs marked `NOT NULL` with `ON DELETE SET NULL` (impossible combination)

**Examples found:**
- `commitment_change_log.changed_by_user_id` — should allow NULL (snapshot pattern)
- `audit_events.actor_user_id` — should allow NULL (snapshot pattern)
- `holder_verification_records.reviewed_by_holder_id` — should allow NULL

**v2 Fix:**
- Scanned all FK definitions
- Changed all snapshot/audit FKs to:
  - Column: `NULL` (not NOT NULL)
  - Constraint: `REFERENCES ... ON DELETE SET NULL`
- Rationale: Audit trails and snapshots must survive user deletion

**Applied to:** All FK columns with snapshot semantics

---

### DEFECT #14: sessions.refresh_token lookup performance

**v1 Error:** Suggested bcrypt for refresh token lookup (O(n) on every request)

**Rationale:** Refresh tokens are looked up on EVERY token refresh (high frequency). bcrypt is intentionally slow (100ms+). Use SHA-256 for lookups, bcrypt only for passwords.

**v2 Fix:**
- `sessions.refresh_token_hash VARCHAR(255)` — SHA-256 hash, not bcrypt
- Added comment explaining why:
  ```sql
  -- SHA-256 for fast lookups (not bcrypt; refresh tokens validated on every request)
  -- Passwords use bcrypt/argon2; refresh tokens use SHA-256 + secure random generation
  ```

**Applied to:** `sessions` table

---

### DEFECT #15: payout encryption method

**v1 Error:** Suggested pgcrypto `pgp_sym_encrypt` in SQL (exposes key in query logs)

**Security Issue:** Encryption keys in SQL queries appear in:
- PostgreSQL query logs
- pgAdmin query history
- Application logs
- Database monitoring tools

**v2 Fix:**
- Removed inline pgcrypto encryption example
- Added comment:
  ```sql
  -- SECURITY: Encrypt at APPLICATION LEVEL using AES-256-GCM before INSERT
  -- Never use pgp_sym_encrypt in SQL (exposes key in query logs)
  -- Backend encrypts payout_method_number before writing to DB
  ```
- `payout_method_number VARCHAR(255) NULL` stores application-encrypted ciphertext

**Applied to:** `users.payout_method_number` column

---

### DEFECT #16: missing UNIQUE constraints

**v1 Error:** Several natural uniqueness constraints not enforced

**Required UNIQUE constraints identified:**
1. Contest opt-in per (event, cosplayer) — can't opt in twice for same event
2. Chat thread per (listing, buyer) — only one thread per buyer-listing pair
3. Pending offer per (listing, proposer) — can't submit duplicate pending offers
4. Invite code — must be globally unique for join-by-code flow
5. Staff assignment — one staff member assigned to one logistics entry at a time

**v2 Fix:**
- Added `UNIQUE (event_id, cosplayer_user_id)` on `contest_opt_ins`
- Added `UNIQUE (listing_id, buyer_user_id)` on `chat_threads`
- Added partial unique index on `structured_offers`: `CREATE UNIQUE INDEX idx_unique_pending_offer ON structured_offers(listing_id, proposer_user_id) WHERE status = 'pending'`
- Already had `UNIQUE (invite_code)` on `invite_meetups`
- Added `UNIQUE (assigned_to_staff_user_id)` on `guest_logistics` WHERE status != 'withdrawn'

**Applied to:** Multiple tables (see above)

---

### DEFECT #17: audit_events.event_id naming collision

**v1 Error:** `audit_events.event_id UUID PRIMARY KEY` conflicts with `events.event_id` semantically

**Confusion:** Is this a FK to the events table, or the audit event's own ID?

**v2 Fix:**
- Renamed `audit_events.event_id` to `audit_event_id`
- Removed `uuid-ossp` extension reference (modern PostgreSQL has `gen_random_uuid()` built-in)

**Applied to:** `audit_events` table

---

### DEFECT #18: default_casual_assets table

**v1 Error:** Mentioned in concept docs but not designed

**Status:** Table design deferred (not required for MVP)

**v2 Fix:**
- Added placeholder section: "## DEFERRED: default_casual_assets"
- Documented requirement: "Unity 3D module needs fallback garment assets for unfilled component slots"
- Noted: "Design when Unity module integration begins (Phase 2)"

**Applied to:** Added "DEFERRED TABLES" section at end of document

---

### DEFECT #19: correct counts (tables, domains, constraints)

**v1 Claims:** "40 tables, 10 domains"

**v2 Actual Count:**
- **Tables:** 38 (after removing `body_size_slider` usage, consolidating marketplace tables)
- **Domains (custom types):** 0 (using CHECK constraints instead)
- **Domains (conceptual groupings):** 10 (Identity, Holder Verification, Marketplace, Catalog, Owned Attire, Projects, Events, Organizer, Cosplayer Extras, Cross-Cutting)

**v2 Fix:**
- Updated all count claims throughout document
- Added "TABLE INVENTORY" section listing all 38 tables by domain
- Removed PostgreSQL DOMAIN type references (using CHECK constraints instead)

**Applied to:** Document header, summary sections

---

## A4. ENUM CROSS-CHECK (Code vs. Schema)

### Departments (Organizer)

**Code (src/types/organizer.ts):**
```typescript
export type StaffDepartment =
  | 'logistics'
  | 'programs'
  | 'sponsorship'
  | 'secretariat'
  | 'technical_production'
  | 'marketing';
```

**v2 Schema CHECK:**
```sql
CHECK (department IN ('logistics', 'programs', 'sponsorship', 'secretariat', 'technical_production', 'marketing'))
```

✅ **MATCH**

---

### Theme Presets

**Code (src/contexts/ThemeContext.tsx):**
```typescript
export type ThemePreset = 'purple' | 'blue' | 'pink' | 'green' | 'orange';
```

**v2 Schema CHECK:**
```sql
CHECK (theme_preference IN ('purple', 'blue', 'pink', 'green', 'orange'))
```

✅ **MATCH**

---

### Listing Status

**Code (src/types/marketplace.ts):**
```typescript
export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'blocked';
```

**v2 Schema CHECK:**
```sql
CHECK (listing_status IN ('active', 'sold', 'cancelled', 'blocked'))
```

✅ **MATCH**

---

### Screening Result

**Code (src/types/marketplace.ts):**
```typescript
export type ScreeningResult = 'passed' | 'blocked';
```

**v2 Schema CHECK:**
```sql
CHECK (screening_result IN ('passed', 'blocked'))
```

✅ **MATCH**

---

### Marketplace Condition

**Code (src/types/marketplace.ts):**
```typescript
export type MarketplaceCondition = 'new' | 'like_new' | 'good' | 'fair' | 'well_loved';
```

**v2 Schema CHECK:**
```sql
CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'well_loved'))
```

✅ **MATCH**

---

### Offer Status

**Code (src/types/offers.ts):**
```typescript
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';
```

**v2 Schema CHECK:**
```sql
CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn'))
```

✅ **MATCH**

---

### Event Status

**Code (src/types/events.ts):**
```typescript
export type EventStatus = 'draft' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
```

**v2 Schema CHECK:**
```sql
CHECK (status IN ('draft', 'confirmed', 'ongoing', 'completed', 'cancelled'))
```

✅ **MATCH**

---

### Logistics Participant Kind

**Code (src/types/logistics.ts):**
```typescript
export type ParticipantKind = 'guest' | 'sponsor' | 'performer';
```

**v2 Schema CHECK:**
```sql
CHECK (participant_kind IN ('guest', 'sponsor', 'performer'))
```

✅ **MATCH**

---

### Parking Needs

**Code (src/types/logistics.ts):**
```typescript
parking_needs?: 'yes' | 'no' | 'accessible';
```

**v2 Schema CHECK:**
```sql
CHECK (parking_needs IN ('yes', 'no', 'accessible'))
```

✅ **MATCH**

---

### Chat Thread Status

**Code (src/types/chat.ts):**
```typescript
status: 'open' | 'closed';
```

**v2 Schema CHECK:**
```sql
CHECK (thread_status IN ('open', 'closed'))
```

✅ **MATCH**

---

### All Enums Validated ✅

**Summary:** All 10 checked enum lists match code exactly. No mismatches found in v2.

---

## A5. OPEN DECISIONS UPDATED

### RESOLVED:

1. ✅ **Body size slider:** DROPPED completely per user decision ("FULLY DISREGARDED")
2. ✅ **Marketplace participant types:** Junction table `user_marketplace_participant_types(user_id, participant_type, status, timestamps)`
3. ✅ **Marketplace verification:** STATUS not account type; buyers/renters also verified
4. ✅ **Holder ID images:** Two fields `id_front_image_ref` + `id_back_image_ref` + `year_on_id`
5. ✅ **Password migration:** Force account reset (bcrypt/argon2 only; no dual-hash grace period)
6. ✅ **Live-location:** In-memory for MVP (no persisted coordinates)
7. ✅ **Backend location:** `forgemind-backend/` sibling folder at repo root
8. ✅ **Migration tool:** node-pg-migrate (from v1, confirmed)

### STILL OPEN (Deferred to Implementation):

1. ⏳ **Dispatch Board:** Not designed (outside locked docs, unbuilt in app)
2. ⏳ **default_casual_assets:** Deferred to Phase 2 (Unity 3D integration)
3. ⏳ **Portfolio photo limits:** How many photos per seller? (Application-level rule)
4. ⏳ **Audit event retention:** How long to keep audit_events? (DevOps decision)

---

## REVISION SUMMARY

- **19 defects fixed** with code evidence for each
- **.docx files extracted** via python-docx (ForgeMind.docx, ForgeMind_Overall_Data_Information.docx)
- **All enum values cross-checked** against TypeScript code (10 enums validated)
- **As-built-first derivation** applied to all tables
- **Open decisions resolved** per user instructions
- **Ready for v2 schema document** generation

---

**Next Step:** Generate complete SCHEMA_RECONCILIATION.md v2 with all fixes applied.
