# ForgeMind — Scope (IN / OUT / LATER)

**Created:** Wednesday, September 30, 2026, 17:55
**Phase:** Phase 1 (Scope & Database) — planning only, no feature code
**Source of truth:** `ForgeMind.docx` (AI Concept / Data / AI-ML / AI Output / Scope & Limitation) and
`ForgeMind_Overall_Data_Information.docx` (Build Plan and Tools, Phases 0–6).

Every item below cites the source paragraph. Section shorthand:

| Tag | Meaning |
|---|---|
| `CONCEPT §n` | `ForgeMind.docx`, "AI Concept (The Input & Intent)", paragraph *n* |
| `DATA §n` | `ForgeMind.docx`, "The Data:", bullet *n* |
| `ML §n` | `ForgeMind.docx`, "AI/ML (The Engine & Processing)", paragraph *n* |
| `OUT §n` | `ForgeMind.docx`, "AI Output (The Final Result)", paragraph *n* |
| `LIM` | `ForgeMind.docx`, "Scope and Limitation of the Study" |
| `PLAN Pn` | `ForgeMind_Overall_Data_Information.docx`, "Phase n" |
| `ARCH` | `ForgeMind_Overall_Data_Information.docx`, "Overall System Architecture" |

**Status legend for the code column:** `BUILT` = screens exist and read/write the data ·
`PARTIAL` = some surface exists, spec surface missing · `STUB` = route/screen exists but no logic ·
`MISSING` = no code at all.

---

## 1. IN — must build

### 1.1 Roles and identity

| # | Item | Spec | Code status |
|---|---|---|---|
| IN-1 | Three roles: cosplayer, event organizer, Holder | `CONCEPT §4`, `LIM` | BUILT |
| IN-2 | Holder is the **sole** admin role; no separate admin exists | `CONCEPT §4`, `LIM` | PARTIAL — role is a boolean `is_holder_verified` + `verification_status`; backend has no `holder` value in any `organizer_role` CHECK (`forgemind-backend/src/auth/router.ts` has no role check at all) |
| IN-3 | Holder verifies identity before any listing / trade / commission / chat | `CONCEPT §4`, `DATA §20` | PARTIAL — verification UI + schema exist (`holder_verification_records`); **no server-side gate** blocks an unverified user from those actions |
| IN-4 | Holder hears listing-block appeals | `CONCEPT §36`, `OUT §36` | BUILT (UI only; no backend route) |
| IN-5 | Real sign-up / sign-in / sign-out against the backend | `PLAN P3` | BUILT (commit `5018aba`) |

### 1.2 Character / Material Reference (variant library)

| # | Item | Spec | Code status |
|---|---|---|---|
| IN-6 | Shared Character/Material Reference, multiple **named style variants per character** | `DATA §11` | BUILT — `characters.json`, `variants.json`, `forgemind-ai/datasets/cosplay_matches/` |
| IN-7 | `origin` tag: `canon` / `fan-art-inspired` / `user-original` | `DATA §11` | BUILT in dataset JSONs and `variants.origin_tag` CHECK; app-side `variants.json` needs confirming per-variant |
| IN-8 | Per-variant component list, typical materials, build difficulty | `DATA §11` | PARTIAL — dataset JSONs carry `costume_requirements` + `difficulty_rating`; `variants` table has `build_difficulty_rating` (int 1–5) vs dataset string `easy/medium/hard` — **taxonomy mismatch, see DATABASE.md §7** |
| IN-9 | Library is **open-ended / community-contributed**, never capped at canon | `CONCEPT §6` | PARTIAL — `variants.status IN ('confirmed','candidate')` + `candidate_source IN ('ai-flagged','user-submitted')` exist in schema; **no app screen submits a user-original variant** |
| IN-10 | New-variant detection flag (defining feature present, no catalogued variant) | `ML §27`, `OUT §35` | MISSING — no code; `character_traits` is a dead field in all 7 dataset files |
| IN-11 | Reference must be reachable **offline** | Offline-first rule | PARTIAL — `src/data/*.json` is bundled, but `forgemind-ai/datasets/` is only on the PC |

### 1.3 Owned attire and inventory

| # | Item | Spec | Code status |
|---|---|---|---|
| IN-12 | Owned-attire records from **photo / typed text / spoken voice (English + Taglish)** | `DATA §12` | BUILT for photo + text; voice screen exists but speech recognition is not wired to a transcription service |
| IN-13 | All three entry methods produce the **same structured record** | `DATA §12` | BUILT (`OwnedAttire` single shape) |
| IN-14 | Flexibility tag: restyle-willing / dye-willing / as-is-only | `DATA §12` | BUILT |
| IN-15 | Never permanently bound to one character/variant (wigs are reused) | `DATA §12` | BUILT (`attire_usage_history` + `committed_to_project_id`) |
| IN-16 | Shared materials inventory, condition photos logged periodically | `DATA §15` | BUILT (`condition_photo_history` JSONB) |
| IN-17 | Item is **not** visible across accounts on one device | Privacy | **BROKEN** — `OwnedAttireContext.tsx` key has no user suffix and hands the raw array to every consumer; `deleteItem` filters on `attire_id` only |

### 1.4 Attire matching (one feature, two engines)

