# G1 System State Audit Plan

**READ-ONLY EVIDENCE-BACKED AUDIT**

This plan guides a comprehensive, read-only audit of three repositories (forgemind-mobile, forgemind-backend, forgemind-ai) to produce an accurate, current, evidence-backed report of everything built. The audit produces three deliverables and follows strict READ-ONLY constraints.

---

## REPOSITORY PATHS

- **Mobile**: `C:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-mobile`
- **Backend**: `C:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-backend`
- **AI**: `C:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\forgemind-ai`

---

## HARD RULES (RESTATE IN EVERY EVIDENCE BRANCH)

1. **READ-ONLY**: No writes to source/config/migrations/data. Only writes allowed:
   - `<mobile>/docs/reports/SYSTEM_STATE_REPORT.md`
   - `<mobile>/docs/reports/OWNER_TEST_CONFIRMATIONS.md`
   - `<mobile>/docs/changes/G1_CHANGELOG.md`
   - Intermediate files under `<mobile>/docs/reports/.agents/g1/`

2. **NO MODIFICATIONS**: No migrations run, no DB writes/deletes, no `npm install` of new deps, no git push, no bug fixes. Report only.

3. **NO MISSING DEPS**: If a tool/dependency isn't installed locally, mark [UNKNOWN], do not install it.

4. **NEVER PRINT SECRETS**: .env values, passwords, keys, tokens, hashes, DB_PASSWORD, ID image paths. Show variable NAMES only; mask values.

5. **EVIDENCE TAGS** (every claim must carry one):
   - `[CODE]` - read in source file, cite file:line
   - `[RAN]` - executed command, show command + exit code + 1-line result
   - `[DB]` - read-only query (SELECT/information_schema only), show query
   - `[DOC-ONLY]` - stated in docs/changelog NOT confirmed in code (mark and list in section 12)
   - `[UNKNOWN]` - could not determine

6. **DOCS ARE LEADS, NOT PROOF**: Do NOT copy claims from CHANGELOG.md, AI_PROGRESS.md, FEATURE_AUDIT.md, SYSTEM docs without checking code.

7. **RUNTIME LABELS**: Never write "NOT TESTED". Write "NOT RUN BY AGENT (owner tests manually)". Never claim a screen/feature "works" without [RAN] proof — write "code exists + compiles" instead.

8. **DO NOT START SERVERS**: Check ports read-only. Leave ports 3000/5000/8081 as found. If DB creds missing, mark [UNKNOWN].

---

## DELIVERABLES

1. **SYSTEM_STATE_REPORT.md** - 15 sections covering architecture, persistence, backend, database, AI, mobile app, 3D pipeline, spec alignment, tests, docs, discrepancies, assistant-readiness, risks, owner checklist
2. **OWNER_TEST_CONFIRMATIONS.md** - Table of user-facing features/screens with blank test columns for owner to fill
3. **G1_CHANGELOG.md** - Summary of what was audited, findings, and evidence

---

## SECTION-BY-SECTION AUDIT PLAN

### SECTION 0: HEADER
**Branch**: mobile

**What to collect**:
- Date/time of audit
- Per-repo: git branch, HEAD short hash, clean/dirty status, last 15 commits (hash + subject)
- Tool versions: node, python, npm
- Package versions: expo, react-native, react-navigation, three, express, pg, flask, scikit-learn

**Files to read**:
- `<mobile>/package.json`
- `<backend>/package.json`
- `<ai>/requirements.txt`

**Commands to run** [RAN]:
```powershell
# Git status per repo
git -C "<mobile>" rev-parse --abbrev-ref HEAD
git -C "<mobile>" rev-parse --short HEAD
git -C "<mobile>" status --porcelain
git -C "<mobile>" log --oneline -15

git -C "<backend>" rev-parse --abbrev-ref HEAD
git -C "<backend>" rev-parse --short HEAD
git -C "<backend>" status --porcelain
git -C "<backend>" log --oneline -15

git -C "<ai>" rev-parse --abbrev-ref HEAD
git -C "<ai>" rev-parse --short HEAD
git -C "<ai>" status --porcelain
git -C "<ai>" log --oneline -15

# Tool versions
node --version
npm --version
python --version
```

**Output format**: Markdown table with date, repo paths, git state, versions

---

### SECTION 1: ONE-PAGE SUMMARY
**Branch**: assembly (written LAST after all other sections)

**What to collect**:
- Total counts: screens, navigators, routes, tables, migrations applied vs files, tests/scripts, mock-data modules
- Top 10 facts owner must know
- Top 10 risks by severity
- High-level verdict

**Sources**: Aggregate from all other sections

**Output format**: Bulleted lists, counts table, verdict paragraph

---

### SECTION 2: ARCHITECTURE + NETWORK
**Branch**: mobile + backend