| # | Item | Spec | Code status |
|---|---|---|---|
| IN-18 | Compare owned items against **every** named variant of a character, not canon only | `ML §27` | MISSING in app — `MatchResultsScreen` exists but there is no `LocalMatcher`/`RemoteMatcher` in TypeScript at all |
| IN-19 | Per-item rating **exact / close / loose** (tiered, not binary) | `ML §27`, `OUT §34` | MISSING — Python returns `excellent/good/fair/poor/no-match` (`attire_matcher.py:176-185`); the `exact/close/loose` vocabulary appears nowhere in code |
| IN-20 | Report the **best-scoring variant** for that user's item set | `ML §27` | MISSING (same reason) |
| IN-21 | Match in **three directions**: items→characters, chosen character→owned components, single item→all characters it could support | `ML §27` | MISSING |
| IN-22 | LocalEngine always works offline; RemoteEngine only when online; identical outfit-spec shape | Global rule | MISSING — no TS engine interface |
| IN-23 | Label every result with `engine` + `engine_version`; never mix scores across engines | Global rule | MISSING — no `ai_results` table, no `engine` field anywhere |
| IN-24 | Signature-wig + suit + tie ⇒ high match to the *formal* variant, not a weak canon match | `ML §27` | MISSING (the named example is not implemented) |
| IN-25 | Override a rating → re-run that item across the whole reference | `CONCEPT §5` | MISSING |
| IN-26 | Reuse history raises confidence for a third wear | `ML §31` | MISSING |
| IN-27 | Emerging-variant clustering across users | `ML §31` | MISSING |

### 1.5 3D preview

| # | Item | Spec | Code status |
|---|---|---|---|
| IN-28 | Two base bodies, male and female | `PLAN P2` | BUILT (`3D_Model_Male.glb` 1.34 MB, `3D_Model_Female.glb` 1.20 MB) |
| IN-29 | Dress-up renderer reads an outfit spec and tints proxy garments | `ML §28`, `OUT §35` | STUB — `Preview3D` renders the bare body; no garment layer at all |
| IN-30 | Default casual asset set fills unmatched slots | `DATA §14`, `ML §28` | MISSING — `default_casual_assets` is an *undesigned deferred table* in `SCHEMA_RECONCILIATION.md:1766` |
| IN-31 | List what is missing, feeding material suggestions | `ML §28` | MISSING |
| IN-32 | Body-size slider across the full continuous range | `CONCEPT §7`, `DATA §13`, `PLAN P2` | **DROPPED by user decision** — see §4 of this document. `MorphFactor`/`boneScaling` deleted; `body_size_slider` field still stored and displayed |
| IN-33 | Test the viewer across the **full** slider range with real cosplayers of different body sizes | `PLAN P5` | N/A while IN-32 is dropped; the plain base-body load has not been device-tested |
| IN-34 | Keep model/texture size safe for low-end Android and older iPhones | Cross-platform rule | PARTIAL — 2.54 MB of GLB embedded in the binary via the `expo-asset` plugin; `BodyModel.tsx` imports **both** GLBs at module scope so neither is lazy-loaded |

### 1.6 Marketplace

| # | Item | Spec | Code status |
|---|---|---|---|
| IN-35 | Holder-verified users post listings, trade proposals, commission offers | `CONCEPT §8`, `DATA §18` | BUILT (UI) |
| IN-36 | Permitted-category list | `DATA §19`, `PLAN P0` | BUILT — `src/constants/marketplaceCategories.ts`, `permitted_categories` table |
| IN-37 | Screen **at the point of posting**; block before public | `ML §29`, `OUT §36` | STUB — `src/utils/listingScreener.ts` is a local rule check; **the backend screener endpoint does not exist** (`forgemind-backend/src/index.ts` says so explicitly) |
| IN-38 | Holder appeal path for disputed blocks | `CONCEPT §36`, `LIM` | BUILT (UI only) |
| IN-39 | Structured offers (the only input to pricing/fairness) | `CONCEPT §8`, `DATA §18` | BUILT |
| IN-40 | Chat scoped to exactly two verified parties on one active listing/trade/commission | `CONCEPT §8` | BUILT (UI) — but `getOrCreateThread` does not verify either party is Holder-verified |
| IN-41 | Thread closes on complete/cancel | `CONCEPT §8` | BUILT |
| IN-42 | Chat content **never** read or used as AI input | `CONCEPT §8`, `LIM` | BUILT — `chat_messages` has a `COMMENT ON TABLE` AI-EXCLUDED note; nothing joins it |
| IN-43 | Value Reference of typical prices from historical activity | `DATA §17` | PARTIAL — `value_references` table exists, is empty, no aggregation job |
| IN-44 | Fairness / price-outlier flag on a trade | `ML §30`, `OUT §34` | STUB — `listings.price_outlier` column exists; no computation |
| IN-45 | Commission price + timeline suggestion vs historical build-time data | `ML §30`, `OUT §34` | MISSING |
| IN-46 | Milestone tracking through payment, shipping, receipt | `ML §30` | PARTIAL — 4 of 6 `milestone_type` values exist in the app; `item-shipped`/`item-received` are schema-only |
| IN-47 | Marketplace registration before first action | `DATA §20` | BUILT (UI) |

### 1.7 Projects, schedule, budget

| # | Item | Spec | Code status |
|---|---|---|---|
| IN-48 | Character selection, stated budget, stated skill level at project start | `DATA §10` | PARTIAL — all three collected; `ProjectsContext` is **never persisted** so they vanish on reload |
| IN-49 | Generated, continuously recomputed schedule | `OUT §35` | STUB — `src/utils/readiness.ts` computes a score; there is no schedule |
| IN-50 | Readiness estimate: likely ready / at risk / unlikely | `OUT §34` | STUB — `readiness.ts` exists; threshold semantics not in spec form |
| IN-51 | Skill-fit flag naming the specific technique above the stated level | `OUT §34` | MISSING |
| IN-52 | Buy-or-make and reuse suggestions vs remaining needs | `ML §30` | MISSING |
| IN-53 | Material/cost suggestions stay within stated budget; gaps flagged | `ML §32` | MISSING — `src/data/budget_items.json` is a static seed |
| IN-54 | Logged task completion + time spent, accumulated across users | `DATA §16`, `ML §31` | PARTIAL — `tasks` schema has `actual_completion_date` / `actual_time_spent_hours`; app never writes them |
| IN-55 | Build history = items and variant **actually used**, not only suggested | `DATA §16`, `DATA §25`, `OUT §35` | MISSING — `attire_usage_history` table exists, no code writes it |
| IN-56 | User-original variants submitted from a completed project | `DATA §25` | MISSING |

### 1.8 Events and organizer tools

| # | Item | Spec | Code status |
|---|---|---|---|
| IN-57 | Organizer-confirmed event details | `DATA §21` | BUILT |
| IN-58 | Group members' schedules and priorities | `DATA §21` | PARTIAL — `CalendarContext` entries exist, not wired to meetup optimisation |
| IN-59 | Vendor and participant applications | `DATA §21` | **UNDECIDED** — `event_participant_applications` has never been verified (`SCHEMA_RECONCILIATION.md:1972`, "Do not migrate this table") |
| IN-60 | Aggregate opt-in readiness data | `DATA §21`, `OUT §34` | STUB — `readinessAggregate.ts` exists |
| IN-61 | Structured logistics: arrival time, plate number, entourage size, stage-time needs, parking needs, submission deadline | `DATA §22` | BUILT |
| IN-62 | Logistics-completion status per confirmed guest / sponsor / performer | `OUT §34` | BUILT (`logisticsRules.ts`) |
| IN-63 | Escalating reminders as deadlines approach; most time-critical first | `ML §30`, `ML §32` | BUILT |
| IN-64 | Commitment log: timestamped, tagged to departments affected | `DATA §23` | BUILT (append-only, correct) |
| IN-65 | Commitment-change notifications routed **only** to affected departments | `CONCEPT §36`, `ML §30` | BUILT |
| IN-66 | Opt-in contest history: years competed, placements, awards | `DATA §24` | PARTIAL — `contest_opt_ins` has status + tier; **no years/placements/awards columns anywhere** |
| IN-67 | Contest-tier suggestion with the specific historical record behind it | `ML §30`, `OUT §34` | STUB — tier is assigned by hand, not suggested |
| IN-68 | Group meetup suggestion minimising total scheduling conflict; re-runs on change | `ML §30`, `ML §32`, `OUT §35` | STUB — `GroupMeetupScreen` is a form; `MeetupsContext.checkLinkage` reads the non-persisted `projects` array so every meetup is orphaned after reload |

### 1.9 Cross-cutting

| # | Item | Spec | Code status |
|---|---|---|---|
| IN-69 | Every output is a **suggestion**, never an instruction; disregarding one is never penalised | `CONCEPT §5`, `OUT §36`, `LIM` | BUILT by omission (nothing tracks compliance) |
| IN-70 | No suggestion is a dead end (all three override paths work) | `CONCEPT §5` | MISSING (see IN-25/26/56) |
| IN-71 | The AI **never** judges people or verifies identity | `CONCEPT §4` | BUILT |
| IN-72 | The one autonomous action is the listing block | `OUT §36` | STUB (IN-37) |
| IN-73 | Appearance Hub: theme picker, profile layout, accent options, own interface only | `PLAN P1` | BUILT — but `@forgemind:user_theme` is device-global despite the per-user key name |
| IN-74 | Shareable card: profile + itinerary card with QR, native share sheet, save to gallery, never auto-posts | `PLAN P1` | PARTIAL — "Save to Gallery" writes nothing to disk (`expo-file-system` is a dead import at `ShareableCardScreen.tsx:12`); Android share sheet fails the `Sharing.isAvailableAsync()` check |
| IN-75 | Cosplay Diary, kept **separate** from the AI-facing build history | `PLAN P1` | BUILT |
| IN-76 | Notifications: task/milestone reminders, escalating logistics reminders, commitment alerts | `OUT §36` | BUILT |

---

## 2. OUT — explicitly excluded, with reason

These are **not** scope. Listed with the spec sentence that excludes them so the exclusion is
traceable rather than a personal preference.

| # | Excluded | Reason (spec) |
|---|---|---|
| OUT-1 | Processing payments | `LIM`: "The system does not process payments…" |
| OUT-2 | Arranging shipping | `LIM`: "…arrange shipping…" |
| OUT-3 | Mediating disputes | `LIM`: "…mediate disputes…" |
| OUT-4 | Live location tracking | `LIM`: "…track live location…" |
| OUT-5 | General event discovery | `LIM`: "…provide general event discovery…" |
| OUT-6 | Resolving external logistics failures beyond notification | `LIM` |
| OUT-7 | Judging attendee behaviour | `LIM`: "…judge attendee behavior…" |
| OUT-8 | Generating captions or social content on the user's behalf | `LIM`; `OUT §36`: "It does not write captions, post content, or publish a completed build on a user's behalf" |
| OUT-9 | A separate `admin` role alongside the Holder | `CONCEPT §4`: "No separate admin role exists alongside the Holder" |
| OUT-10 | AI judging people or verifying identity | `CONCEPT §4`: "never to judging people or verifying identity" |
| OUT-11 | Reading or analysing marketplace chat content | `CONCEPT §8`, `OUT §36`, `LIM` |
| OUT-12 | AI finalising a purchase, trade, commission, or contest tier without a human | `OUT §36` |
| OUT-13 | Auto-adding a proposed new variant to the shared reference | `OUT §36`: "never added to the shared reference without a user or Holder confirming it" |
| OUT-14 | Body scan, body measurement, photographic likeness of the user | `DATA §13`, `LIM` |
| OUT-15 | Penalising a user for disregarding a suggestion | `CONCEPT §5`, `OUT §36` |
| OUT-16 | Listing screener judging authenticity, condition, legal ownership, or safety | `LIM`: it "judges only whether an item falls within the cosplay community's permitted scope" |
| OUT-17 | Chat substituting for the structured offer | `LIM` |
| OUT-18 | **Body-size slider / bone scaling / body variants** | **DROPPED by user decision** (not by the docx). See §4. |
| OUT-19 | Native modules, config plugins requiring a dev client, bare workflows | Global rule: Expo Go only |
| OUT-20 | Unity | `ARCH` names Unity, but the global rule is Expo Go only; the app uses `@react-three/fiber` + `expo-gl` instead. Recorded as a deliberate deviation, not an oversight. |
| OUT-21 | Firebase | `PLAN P3` offers Firebase *or* Node/PostgreSQL; Node/PostgreSQL was chosen (`forgemind-backend/`) |
| OUT-22 | Expo Router | App uses `@react-navigation` v7 native-stack + bottom-tabs |
| OUT-23 | Push notifications | Not in either docx. The `expo-notifications` package is **not** installed; reminders are in-app only. Recorded as an open question, not a scope decision. |