**What to collect**:
- System layers, ports, call chain (phone → backend → Flask)
- `src/config/api.ts` API_BASE_URL resolution order
- Env var NAMES used (EXPO_PUBLIC_API_URL, DB_HOST, DB_USER, DB_NAME, CORS_ORIGINS, FLASK_AI_URL, etc.) — NEVER print values
- Tailscale vs Cloudflare tunnel: which doc says which, what code supports each
- CORS config: allowed origins pattern
- HTTP vs HTTPS
- Listening sockets [RAN] read-only
- Is Postgres bound to all interfaces?

**Files to read** [CODE]:
- `<mobile>/src/config/api.ts` (full file)
- `<mobile>/src/config/apiBaseUrl.ts`
- `<backend>/src/index.ts` (CORS setup, port binding lines 14-61, 250-270)
- `<backend>/src/config.ts` (env var reading)
- `<mobile>/app.json` (scheme, plugins, permissions)
- `<backend>/.env.example` or similar (var NAMES only)
- Docs mentioning Tailscale/Cloudflare: `<mobile>/REMOTE_TESTING_SETUP.md`, `<mobile>/HOW_TO_TEST.md`

**Commands to run** [RAN]:
```powershell
# Listening sockets (read-only)
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3000,5000,8081 } | Select-Object LocalAddress, LocalPort, State

# Alternative if above fails
netstat -an | Select-String "3000|5000|8081" | Select-String "LISTENING"
```

**DB queries** [DB]: None for this section

**Output format**: Prose + bulleted list + code snippets for resolution order + network diagram (text)

---

### SECTION 3: PERSISTENCE MATRIX
**Branch**: mobile + backend + db

**What to collect**: One row per entity with columns:
- Entity name
- Source of truth NOW (Postgres / AsyncStorage / useState / JSON mock)
- Table name (if Postgres)
- API route(s) accessing it
- Mobile reads from (API / AsyncStorage / useState)
- Mobile writes to (API / AsyncStorage / local only)
- Per-account isolated? (yes/no/how)
- Survives reload? (yes/no)
- Survives logout/login other user? (yes/no)
- Evidence tag

**Entities to cover**:
users, accounts, sessions, organizer roles/departments, seller verification, characters, variants, projects, tasks, budget items, milestones, readiness, owned attire, inventory/materials, build history, diary, portfolio, shareable card, meetups, events, commitment log, logistics entries, staff assignment, contest tiers/opt-in/history, marketplace listings, photos, offers, chat threads, chat messages, appeals, notifications, themes/appearance, consent flags

**List every AsyncStorage key** (`@forgemind:*`) with owner screen/context and per-user keying.

**Flag**: Any place two accounts on one device can see each other's data.

**Files to read** [CODE]:
- `<mobile>/src/contexts/*.tsx` (UserContext, ProjectContext, etc.) — grep for `AsyncStorage`, `@forgemind:`
- `<mobile>/src/services/*.ts` (API clients, persistence)
- `<mobile>/src/screens/**/*.tsx` (grep for AsyncStorage usage)
- `<backend>/migrations/*.js` (all 20 files: table definitions, columns, constraints)
- `<backend>/src/**/*.ts` (route handlers accessing each table)

**Commands to run** [RAN]:
```powershell
# Find all AsyncStorage keys in mobile
grep -r "@forgemind:" "<mobile>/src" --include="*.ts" --include="*.tsx"

# Count AsyncStorage references
grep -r "AsyncStorage\." "<mobile>/src" --include="*.ts" --include="*.tsx" | Measure-Object | Select-Object -ExpandProperty Count
```