---

## 3. LATER — real, but sequenced after the IN list

| # | Item | Spec | Prereq |
|---|---|---|---|
| LATER-1 | Learned model replacing the rule-based attribute scorer | `PLAN P4` | enough logged data |
| LATER-2 | `default_casual_assets` table + assets | `DATA §14`, `ML §28` | IN-30; needs a non-Unity asset reference format |
| LATER-3 | Garment meshes and skin weights per gender, 5 slots | `PLAN P2` | IN-29 proxy contract first |
| LATER-4 | Cloth/skin deformation tuned at multiple slider positions | `PLAN P2` | OUT-18 dropped the slider, so this is moot until re-decided |
| LATER-5 | Value Reference aggregation job (weekly, trailing 90 days) | `DATA §17`, open decision 5 in `SCHEMA_RECONCILIATION.md:1964` | IN-43 + real transaction volume |
| LATER-6 | `contest_results` table for years/placements/awards | `DATA §24`, open decision 6 at `SCHEMA_RECONCILIATION.md:1968` | IN-66 |
| LATER-7 | Portfolio photo count limit | open decision 3 at `SCHEMA_RECONCILIATION.md:1956` | IN-47 |
| LATER-8 | `audit_events` retention policy (proposed 2 years) | open decision 4 at `SCHEMA_RECONCILIATION.md:1960` | DevOps decision |
| LATER-9 | Live-location relay (in-memory sessions only) | `PLAN P1`, `PLAN P3` | Schema exists (`live_location_sessions`); excluded by OUT-4 as a *product* feature but the spec asks for it in Phase 1/3 — **contradiction, see §5** |
| LATER-10 | Dispatch Board | open decision 1 at `SCHEMA_RECONCILIATION.md:1948`; **not in either docx** | User must define requirements |
| LATER-11 | Learned listing screener (image + text classifier) | `PLAN P4`, `ML §31` | IN-37 stub + real listing volume |
| LATER-12 | Share-sheet verification across ≥2 social apps | `PLAN P5` | IN-74 fixed |
| LATER-13 | Voice recognition against a real speech service, English + Taglish, with transcription review | `PLAN P1`, `PLAN P5`, `LIM` | IN-12; a speech API in Expo Go needs a check first |
| LATER-14 | Phase 5 device matrix with real cosplayers of different body sizes | `PLAN P5` | IN-33 |
| LATER-15 | Hosted image-classification API for the listing screener | `PLAN P4` tools | IN-37 |

---

## 4. DROPPED: body variants, body-size slider, bone scaling

**Spec conflict, stated plainly.** `ForgeMind.docx` requires this in four places:

- `CONCEPT §7` — "the user selects a base body (male or female) and adjusts a continuous size slider …
  plus-size bodies included as a first-class, fully supported range of that slider"
- `DATA §13` — "A base body selection (male or female) and a continuous body-size slider value"
- `DATA §14` — "built to deform correctly across the full size range"
- `ML §28` — "applies the corresponding blend shape to deform the body mesh"
- `ML §32` — "tuned to keep a natural drape at every point on the range"
- `LIM` — "the 3D visualization relies on a self-selected size-slider approximation"

`SCHEMA_RECONCILIATION.md:1932` records the contrary ruling: "Body size slider: **DROPPED from schema
completely per user decision**". That is the standing decision, so the docx and the schema now
disagree. **I have not changed either.** Recording the divergence.

### 4.1 What the rule already removed

Per `CHANGELOG.md` (final entry) and `CHANGELOG_V2.md`:

- `BoneScalingDebug.tsx` — deleted
- `utils/boneScaling.ts` — deleted
- `morphFactor`, `bodySizeValue`, `showBoneDebug` props — removed from `ThreeDPreview`, `Preview3D`, `BodyModel`
- Bone scaling `useEffect`, bone-name map, and `console.log`s in `BodyModel` — removed
- The two body-size sliders (Project Dashboard, dev 3D test screen) — removed
- **Kept deliberately:** `User.body_size_slider` in the profile, the database, and the API, and the
  `BodyModel` `.glb` filenames, so no account is orphaned

### 4.2 Every remaining trace — for your approval, nothing deleted yet

| # | Location | What remains | Type |
|---|---|---|---|
| T-1 | `src/screens/onboarding/BodySliderOnboardingScreen.tsx:70-85` | "Adjust Body Size" section, `BodySizeSlider`, live `Current value: 0.50` readout, `Size: 0.50` in the summary | **UI — still shown to every new user** |
| T-2 | `src/screens/onboarding/BodySliderOnboardingScreen.tsx:3-5` | Header comment documenting the `body_size_slider` mapping | Comment |
| T-3 | `src/components/sliders/Slider.tsx:3,11,12,18,21` | `BodySizeSliderProps` interface and the `BodySizeSlider` component, `label = 'Body Size'` | **UI component** |
| T-4 | `src/screens/shared/ProfileScreen.tsx:137-142` | "Size" row under "Body Representation" reading `user?.body_size_slider?.toFixed(2) ?? '0.50'` | **UI — in scope of your instruction** |
| T-5 | `src/screens/shared/ShareableCardScreen.tsx:139-142` | `size: user?.body_size_slider` inside the **QR payload object** | **Data leak into a scannable code** |
| T-6 | `src/screens/shared/ShareableCardScreen.tsx:360-366` | "Body Representation" block: `… Size 0.50` | **UI — in scope of your instruction** |
| T-7 | `src/contexts/UserContext.tsx:29,78,84,252,261,304,315,319` | `body_size_slider` on the `User` type, `bodySize` param on `login`/`setUserBody`, default `0.5` | State + types |
| T-8 | `src/services/AuthService.ts:72,180,185,194,269,294,335,337` | `body_size_slider` on `StoredAccount`, `toStoredAccount(..., bodySizeSlider)`, `existing?.body_size_slider ?? bodySizeSlider ?? 0.5` | State + types |
| T-9 | `src/screens/auth/RegisterScreen.tsx:48,150` | `const [bodySize] = useState(0.5)` passed to login | State |
| T-10 | `src/screens/dev/StaffRegistrationScreen.tsx:123`, `src/screens/dev/HeadOrganizerRegistrationScreen.tsx:135` | `0.5 // bodySize (placeholder - not used for organizers)` | Literal |
| T-11 | `src/screens/shared/ComponentShowcaseScreen.tsx:15,27,81` | `BodySizeSlider` demo | UI (dev screen) |
| T-12 | `src/constants/policies.ts:18` | "Body representation data (base body type, size slider value)" in the privacy policy text | **User-facing policy copy** |
| T-13 | `src/components/ThreeDPreview.tsx:27,29` | Comment: "runtime body-size scaling was removed… `body_size_slider` column is untouched" | Comment (a useful breadcrumb — keep) |
| T-14 | `forgemind-ai/models/body_size_bone_scale.json` | 33-bone → `[1.15, 1.0, 1.15]` scale LUT, 1,852 b | **Data file** |
| T-15 | `forgemind-ai/datasets/{Male,Female}_3D_Model/*.blend`, `*.blend1` | Blender sources for the bone scaling, 6.0–6.3 MB each, 4 files ≈ 24.8 MB | **Data files** |
| T-16 | `forgemind-ai/src/api.py:89` | `user_body_settings` accepted in the request body and passed to the matcher, which never reads it | Dead parameter |

### 4.3 Proposal — three separate decisions, do not bundle them

**Decision A — UI removal (I can do this now, no data touched).**
Remove T-1, T-3, T-4, T-6, T-11, and the T-2 comment. Also drop T-5 from the QR payload,
because a shareable card that publishes a body-size value is a data-minimisation problem
(`DATA §13` says the value is "a simple approximation", not a measurement) and OUT-14 already
puts measurements out of scope. T-9 and T-10 become trivial once T-7/T-8 are trimmed.
T-12 needs your wording decision — the privacy policy either keeps "size slider value" or
becomes "base body type". **T-3 (`BodySizeSlider`) is the base component;** removing it also
removes its only two call sites, so the file goes with it.

**Decision B — field and type removal (needs your approval).**
Remove `body_size_slider` from `src/contexts/UserContext.tsx` (T-7) and
`src/services/AuthService.ts` (T-8) so the type stops advertising a value nothing consumes.
**Effect on stored data:** the key `@forgemind:accounts` is rewritten on the next
`AuthService.updateUser()` / `updateVerification()` / etc. and the field disappears from the
serialised object. Because `StoredAccount` has no `password_hash` value to preserve
(it is always `''`, `AuthService.ts:189`), dropping the field is **lossless** — nothing reads it
back, nothing validates it, no server column exists. `AuthService.toStoredAccount` passes
`existing?.body_size_slider ?? bodySizeSlider ?? 0.5` only to populate the field being removed.
`base_body_selection` is untouched — the male/female base models are unchanged, as instructed.

**Decision C — data files (needs your approval, irreversible).**
T-14 and T-15. T-15 alone is ≈24.8 MB of Blender sources whose only purpose was bone scaling.
Note `datasets/Male_3D_Model/3D_Model_Male.blend` and `.blend1` are byte-identical in size
(6,271,972 b each), and the same GLBs already exist in `forgemind-ai/models/` — so deleting the
dataset copies loses only the Blender session, not the meshes. **I recommend deleting T-14 and the
four `.blend`/`.blend1` files, and keeping the eight rendered PNG turnarounds and both `.glb`s.**
I will not delete anything until you say so.

**Recommended sequencing:** Decision A now (Phase 2 start), Decision B immediately after, Decision C
last, each with its own changelog entry. Do not bundle them into one.

---

## 5. Docx-vs-code discrepancies

Listed, not silently changed. Column "Resolution" is a proposal only.