**DB queries** [DB]:
```sql
-- List all tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Per table: columns, PKs, FKs (example for 'users' table)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

**Output format**: Large markdown table (entities × columns), plus separate AsyncStorage key list

---

### SECTION 4: BACKEND
**Branch**: backend + db

**What to collect**:

**A. Full route inventory**:
Read every router file + mount order in `src/index.ts`. For each route:
- Method (GET/POST/PUT/DELETE)
- Path
- Auth middleware (requireSession, requireRole)
- Role gate (cosplayer, organizer, staff, head, holder)
- Validation (body schema)
- Tables touched (read/write)
- File:line

Count total routes. Mark routes called by mobile vs unused. Mark routes mobile calls that 404 (mobile expects but backend doesn't have).

**Explicit checks**: Appeals routes, events routes, contests routes, logistics routes, chat routes (7 expected), offers routes, verification routes, staff routes, meetup routes — do they exist?

**B. Auth**:
- Register/login/logout endpoints
- Hashing (bcryptjs usage)
- Session token handling (cookie/header, expiry)
- requireSession coverage: list every route WITHOUT it and say if intended

**C. Role enforcement**: Server-side or UI-only? Per protected route.

**D. Plain-text password audit**: Search ALL code paths for any place a password is stored/sent/logged unhashed:
- Onboarding leftovers
- StaffRegistration / HeadOrganizerRegistration screens
- AsyncStorage accounts
- Seed scripts
- Logs
Report exact file:line or "none found". NEVER print any password value.

**E. Security scan**:
- Input validation (express-validator, zod, manual checks)
- Upload handling (file type/size limits, multer config)
- Error responses leaking internals (stack traces in JSON)
- Rate limiting (middleware)
- Logging of sensitive data (grep logs for password/token/hash)
Findings by severity: Critical / High / Medium / Low / Info with evidence.

**F. Migrations**:
- List migration files vs applied (read-only query of migrations table)
- Migration 021 status (does file exist? doc says planned deletion)
- Drift between migrations and live schema

**G. Moderation/screener**:
- Version, rules file, term count, thresholds
- Whether trained classifier is loaded anywhere
- Test results [RAN] the tests; report real pass/fail counts and WHY each failure fails
- Resolve doc conflict: "fixtures expect ordinary listings blocked" vs "fixture file missing"

**H. Chat**:
- Word filter (chat_curated_terms_kept.txt)
- Thread rules (buyer-starts)
- Closing rules (listing removed / offer finalized)
- Polling vs push
- Unread count
- Grep all AI/matcher/assistant code for chat table access [CODE]
- Confirm no AI path touches chat content

**I. Audit log**: What events are logged, table name, who writes.

**Files to read** [CODE]:
- `<backend>/src/index.ts` (router mount order lines 115-150)
- `<backend>/src/auth/router.ts` (auth endpoints)
- `<backend>/src/users/router.ts`
- `<backend>/src/calendar/router.ts`
- `<backend>/src/marketplace/router.ts` (registration, listings)
- `<backend>/src/marketplace/listingsRouter.ts` (if separate)
- `<backend>/src/marketplace/photosRouter.ts`
- `<backend>/src/marketplace/offersRouter.ts`
- `<backend>/src/marketplace/chatRouter.ts` (7 routes expected)
- `<backend>/src/ai/matcherRouter.ts`
- `<backend>/src/auth/requireSession.ts` (middleware logic)
- `<backend>/src/auth/requireRole.ts` (role gating)
- `<backend>/src/marketplace/screener.ts` (moderation rules)
- `<backend>/src/marketplace/chatModeration.ts` (chat filter)
- `<backend>/src/marketplace/chatBlocklist.ts`
- `<backend>/scripts/data/chat_curated_terms_kept.txt` (term count)
- `<backend>/scripts/test_check_listing.ts` (screener tests)
- `<backend>/scripts/measure-screener.ts`
- `<backend>/migrations/*.js` (all 20 files)
- Grep: `password` in all src/ and scripts/ (plain-text audit)
- Grep: `chat_threads`, `chat_messages` in `<backend>/src/ai/**/*.ts` and `<ai>/src/*.py`

**Commands to run** [RAN]:
```powershell
# Count routes
grep -r "router\.(get|post|put|delete)" "<backend>/src" --include="*.ts" | Measure-Object | Select-Object -ExpandProperty Count

# Plain-text password grep (NEVER print values, only file:line)
grep -rn "password.*:" "<backend>/src" --include="*.ts" | Select-String -NotMatch "DB_PASSWORD|password_hash|hashed"

grep -rn "password" "<mobile>/src/screens/onboarding" --include="*.tsx"
grep -rn "password" "<mobile>/src/screens/dev" --include="*.tsx"

# Chat table access in AI code
grep -rn "chat_threads\|chat_messages" "<backend>/src/ai" --include="*.ts"
grep -rn "chat_threads\|chat_messages" "<ai>/src" --include="*.py"

# Run screener tests (safe, read-only)
cd "<backend>"
npm run test:moderation
# OR
npx ts-node scripts/test_check_listing.ts

# Migration status
cd "<backend>"
npm run migrate:status
```

**DB queries** [DB]:
```sql
-- List applied migrations
SELECT * FROM pgmigrations ORDER BY run_on;

-- Count migrations applied vs files
SELECT COUNT(*) FROM pgmigrations;

-- Check for body_size column (slider audit)
SELECT column_name FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'body_size';

-- Audit log table (if exists)
SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%audit%' OR table_name LIKE '%log%';
```

**Output format**: Large section with subsections A-I, markdown tables for routes, findings lists by severity

---

### SECTION 5: DATABASE (read-only)
**Branch**: backend + db

**What to collect**:
- Table list by area (identity, verification, catalog, marketplace, projects, events, organizer, extras), columns, PK/FK, constraints, row counts
- Compare to doc claim "38 tables"
- Compare to planned SQLite 46 tables (list differences only)
- Does `characters.body_size` column exist?
- Does `body_size_slider` exist anywhere in DB/API/types/QR payloads/privacy text? List remaining slider traces file:line
- Seed/sample data counts
- ID image storage location (path only, no content) + access control

**Files to read** [CODE]:
- `<backend>/migrations/*.js` (all 20 files for table definitions)
- `<backend>/src/scripts/seed.ts` (if exists)
- Grep: `body_size` in `<backend>/src/**/*.ts`, `<mobile>/src/**/*.ts`, `<mobile>/src/**/*.tsx`

**Commands to run** [RAN]:
```powershell
# Grep body_size references
grep -rn "body_size" "<backend>/src" --include="*.ts"
grep -rn "body_size" "<mobile>/src" --include="*.ts" --include="*.tsx"
```

**DB queries** [DB]:
```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- List all tables with row counts (read-only, safe)
SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) AS column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Per table row count (example for 'users')
SELECT COUNT(*) FROM users;