| # | Spec says | Code says | Where | Severity | Proposed resolution |
|---|---|---|---|---|---|
| D-1 | Continuous body-size slider, full range, plus-size first-class (`CONCEPT §7`, `DATA §13`, `DATA §14`, `ML §28`, `ML §32`, `LIM`) | Dropped from schema per user decision; renderer uses Blender-authored proportions unchanged | `SCHEMA_RECONCILIATION.md:1932`; `src/components/ThreeDPreview.tsx:27-29` | **High** | You have ruled DROPPED. Either amend the docx to a "fixed base body" model, or reinstate. **Your call — the docx is the stated source of truth, so this needs an explicit ruling recorded in both.** |
| D-2 | Live-location relay with a visible per-event toggle, live map, live path to a chosen member (`PLAN P1`; `PLAN P3` "Live-location relay") | `live_location_sessions` table exists; **no app screen, no toggle, no map, no relay** | `forgemind-backend/migrations/010_*.js`; no `src/` match | **High** | Direct contradiction inside the docx: `PLAN P1`/`P3` require it, `LIM` says "does not… track live location". Ask which governs. Listed as LATER-9. |
| D-3 | Attire rating is **exact / close / loose** (`ML §27`, `OUT §34`) | Python emits `excellent / good / fair / poor / no-match` | `forgemind-ai/src/attire_matcher.py:176-185` | **High** | The spec triad is the contract for the outfit spec. Phase 2 must map the 5 Python labels onto 3 spec labels, and the TS regression test must pin the mapping. |
| D-4 | `difficulty` per variant is a build difficulty (`DATA §11`) | Dataset uses `easy/medium/hard` (string); `variants.build_difficulty_rating` is `INTEGER 1..5` | `forgemind-ai/datasets/**.json`; `forgemind-backend/migrations/003_*.js` | Medium | Add an explicit mapping table. Do **not** let a CHECK constraint do it. |
| D-5 | Two disjoint taxonomies: catalog `component_type` = wig/top/bottom/shoes/accessory/armor/weapon/prop/makeup/other vs wardrobe `auto_categorized_type` = wig/clothing/footwear/accessory/armor/weapon/prop/fabric/material/other | `top`+`bottom`+`shoes`+`makeup` vs `clothing`+`footwear` | `003_*.js` and `005_*.js` | Medium | Needs a `component_category_map` table, not a join. Already in DATABASE.md §7. |
| D-6 | The variant library holds every named style variant and the matcher scores against all of them (`CONCEPT §6`, `ML §27`) | The Python matcher is structurally incapable of scoring anything: it reads `required_items` but all 7 files use `costume_requirements`; it reads `attributes.color`/`attributes.type` but the data uses `primary_colors` (a list) and `category`; and it builds `cosplay_matches/{slug}.json` but the files are one folder deeper | `forgemind-ai/src/attire_matcher.py:34, 79, 100, 149, 213` | **High** | Phase 2 item 4 covers this via the TypeScript port. The Python path should be declared **non-authoritative** and the TS `LocalMatcher` becomes the reference implementation. |
| D-7 | The AI is called **by the backend**, never directly by the app (`ARCH`) | The app has no call to `forgemind-ai` at all; `src/config/api.ts` points only at the backend | `ARCH`; `src/config/api.ts` | Medium | Expected at this stage. The LocalEngine/RemoteEngine split makes the direct call acceptable **only for the LocalEngine**, which must run in-process. |
| D-8 | Every character has a shared reference and multiple variants (`DATA §11`) | 6 characters declared, but 5 of 6 have **no images at all**, 8 dataset directories are empty, and 9 cosplay photos in `cosplay_matches/luck voltia - black clover/variant-*/` have no JSON and are unreachable by any endpoint | `forgemind-ai/datasets/` | Medium | Phase 2 validator must fail on this. The `12–22 images/character` target is currently met by 1 of 6. |
| D-9 | Voice input, English and Taglish, transcription always shown before saving (`DATA §12`, `LIM`) | `VoiceEntryScreen` exists; no speech-recognition service is wired and there is no transcription review step | `src/screens/cosplayer/VoiceEntryScreen.tsx` | Medium | LATER-13. Flag before use: speech-to-text in Expo Go needs a JS-only or web-API path. |
| D-10 | Notifications escalate as deadlines approach (`ML §30`, `OUT §36`) | Reminders are in-app modals only; `expo-notifications` is not a dependency, so nothing arrives when the app is closed | `package.json` | Medium | `PLAN P5` weak-connectivity testing implies push was expected. Recorded as open question Q-9. |
| D-11 | "The system compares owned materials against a project's remaining needs" (`ML §30`) | `ProjectsContext` is never persisted, so projects, tasks, budget items and milestones do not survive a reload; this orphans `DiaryEntry.project_id`, `OwnedAttire.committed_to_project_id`, and `MeetupsContext.checkLinkage` | `src/contexts/ProjectsContext.tsx:55-58`; `src/contexts/MeetupsContext.tsx:110` | **High** | The single highest-value data defect. DATABASE.md migration step M-3. |
| D-12 | Marketplace is Holder-verified-only (`CONCEPT §8`) | `AuthService` has no `requireVerified()` guard; no screen checks `is_holder_verified` before listing, offering, or opening a thread | `src/contexts/MarketplaceContext.tsx`; `src/contexts/ChatContext.tsx:167` | **High** | Model as a permission table, DATABASE.md `permissions`. Not a UI-only fix. |
| D-13 | `event_participant_applications` for vendor/participant applications (`DATA §21`) | Table exists in migration 008 but was never verified; the reconciliation doc says **do not migrate** | `SCHEMA_RECONCILIATION.md:1972` | Medium | Open question Q-2. Awaiting your ruling. |
| D-14 | Cost and time data accumulate from many users' projects (`DATA §16`, `ML §31`) | `tasks.actual_completion_date` / `actual_time_spent_hours` are never written by any code path | `forgemind-backend/migrations/006_*.js` | Medium | IN-54. Without it no learned model is possible (LATER-1). |
| D-15 | Permitted-category screening happens server-side at posting (`ML §29`, `PLAN P3`) | Screening is a local util (`src/utils/listingScreener.ts`); the backend has **no** screener endpoint and says so in `src/index.ts` | `forgemind-ai` absent; `forgemind-backend/src/index.ts` | Medium | IN-37. Note the autonomous-action rule (`OUT §36`) means a *block* decision is the one place the AI may act — that decision must not be made on-device where it can be bypassed. |
| D-16 | Unity-based 3D module embedded in-app (`ARCH`) | `@react-three/fiber` + `expo-gl` + `three`, no WebView bridge; `react-native-webview` is installed but never imported | `ARCH`; `package.json` | Low | Deliberate deviation forced by the Expo Go rule. Recording it so the defence write-up is honest. |
| D-17 | `body_size_bone_scale.json` and the `.blend` sources implement the slider (`ML §28`) | Both exist and are unused by any code | `forgemind-ai/models/`, `forgemind-ai/datasets/*_3D_Model/` | Low | T-14/T-15, Decision C. |
| D-18 | Spec says cost/price in a "Value Reference" built from historical marketplace activity (`DATA §17`) | `value_references` has `sample_count` and an aggregation window but no job, and no `listings`→`value_references` code path | `forgemind-backend/migrations/004_*.js` | Low | LATER-5. |
| D-19 | The spec's "one Holder" role performs verification, moderation, and access control (`CONCEPT §4`) | `HolderReviewQueueScreen` is a UI over AsyncStorage; the backend has no Holder route and **no auth middleware at all** | `forgemind-backend/src/auth/router.ts` | **High** | DATABASE.md `permissions` + open question Q-5. |
| D-20 | The backend is the store of record (`PLAN P3`) | 22 live AsyncStorage key templates remain the store of record, plus 2 legacy keys that upgraded devices still carry; the backend has 4 routes (3 auth + health) and a seed that fills 10 of 38 tables | `forgemind-backend/package.json` | **High** | That is what DATABASE.md is for. Full key-by-key inventory in `DATABASE.md` §1. |
| D-21 | `PLAN P5` requires iOS and Android device testing, which implies a shippable build | `expo-camera` and `expo-image-picker` both ship a config plugin; **neither is registered** in `app.json`, so no `Info.plist` usage string and no Android `CAMERA` permission is generated | `app.json:28-40`; `TEST_MATRIX.md` R-1 | **High** | Invisible in Expo Go, fatal outside it — iOS kills the app on the permission prompt. Registering the two plugins is a one-line config change, but it is **native configuration**, so it is Phase 2 and needs your approval. |
| D-22 | `PLAN P3` requires a real backend | `.env.local` points at `http://localhost:3000`, which an Android emulator resolves to itself | `.env.local:1`; `TEST_MATRIX.md` R-2 | **High** | Every Android auth call fails while iOS works, which is the most misleading possible failure. `10.0.2.2` for emulators, LAN IP for a device. Environment config, so Phase 2. |
| D-23 | `DATA §21` asks for logistics completion per confirmed guest | 17 of the 26 screens that contain a text input have no keyboard avoidance, so a field can sit under the Android keyboard with no way to reach it | `TEST_MATRIX.md` R-3, §5 | Medium | Platform work, not spec work. Noted here because it blocks the `PLAN P5` device pass for the logistics and calendar flows specifically. |
| D-24 | `PLAN P1` promises a shareable card with "save to gallery" and a native share sheet | "Save to Gallery" writes nothing (`expo-file-system` is a dead import) and the Android share sheet is gated behind `Sharing.isAvailableAsync()`, which is false there | `screens/shared/ShareableCardScreen.tsx:12,113-151`; `TEST_MATRIX.md` R-10 | Medium | The feature reads as working on iOS and silently does nothing on Android. |

---

## 6. Open questions

Blocking, in priority order. Q1–Q4 change Phase 2 work directly.

| # | Question | Why it blocks | Default if you do not answer |
|---|---|---|---|
| Q-1 | Which governs the docx vs your DROPPED ruling: amend the docx, or reinstate the slider? | D-1. The Phase 2 renderer contract has to know whether a body-size input exists. | Amend the docx to a fixed-base-body model. Proceed as DROPPED. |
| Q-2 | Does `event_participant_applications` exist, or is `guest_logistics` the only participant-intake surface? | `SCHEMA_RECONCILIATION.md:1972` asks exactly this ("does this table exist at all?") and `:1224` says "do not migrate either table until ruled on". DATABASE.md needs to know whether to create it. | Carry it as a commented-out block in the SQLite migration, not created. |
| Q-3 | Do live location (D-2) and general event discovery (OUT-5) stay out? | `PLAN P1`/`P3` ask for it; `LIM` forbids it. Affects whether `live_location_sessions` is in the target schema. | Omit. `LIM` is the tighter, more recent constraint. |
| Q-4 | Exact/close/loose thresholds. Where do they cut? | D-3. The regression test must pin identical scores, so the thresholds have to be a constant, not a guess. | Map Python `≥0.9→exact`, `≥0.6→close`, `<0.6→loose`; documented as a proposal. |
| Q-5 | What is the mobile-side auth contract? Today a bearer token authenticates nothing. | D-19. Sync and outbox cannot be designed without knowing who the caller is. | Assume `sessions` lookup by SHA-256 token hash with `expires_at` enforcement, which is what the schema implies. |
| Q-6 | Is `@forgemind:owned_attire` per-device or per-account today, in your intent? | The cross-account leak, IN-17 and `DATABASE.md` §1.1. Decides whether the migration partitions by owner. | Treat as per-account; the `user_id` field already exists on the record. |
| Q-7 | Are the 3 broken underscore keys (`@forgemind_accounts`, `@forgemind_active_session`, `@forgemind_organizer_requests`) in use by any reviewer workflow? | `DebugLogger` is advertised in `App.tsx:63-69` and the changelogs tell reviewers to paste AsyncStorage output through it. It reads nothing. | Delete them. They are dead. Note two *other* underscore keys **are** live — see `DATABASE.md` §1 row 18a. |
| Q-8 | Should `CalendarContext` entries stay a shared community calendar or become per-user? | The key has no owner. | Per-user. `SCHEMA_RECONCILIATION.md` already models `calendar_entries.user_id`. |
| Q-9 | Is in-app-only notification acceptable, or is push required? | D-10. `expo-notifications` is not installed. | In-app only. Record as a scope reduction. |
| Q-10 | Portfolio photo limit? | Open decision 3, `SCHEMA_RECONCILIATION.md:1956`. | 10, application-enforced. |
| Q-11 | Retention for `audit_events`? | Open decision 4. | 2 years, then archive. Not implemented in Phase 1. |
| Q-12 | Do the `12–22` images-per-character target and the seed provenance need your sign-off before any image is added? | Phase 2 `MANIFEST.csv` needs `license_or_permission` and `consent_obtained` filled honestly, and 1 of 6 characters currently has any images. | No image is added without an explicit consent value in the manifest. |
| Q-13 | The 9 orphan cosplay photos in `cosplay_matches/luck voltia - black clover/variant-*/` — attach them to the three Luck Voltia variants, or delete? | No JSON covers them, so no endpoint can reach them and the validator would flag them. | Keep on disk, list them in the manifest as `variant: unassigned`, fail the validator. |
| Q-14 | Should `forgemind-ai` become a git repo? | It has 68 files and 36 MB and no `.git`. Nothing there is version-controlled, including the dataset. | Leave it. Not my call to initialise a repo. |
| Q-15 | `forgemind-backend/migrations/001` has no `body_size_slider` column, so the schema and the app already disagree. Confirm the app is the side that is wrong. | D-1, T-8. | The schema is right; the app field is the leftover. Matches your DROPPED ruling. |