-- FK constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- Check for body_size column
SELECT table_name, column_name FROM information_schema.columns WHERE column_name LIKE '%body%size%';
```

**Output format**: Markdown tables (tables × columns, FK relationships), comparison notes, slider audit findings

---

### SECTION 6: AI SERVICES
**Branch**: ai + backend

**What to collect**:
- Flask routes (list from api.py)
- Loaded datasets (chracters_datasets/ list)
- Character files list with variant counts
- Mobile variant ID → Flask character mapping (mapped vs unmapped)
- Scoring formulas + thresholds + label vocabulary returned (excellent/good/fair/poor) vs spec (exact/close/loose) — where mapping to spec vocab would go
- Backend adapters: `colorNames.ts`, `slotMapping.ts` behavior, fallbacks, lossy mappings
- Mock vs real: mockCategorizationFromText, photo mock, voice mock
- Is ANY speech-to-text present? ANY real image classifier? ANY LLM/assistant code/package? (expect none)
- Screener classifier model file: exists? loaded by anything?
- Readiness: formula + where computed + inputs
- Per-item status (BUILT / PARTIAL / STUB / ABSENT) with evidence:
  - Buy-or-make logic
  - Budgeting (price_paid_php usage)
  - Value reference
  - New-variant detection
  - Trade fairness
  - Commission pricing
  - Contest-tier suggestion
  - Group meetup optimization
- [RAN] Flask tests/scripts with exit codes

**Files to read** [CODE]:
- `<ai>/src/api.py` (Flask routes)
- `<ai>/src/attire_matcher.py` (scoring logic lines 196-205, 331-339)
- `<ai>/src/color_matcher.py`
- `<ai>/chracters_datasets/*.json` (list all, count variants per character)
- `<backend>/src/ai/matcherRouter.ts` (proxy to Flask)
- `<backend>/src/ai/colorNames.ts`
- `<backend>/src/ai/slotMapping.ts`
- `<mobile>/src/services/MatcherService.ts` (mobile → backend → Flask call chain)
- `<mobile>/src/screens/cosplayer/*Matcher*.tsx`
- Grep: `speech`, `whisper`, `vosk`, `STT`, `transcribe` in all three repos
- Grep: `tensorflow`, `torch`, `sklearn`, `transformers`, `openai`, `anthropic`, `llm` in `<ai>/`
- Grep: `classifier`, `model.pkl`, `.joblib` in `<ai>/models/` and `<backend>/src/moderation/`

**Commands to run** [RAN]:
```powershell
# List character dataset files
Get-ChildItem "<ai>/chracters_datasets" -Recurse -Filter "*.json" | Select-Object Name, Length

# Run Flask sanity test
cd "<ai>"
python test_sanity.py

# Check for ML packages
grep -n "tensorflow\|torch\|transformers\|openai\|anthropic" "<ai>/requirements.txt"

# Grep for speech/image AI
grep -rn "speech\|whisper\|STT\|image.*classifier\|vision" "<ai>/src" --include="*.py"
grep -rn "speech\|whisper\|STT" "<mobile>/src" --include="*.ts" --include="*.tsx"

# Check for model files
Get-ChildItem "<ai>/models" -Recurse -Filter "*.pkl" -ErrorAction SilentlyContinue
Get-ChildItem "<ai>/models" -Recurse -Filter "*.joblib" -ErrorAction SilentlyContinue
```

**DB queries** [DB]: None (AI service does not touch DB directly)

**Output format**: Subsections with bulleted lists, code snippets for scoring thresholds, mapping tables, status table (BUILT/PARTIAL/STUB/ABSENT)

---

### SECTION 7: MOBILE APP
**Branch**: mobile

**What to collect**:
- Navigator tree: every navigator + screen name + file + role access
- Total screen count (64 .tsx files found)
- Screen inventory table with columns:
  - Screen name
  - Role (cosplayer/organizer/holder/staff/any)
  - Data source (mock/AsyncStorage/API)
  - API calls made
  - Primary actions
  - Verdict (REAL-SERVER / LOCAL-ONLY / MOCK / STUB / PLACEHOLDER)
  - Evidence
- Include specific screens: shareable card, portfolio, diary, appearance hub/themes, meetups (code/QR), live map (any location code? grep expo-location), community calendar, manage staff, verify staff, verify cosplayers, holder review queue (reachable?), contest screens, logistics screens, marketplace screens (My Listings missing?), chat screens, offer screens, matcher screens, 3D preview
- Contexts/providers + what each persists (UserContext, ProjectContext, etc.)
- Services/API clients + base URL usage
- Hardcoded localhost/IP grep
- app.json plugins/permissions/scheme/build
- ErrorBoundary placement
- "Cannot read property trim of undefined" (Task E4) fixed? evidence
- Dev-only screens exposed in production: StaffRegistration, HeadOrganizerRegistration, ComponentShowcase
- Every role string used (list all: 'cosplayer', 'organizer', 'holder', 'staff', 'head_organizer', etc.)
- Is there a 'Holder' role string? (vs 'holder')
- Who can approve marketplace sellers / view ID submissions vs thesis Holder-only requirement

**Files to read** [CODE]:
- `<mobile>/src/navigation/*.tsx` (all 12 navigator files)
- `<mobile>/src/screens/**/*.tsx` (all 64 screen files)
- `<mobile>/src/contexts/*.tsx` (UserContext, ProjectContext, etc.)
- `<mobile>/src/services/*.ts` (API clients)
- `<mobile>/app.json` (full file)
- `<mobile>/src/utils/organizerAccess.ts` (role gating)
- Grep: `localhost`, `192.168`, `10.0.2.2`, `127.0.0.1` in `<mobile>/src`
- Grep: `'cosplayer'`, `'organizer'`, `'holder'`, `'Holder'`, `'staff'`, `'head_organizer'` in `<mobile>/src`
- Grep: `expo-location` in `<mobile>/src`
- Grep: `Cannot read property trim of undefined` in docs (Task E4)

**Commands to run** [RAN]:
```powershell
# Count screens
Get-ChildItem "<mobile>/src/screens" -Recurse -Filter "*.tsx" | Measure-Object | Select-Object -ExpandProperty Count

# List navigators
Get-ChildItem "<mobile>/src/navigation" -Filter "*.tsx" | Select-Object Name

# Grep hardcoded IPs
grep -rn "localhost\|192\.168\|10\.0\.2\.2\|127\.0\.0\.1" "<mobile>/src" --include="*.ts" --include="*.tsx"

# Grep role strings
grep -rn "'cosplayer'\|'organizer'\|'holder'\|'Holder'\|'staff'\|'head_organizer'" "<mobile>/src" --include="*.ts" --include="*.tsx" | Measure-Object | Select-Object -ExpandProperty Count

# Check for expo-location
grep -rn "expo-location" "<mobile>/package.json"
grep -rn "expo-location" "<mobile>/src" --include="*.ts" --include="*.tsx"

# TypeScript check (safe, no emit)
cd "<mobile>"
npx tsc --noEmit
```

**DB queries** [DB]: None (mobile doesn't query DB directly)

**Output format**: Large section with subsections: navigator tree diagram (text), screen inventory table (long), contexts list, services list, findings (hardcoded IPs, role inconsistencies, dev screens in prod)

---

### SECTION 8: 3D / WEARING PIPELINE
**Branch**: mobile

**What to collect**:
- Body GLB file paths/sizes/rig structure
- bodyBounds.ts, BodyModel.tsx, Preview3D.tsx, GarmentLayer.tsx, garmentRegistry.ts
- garmentRegistry entries (list all registered garments)
- wearing.ts mapping (if exists)
- app.json static asset imports
- GARMENT_SPEC.md status
- Skinned/deformable garments? (expect no)
- Blend-shape/size slider runtime? (expect removed per Oct 14 decision)
- [RAN] garment registry check script if exists

**Files to read** [CODE]:
- `<mobile>/assets/models/3D_Model_Female.glb` (size only)
- `<mobile>/assets/models/3D_Model_Male.glb` (size only)
- `<mobile>/src/data/bodyBounds.ts` (full file)
- `<mobile>/src/components/BodyModel.tsx`
- `<mobile>/src/screens/cosplayer/Preview3D.tsx`
- `<mobile>/src/components/GarmentLayer.tsx` (full file)
- `<mobile>/src/data/garmentRegistry.ts` (full file)
- `<mobile>/docs/GARMENT_SPEC.md`
- `<mobile>/app.json` (asset entry)
- Grep: `skinned`, `deform`, `morph`, `blend.*shape`, `size.*slider` in `<mobile>/src`

**Commands to run** [RAN]:
```powershell
# GLB file sizes
Get-ChildItem "<mobile>/assets/models" -Filter "*.glb" | Select-Object Name, Length

# Grep for slider/deform references
grep -rn "slider\|deform\|morph\|blend.*shape" "<mobile>/src" --include="*.ts" --include="*.tsx"

# Check for garment check script
Get-ChildItem "<mobile>/scripts" -Filter "*garment*" -ErrorAction SilentlyContinue
```

**DB queries** [DB]: None

**Output format**: Subsections with GLB file table, garment registry list, code snippets, findings (slider removal status)

---

### SECTION 9: SPEC ALIGNMENT MATRIX
**Branch**: assembly (requires all other sections)

**What to collect**: For each requirement, verdict (MET / PARTIAL / NOT MET / DEVIATES-BY-DECISION / UNKNOWN) + evidence:

**(a)** Three roles: cosplayer/organizer/Holder (sole admin; ID verification Holder-only)
**(b)** Holder verification before listing/trade/commission/chat
**(c)** Multi-variant character reference with origin tags + user-original submission screen
**(d)** Attire logging: photo/text/voice (English+Taglish) with transcript confirm + flexibility tag
**(e)** Exact/close/loose rating + 3-direction matching + new-variant flagging
**(f)** Continuous body-size slider + 3D deform (DECISION cancelled Oct 14 → DEVIATES-BY-DECISION; list all remaining references)
**(g)** Default casual asset fill
**(h)** Owned-materials inventory shared across projects + condition photos
**(i)** Task completion time logging + completed-project history with variant used
**(j)** Value reference built from marketplace activity
**(k)** Listing screener vs permitted-category + auto-block + Holder appeal path (client + server + Holder UI reachable?)
**(l)** Structured offers + transaction-scoped chat + chat never AI input
**(m)** Milestone tracking after agreed offer
**(n)** Organizer events + logistics fields (arrival/plate/entourage/stage/parking/deadline) + escalating reminders + commitment log + contest tier suggestion + opt-in history
**(o)** Group meetup schedule-conflict optimization + live location (Chapter 1 forbids, build plan requires — state what code has)
**(p)** Shareable card + appearance hub + diary
**(q)** Autonomous action only listing block, every other output suggestion
**(r)** Audit event on each human confirmation/override/block/appeal/verification/offer change
**(s)** Data Privacy Act consent/minimization/retention (what exists in code)

Also list **BUILT-but-not-in-thesis scope creep**: Staff role, Head Organizer approvals, community calendar, QR meetups, Dispatch Board plans.

**Locate spec docs**:
- `<workspace>/docs/ForgeMind.docx` (if exists)
- `<workspace>/docs/ForgeMind_Overall_Data_Information.docx`
- Chapter 1 thesis files (search `<workspace>/docs`)
- Technical/operational feasibility docs

**Files to read** [CODE]: Cross-reference from all sections 2-8

**Commands to run** [RAN]: None (assembly task)

**DB queries** [DB]: None (use Section 5 results)

**Output format**: Large table (requirement × verdict × evidence) + scope creep bulleted list

---

### SECTION 10: TESTS + QUALITY
**Branch**: mobile + backend + ai

**What to collect**:
- Inventory every test/check script in all 3 repos
- [RAN] each safe read-only script with exit codes + pass/fail
- [RAN] `npx tsc --noEmit` in mobile and backend (use local tsc only, do not install)
- Any automated test suite in package.json scripts?
- CI config (GitHub Actions, etc.)?
- Coverage gap list

**Files to read** [CODE]:
- `<mobile>/package.json` (scripts)
- `<backend>/package.json` (scripts)
- `<mobile>/.github/workflows/*.yml` (if exists)
- `<backend>/.github/workflows/*.yml` (if exists)
- `<mobile>/src/utils/__tests__/*.ts` (unit tests if exist)
- `<backend>/tests/*.ts` (test files)

**Commands to run** [RAN]:
```powershell
# List test scripts
grep "test\|check\|verify" "<backend>/package.json"

# Run TypeScript check (safe, no emit)
cd "<mobile>"
npx tsc --noEmit

cd "<backend>"
npx tsc --noEmit

# Run safe read-only tests
cd "<backend>"
npm run test:moderation
npm run test:moderation-data
npm run test:rules

cd "<mobile>"
npm run test:pure

cd "<ai>"
python test_sanity.py

# Check for CI config
Get-ChildItem "<mobile>/.github/workflows" -ErrorAction SilentlyContinue
Get-ChildItem "<backend>/.github/workflows" -ErrorAction SilentlyContinue
```

**DB queries** [DB]: None

**Output format**: Markdown table (script name × repo × exit code × pass/fail × notes), coverage gap list

---

### SECTION 11: DOC STATE
**Branch**: mobile + backend + ai

**What to collect**:
- List every .md/.pdf doc (path, last modified, 1-line purpose) [RAN]
- Mark STALE where contradicts code
- Rule on each specific audit claim (12 items listed below)

**Specific doc claims to verify**:
1. "projects work" vs code persistence
2. "chat local-only" vs Oct 13 server wiring
3. "offers not wired" vs OffersApi
4. "no appeal routes" vs MarketplaceApi.appealListing + server routes
5. "events/contests never hit backend" vs routes/tables/AsyncStorage keys
6. 8-second matcher timeout in code?
7. Offers route list `/marketplace/offers/received` only — list actual routes
8. Screener metric "good listings correctly allowed 73.30%" vs "precision 73.30%" — recompute from raw counts if script available
9. Migration 021 file exists? planned deletion?
10. "no automated test suite" vs existing unit tests
11. Cloudflare tunnel vs Tailscale in use
12. Expo SDK 57 / RN 0.86 / three 0.170 / Postgres 18 — confirm versions

**Files to read** [CODE]:
- `<mobile>/CHANGELOG.md`
- `<mobile>/CHANGELOG_V2.md`
- `<mobile>/docs/AI_PROGRESS.md`
- `<mobile>/docs/FEATURE_AUDIT.md` (if exists)
- `<mobile>/docs/database/SCHEMA_RECONCILIATION.md`
- `<mobile>/docs/changes/*.md` (all changelog files)
- `<backend>/README.md` (if exists)
- `<ai>/README.md` (if exists)

**Commands to run** [RAN]:
```powershell
# List all docs with last modified
Get-ChildItem "<mobile>" -Recurse -Include "*.md","*.pdf" | Select-Object FullName, LastWriteTime | Sort-Object LastWriteTime -Descending

Get-ChildItem "<backend>" -Recurse -Include "*.md","*.pdf" | Select-Object FullName, LastWriteTime | Sort-Object LastWriteTime -Descending

Get-ChildItem "<ai>" -Recurse -Include "*.md","*.pdf" | Select-Object FullName, LastWriteTime | Sort-Object LastWriteTime -Descending
```

**DB queries** [DB]: None

**Output format**: Doc inventory table (path × last modified × purpose × stale?), 12-item claim verification table (claim × where claimed × what code shows × status)

---

### SECTION 12: DISCREPANCY + UNVERIFIED LOG
**Branch**: assembly

**What to collect**: Aggregate every [DOC-ONLY] and [UNKNOWN] tag from all sections into one table:
- Number
- Claim
- Where claimed (doc file, section)
- What code shows
- Status (CONFIRMED / CONTRADICTED / DOC-ONLY / UNKNOWN)
- Evidence

**Sources**: All sections 0-11

**Output format**: Markdown table with 6 columns

---

### SECTION 13: ASSISTANT-READINESS
**Branch**: assembly

**What to collect**: Per Section 3 entity:
- Safe for a server-side assistant tool to read today? YES (server + per-user isolation) / NO (local only) / PARTIAL (on server but missing isolation)
- List reusable backend service functions/routes
- List blockers in priority order

**Do NOT build anything.**

**Sources**: Sections 3, 4, 5

**Output format**: Markdown table (entity × safe? × blockers), reusable services list

---

### SECTION 14: KNOWN GAPS + RISKS RANKED
**Branch**: assembly

**What to collect**: By severity (Critical / High / Medium / Low):
- Item
- Evidence (file:line or [RAN])
- Effort (S/M/L)
- Classification (required-for-correctness / security / next-milestone / optional)

Security + data isolation first.

**Sources**: Findings from all sections 2-11

**Output format**: Markdown table sorted by severity

---

### SECTION 15: OWNER CHECKLIST
**Branch**: assembly

**What to create**: `OWNER_TEST_CONFIRMATIONS.md` with table:
- Feature (from Section 7 screen inventory)
- Web (Y/N/date) — BLANK
- Android phone (Y/N/date) — BLANK
- iOS (Y/N/date) — BLANK
- Cellular/Tailscale (Y/N/date) — BLANK
- Notes — BLANK

**Leave ALL cells blank for owner to fill.**

**Sources**: Section 7 screen inventory

**Output format**: Markdown table with 6 columns, all cells blank except Feature column

---

## BRANCH ASSIGNMENTS

### Evidence Branch: MOBILE
**Sections owned**: 0 (mobile git), 2 (mobile part), 3 (mobile part), 7, 8, 10 (mobile part), 11 (mobile docs)

**Intermediate output file**: `<mobile>/docs/reports/.agents/g1/mobile-evidence.md`

**What to do**:
1. Collect evidence for sections 0 (mobile git status, package.json versions), 2 (api.ts resolution, app.json, docs), 3 (AsyncStorage keys, mobile contexts/services), 7 (full navigator + screen inventory), 8 (3D pipeline, garments), 10 (mobile TypeScript check, mobile tests), 11 (mobile docs list + last modified)
2. Write `mobile-evidence.md` with all [CODE], [RAN] tags and file:line citations
3. DO NOT write the final report; only evidence

### Evidence Branch: BACKEND
**Sections owned**: 0 (backend git), 2 (backend part), 3 (backend part), 4, 5, 10 (backend part), 11 (backend docs)

**Intermediate output file**: `<mobile>/docs/reports/.agents/g1/backend-evidence.md`

**What to do**:
1. Collect evidence for sections 0 (backend git status, package.json versions), 2 (backend CORS/config/network), 3 (backend routes per entity, table access), 4 (full route inventory, auth, role enforcement, security scan, migrations, moderation, chat, audit log), 5 (DB schema, tables, row counts, FK, slider audit), 10 (backend TypeScript check, backend tests), 11 (backend docs)
2. Run read-only DB queries (SELECT, information_schema only) with [DB] tags
3. Write `backend-evidence.md` with all evidence
4. DO NOT write the final report; only evidence

### Evidence Branch: AI
**Sections owned**: 0 (ai git), 6, 10 (ai part), 11 (ai docs)

**Intermediate output file**: `<mobile>/docs/reports/.agents/g1/ai-evidence.md`

**What to do**:
1. Collect evidence for sections 0 (ai git status, requirements.txt), 6 (Flask routes, datasets, character files, scoring, backend adapters, mock vs real, matcher tests), 10 (ai tests), 11 (ai docs)
2. Run Flask sanity test with [RAN] tag
3. Write `ai-evidence.md` with all evidence
4. DO NOT write the final report; only evidence

### Assembly Step: FINAL REPORT
**Sections owned**: 1 (summary, written LAST), 9 (spec alignment), 12 (discrepancy log), 13 (assistant-readiness), 14 (risks ranked), 15 (owner checklist)

**Input files**:
- `<mobile>/docs/reports/.agents/g1/mobile-evidence.md`
- `<mobile>/docs/reports/.agents/g1/backend-evidence.md`
- `<mobile>/docs/reports/.agents/g1/ai-evidence.md`

**Output files**:
- `<mobile>/docs/reports/SYSTEM_STATE_REPORT.md` (all 15 sections)
- `<mobile>/docs/reports/OWNER_TEST_CONFIRMATIONS.md`
- `<mobile>/docs/changes/G1_CHANGELOG.md`

**What to do**:
1. Read all three evidence files
2. Assemble sections 0-11 from evidence (copy + format + organize)
3. Write section 9 (spec alignment) by cross-referencing evidence
4. Write section 12 (discrepancy log) by extracting all [DOC-ONLY] and [UNKNOWN] tags
5. Write section 13 (assistant-readiness) from sections 3, 4, 5
6. Write section 14 (risks ranked) by aggregating findings by severity
7. Write section 15 (owner checklist) from section 7 screen inventory with ALL cells blank
8. Write section 1 (summary) LAST after all other sections complete
9. Write all three deliverable files
10. Ensure NEVER print secrets (mask all .env values, passwords, DB_PASSWORD, etc.)

---

## VERIFICATION

**Each evidence branch**:
- Run TypeScript check (`npx tsc --noEmit`) or Python syntax check
- Run safe read-only tests
- Confirm evidence file written with all [CODE], [RAN], [DB] tags

**Assembly step**:
- Confirm all 15 sections present in SYSTEM_STATE_REPORT.md
- Confirm OWNER_TEST_CONFIRMATIONS.md has blank cells
- Confirm G1_CHANGELOG.md written
- Grep for secrets: `DB_PASSWORD=`, `password:`, `token:` in all output files (should find ZERO literal values, only var names)
- Count [DOC-ONLY] and [UNKNOWN] tags in report; confirm all appear in section 12

**Final check**:
- All three deliverable files exist
- No source/config/migration files modified (git status)
- No servers started (ports 3000/5000/8081 unchanged)

---

## NOTES

- This is a READ-ONLY audit. Any command that modifies data/config/migrations/source is FORBIDDEN.
- Evidence tags are MANDATORY for every claim. No evidence = no claim.
- Docs are leads, not proof. Always confirm in code.
- If DB credentials missing, mark [UNKNOWN] and continue. Do not guess or install anything.
- Keep paths absolute (C:\Users\Alord\OneDrive\Documents\School\MOR\Concept\ACCEPTED COSPLAY CONTENTS\CosForge_System - Copy\...).
- Platform: Windows PowerShell. Use PowerShell-compatible commands.

---

END OF AUDIT PLAN