---

## 7. PROPOSED — folding `CHANGELOG_V2.md` into `CHANGELOG.md`

**Nothing has been done. This is a plan for your approval, and the file rule stands: exactly one
changelog going forward, append-only.** I am not proposing to delete, truncate, renumber, or edit
any existing entry in either file.

### 7.1 Why the two files are hard to merge

Measured on 2026-09-30:

| | `CHANGELOG.md` | `CHANGELOG_V2.md` |
|---|---|---|
| Size | 351,287 bytes | 72,089 bytes |
| Lines | 5,364 | 1,987 |
| `##` entries | 86 | 16 |
| `###` sub-sections | 331 | 83 |
| Scope | "everything built so far", plain language | "**ONLY** Sprint 0 work — the critical foundation phase", per its own header |
| Newest entry | Sept 29, 2026, 12:53 | Sept 28, 2026, 21:30 |

The obstacle is not size, it is **overlap**. V2's window is Sept 28 21:30, and `CHANGELOG.md` has
entries dated Sept 27, Sept 28, and Sept 29. The two files interleave in time, so "append V2 to the
end of CHANGELOG.md" would put a Sept 28 entry after a Sept 29 one and break the chronological
order that the file is read in. V2 also contains at least one **superseded** record — `CHANGELOG.md`'s
newest entry already points readers into V2 for the full 3D history — so V2 is not merely additive;
some of it is the authoritative version of work the main file only summarises.

### 7.2 The proposal, in order

**Step 1 — Freeze, do not touch.** Leave `CHANGELOG_V2.md` byte-identical. Add exactly one line to
its header, below the existing text: *"Archived. Superseded by `CHANGELOG.md`; folded in on
\<date\>. This file is kept verbatim as the source of the folded entries."* Nothing else changes.

**Step 2 — Build a manifest before writing anything.** For each of V2's 16 `##` entries, produce a
row: heading, its position, the `##` entry it should land under in `CHANGELOG.md`, a SHA-256 of the
entry body, and a `verbatim | already-summarised | duplicate` verdict. Nothing is merged until every
row has a verdict, so the decision is reviewable before a single byte of `CHANGELOG.md` is rewritten.

**Step 3 — Classify each V2 entry into one of three buckets**, because they need different treatment:

| Bucket | Meaning | Action |
|---|---|---|
| **verbatim** | Sprint 0 detail with no counterpart in the main file | Copy the body **byte for byte** under a new `###`-level heading, tagged `[folded from CHANGELOG_V2.md]`. Text unchanged. |
| **already-summarised** | The main file already tells this story; V2 holds the long version | Do **not** paste a duplicate. Replace the main file's existing summary line with a pointer: *"Full record: CHANGELOG_V2.md, \<entry heading\>"* — one line changed, no history lost. |
| **superseded** | A later decision reversed it | Do **not** fold. Add a one-line pointer marked `[superseded]` so the reader is sent forward, never backward into a dead decision. |

**Step 4 — Insert chronologically, newest entry at the top of the file**, matching the file's
existing order (the newest `##` entry is currently at line 9). Each folded entry goes in
`CHANGELOG.md`'s true date position, so the result reads as one continuous history.

**Step 5 — Add the provenance line once, at the top of the folded block**, not per entry:

> Entries marked `[folded from CHANGELOG_V2.md]` were copied verbatim from the Sprint 0 changelog on
> \<date\>. `CHANGELOG_V2.md` is retained unmodified. Map: `docs/CHANGELOG_FOLD_MAP.md`.

**Step 6 — Verify, then only then stop writing V2.** Re-read the merged file and confirm: no entry
text changed, no `##` heading was deleted, entry count is exactly `86 + (verbatim bucket)`,
`git diff --stat` shows only additions plus the agreed Step 3 pointer lines, and a spot-check of
three entries matches the manifest hashes byte for byte.

**Step 7 — Going forward, every new entry goes to `CHANGELOG.md` only.** V2 is never appended to
again. That is the "one changelog going forward" rule, and it starts the moment this fold lands.

### 7.3 What I am explicitly not proposing

- Not deleting `CHANGELOG_V2.md`. It is the only place the full 3D/Sprint 0 record exists, and
  deleting the source of entries we just copied is how history gets lost. Keep it, frozen.
- Not creating a third file, a `docs/changelog/` directory, or a rotation scheme.
- Not rewriting, reformatting, or re-encoding the existing 86 entries, even though they are plain
  language and inconsistent. They are history; the mandate is append-only.
- Not doing any of this now. It is a docs-only change but it rewrites a 5,364-line artefact, so it
  wants its own review and its own changelog entry, separate from the three Phase 1 entries.

### 7.4 The one thing that needs your call

Whether the V2 entries should be **copied in full** (complete, but adds an estimated 16 entries and
83 sub-sections to a file that is already 5,364 lines) or **linked** (a compact pointer per entry,
which keeps `CHANGELOG.md` readable and leaves the detail in the archive). My recommendation is
**copy the verbatim bucket in full and link the already-summarised and superseded buckets** — full
history for the work that has no other record, pointers for the work that already has one.
