# ForgeMind — AI Listing Screener: Path Decision Document

**Phase:** Phase 4 (AI/ML Layer) — pre-work decision
**Date:** Tuesday, September 29, 2026
**Status:** 📋 PLANNING DOCUMENT ONLY — no implementation, no code changed
**Purpose:** Force an explicit, deliberate choice between two possible approaches to the listing
screener *before* any Phase 4 AI/ML work begins, so the work is not built on an assumption.

> **This document implements nothing.** The existing mock screener at
> `src/utils/listingScreener.ts` is untouched. Nothing in either path below has been built.

---

## 0. TL;DR — the decision

| | Path 1 — Hosted API | Path 2 — Custom dataset + training |
|---|---|---|
| **What it is** | Call a pre-trained hosted classifier (e.g. Google Cloud Vision) and map its output onto ForgeMind's permitted-category list | Build a labeled dataset of cosplay vs. non-cosplay listings and train/fine-tune your own model, self-hosted |
| **Is it in the build plan today?** | **Yes** — named explicitly in Phase 4 | **No** — appears nowhere |
| **Blocking prerequisite** | Choose a vendor, map labels, build the backend call | **Produce a dataset that does not exist and cannot exist before launch** |
| **Effort vs. Phase 4's 5–7 week budget** | Fits | Does not fit |
| **Recommendation** | ✅ **Take Path 1** | ⛔ Not now; revisit only if a documented trigger fires |

**The one-line reason:** the project currently has **6 seed listings and 0 listing photos**
(`src/screens/cosplayer/CreateListingScreen.tsx:138` hardcodes `photos: []`). A training path needs
labeled images. There are none, and there cannot be any until the marketplace has real users — which
is after this capstone is defended.

---

## 1. CURRENT STATE — what the source documents actually say, verbatim

This section quotes the two locked specification documents **word for word**. Nothing here is
paraphrased, because paraphrasing is exactly how a design assumption gets mistaken for a decision.

### 1.1 How the sources are cited

| Tag | Meaning |
|-----|---------|
| `ForgeMind.docx ¶N` | Paragraph *N* of `ForgeMind.docx`, in document order, 0-indexed (extracted with `python-docx`; 40 paragraphs, 0 tables) |
| `Build Plan ¶N` | Paragraph *N* of `ForgeMind_Overall_Data_Information.docx`, 0-indexed (59 paragraphs, 0 tables) |

Both files sit at the repository root, one level above `forgemind-mobile/`.

---

### 1.2 `ForgeMind.docx` — the concept document (what the screener *is*)

**The data the screener consumes** — `ForgeMind.docx ¶018` (under the heading `The Data:`):

> "A permitted-category list defining what the marketplace covers within the cosplay community, and
> the submitted photos, title, description, and category of every listing at the moment it is posted,
> used to automatically screen it against that list."

**The screening rule itself** — `ForgeMind.docx ¶028` (under `AI/ML (The Engine & Processing)`,
`Algorithms:`):

> "For the marketplace, every submitted listing is screened at the point of posting: its photos,
> title, description, and category are classified against a defined permitted-category list for the
> cosplay community, and any listing that does not match a permitted category is automatically
> blocked from going public before another user can see it."

**The requirement that it gets better over time** — `ForgeMind.docx ¶030`
(`Pattern Recognition:`):

> "The listing screener improves at distinguishing genuine cosplay-community items from unrelated
> ones as more listings and Holder appeal outcomes accumulate."

**The error tradeoff, stated explicitly** — `ForgeMind.docx ¶031` (`Optimization:`):

> "Listing screening is tuned to minimize both letting through unrelated postings and wrongly blocking
> legitimate cosplay-community items, with the Holder appeal path absorbing the errors the model
> cannot fully eliminate."

**That this is the one autonomous action in the whole system** — `ForgeMind.docx ¶035`
(`Autonomous Action:`):

> "The system automatically blocks a marketplace listing from going public the moment it is
> classified as falling outside the cosplay community's permitted categories. This is the one point
> in the system where the AI acts rather than only suggests, and it exists to keep the marketplace a
> safe, on-topic space. Every other module output remains a suggestion, including a proposed new
> style variant, which is never added to the shared reference without a user or Holder confirming
> it. The system never finalizes a purchase, confirms a trade, approves a commission, verifies
> identity, or assigns a final contest tier without human confirmation; the Holder alone performs
> identity verification and hears listing-block appeals, and every classification or transaction
> decision besides the initial listing screen remains human. It does not write captions, post
> content, or publish a completed build on a user's behalf; how a finished cosplay is described or
> shared is left entirely to the user. It never penalizes a user for disregarding a suggestion, and
> never reads or analyzes marketplace chat content. Beyond the listing screen, its only automated
> actions are notifications: task and transaction-milestone reminders, escalating logistics-deadline
> reminders, and commitment-change alerts routed only to the departments affected."

**The core AI principle this feature must not violate** — `ForgeMind.docx ¶003`:

> "The system's intelligence is applied to comparing items, estimating effort, forecasting outcomes,
> and organizing information, never to judging people or verifying identity."

**The appeal path's stated purpose** — `ForgeMind.docx ¶037` (`Scope and Limitation of the Study`):

> "…every listing is automatically screened against a defined permitted-category list at the point of
> posting, with anything outside that scope blocked before it goes public and a Holder appeal path
> available for disputed blocks; a transaction-scoped chat between verified parties operates
> alongside a required structured offer log for any pricing data the system computes on."

**The acknowledged failure mode** — `ForgeMind.docx ¶038`:

> "The study is limited in the following respects: suggestion quality across every module depends on
> the volume and quality of logged data, particularly early in deployment; … the automated listing
> screen judges only whether an item falls within the cosplay community's permitted scope, not its
> authenticity, condition, legal ownership, or safety, and may occasionally misclassify an unusual
> but legitimate item, which the Holder appeal path exists to correct; marketplace chat is
> transaction-scoped, never analyzed by the AI, and does not substitute for the structured offer
> required for pricing computations; and, except for the listing-block action, every system output is
> a suggestion rather than a final decision, including any proposed new style variant."

---

### 1.3 `ForgeMind_Overall_Data_Information.docx` — the build plan (how it gets built)

**Architecture: AI is called by the backend, never by the app** — `Build Plan ¶002`:

> "Four layers work together: a Flutter/React Native front-end app, a Firebase or Node/PostgreSQL
> backend handling auth, data, the listing screener, and live location relay, a Unity-based 3D module
> (embedded in-app) handling the blend-shape body and garment rendering, and a Python-based AI/ML
> service handling attire matching, readiness forecasting, and classification, called by the backend
> rather than directly by the app. Front-end development leads the whole build, since every other
> layer exists to serve data the screens need."

**The permitted-category list is a Phase 0 deliverable** — `Build Plan ¶007`
(`Phase 0: Foundation and Design (2 to 3 weeks)`):

> "Decide the permitted-category list for the marketplace screener (draft version, refined later with
> real listing data)."

**The Phase 3 trigger** — `Build Plan ¶033` (`Phase 3: Backend and Data Services (4 to 6 weeks, overlaps Phase 2)`):

> "Listing screener trigger: on submit, route the listing's photos/text to the AI/ML classification
> service before making it publicly visible."

**The Phase 4 deliverable** — `Build Plan ¶042` (`Phase 4: AI/ML Layer (5 to 7 weeks)`):

> "Marketplace listing screener: image + text classification against the permitted-category list."

**The Phase 4 toolchain — this is the sentence that names the current plan** — `Build Plan ¶046`:

> "Tools: Python, scikit-learn (rule-based/lightweight classifiers), a hosted image-classification
> API (e.g., Google Cloud Vision) for the listing screener's photo check, a text-classification
> endpoint for its title/description check, exposed to the app only through the backend."

**The named edge cases to test** — `Build Plan ¶050` (`Phase 5: Integration and Testing (3 to 4 weeks)`):

> "Test the listing screener against genuine edge cases (props that resemble weapons,
> cosmetics-adjacent items like contact lenses) alongside obvious non-cosplay items."

**The project's own stated philosophy on when a learned model is justified** — `Build Plan ¶040`:

> "Attire-to-character/variant matching: start as a rule-based attribute scorer (color/style/material
> comparison producing exact/close/loose), since your training data will be small early on; upgrade
> toward a learned model only once enough logged data exists to justify it."

---

### 1.4 ⚠️ Verification: neither document describes curating or training a custom dataset

The user asked for this to be checked rather than assumed. It was checked by scanning the extracted
text of **both** documents for `train`, `dataset`, `labeled`, `labelled`, `fine-tun`, `custom model`,
`labeling`, `annotation`, `supervised`.

**Every hit, in full:**

| Source | Sentence | Why it is not Path 2 |
|--------|----------|---------------------|
| `ForgeMind.docx ¶034` | "A generated group-meetup suggestion with the constraints it balanced." | False positive — the substring `train` inside the word `constraints` |
| `Build Plan ¶040` | "Attire-to-character/variant matching: start as a rule-based attribute scorer … since your training data will be small early on; upgrade toward a learned model only once enough logged data exists to justify it." | The **only** substantive mention of training anywhere — and it is about **attire matching, not the listing screener**. It is also an argument *against* jumping to a learned model early |

**Conclusion: the words "dataset", "labeled", "labelled", "fine-tune", "custom model", "annotation"
and "supervised" do not appear in either document at all.** Custom training of a screener is not
the documented plan. It is not the plan by omission *and* it is contradicted by `Build Plan ¶046`,
which names a hosted API.

**This is the single most important finding in this document.** Any future work that begins training
a screening model is departing from the spec, and must say so explicitly.

---

### 1.5 What exists in code today (the mock being replaced)

| Fact | Evidence |
|------|----------|
| The screener is explicitly a mock, and says so | `src/utils/listingScreener.ts:4` — "THIS IS A MOCK RULE-BASED SCREENER for Phase 1 front-end development." |
| It is a 26-term substring blocklist | `src/utils/listingScreener.ts:32-66` |
| It runs **client-side, in the app** — the opposite of `Build Plan ¶002` | `src/screens/cosplayer/CreateListingScreen.tsx:144` calls `screenListing(input)` directly |
| Check 1: exact-match against 8 permitted categories | `src/utils/listingScreener.ts:83`, list at `src/constants/marketplaceCategories.ts:9-18` |
| Check 2: case-insensitive substring over `title + description` | `src/utils/listingScreener.ts:94-101` |
| The "prop gun replica" false positive is already known and documented | `src/utils/listingScreener.ts:28-31` — "a legitimate cosplay listing containing a blocked word (e.g. 'prop gun replica') will also be blocked. That is an accepted limitation of a demo word-list and is exactly the gap the seller appeal path exists for." |
| The triggering term is deliberately **not** revealed in the block reason | `src/utils/listingScreener.ts:90-93` — "mirrors how real moderation systems avoid teaching sellers how to word around the filter" |
| **There are 0 listing photos in the project** | `src/screens/cosplayer/CreateListingScreen.tsx:138` — `photos: [], // No photo upload in Step 1` |
| There are 6 seed listings total | `src/data/marketplace_listings.json` |
| The appeal path exists and is wired | `AppealModal.tsx`, `ListingBlockedModal.tsx`, `MarketplaceContext.tsx:116` `submitAppeal()`, `CreateListingScreen.tsx:186-197` |

---

## 2. PATH 1 — Hosted classification API (as currently spec'd)

### 2.1 What it is

Call a pre-trained, vendor-hosted classifier for the photo, and a text-classification endpoint for
the title/description, and map both onto ForgeMind's permitted-category list. No training. No
custom dataset. This is what `Build Plan ¶046` already describes.

### 2.2 API selection

`Build Plan ¶046` names Google Cloud Vision as an *example* ("e.g."), so the choice is open. The
realistic candidate set:

| Candidate | Photo side | Text side | Fit for this project |
|-----------|-----------|-----------|----------------------|
| **Google Cloud Vision** | `LABEL_DETECTION` (web-scale object/label vocabulary with per-label `score` and `topicality`), plus `SAFE_SEARCH_DETECTION` | `TEXT_DETECTION` is OCR, not classification — text classification would need a separate model | **Named in the plan.** Per-label scores are useful for the appeal path. **But SafeSearch is adult/violence/racy only — it is not a weapons/drugs/counterfeit detector** |
| **AWS Rekognition** | `DetectLabels` (similar label vocabulary) | via Comprehend | Comparable; adds a second vendor relationship |
| **Azure AI Vision** | `Image Analysis 4.0` tags + dense captions | via Azure AI Language | Comparable; Azure Language has a ready-made text classification endpoint |
| **Vertex AI AutoML / custom model** | trained by you | trained by you | **This is Path 2, not Path 1** — see §3 |

**Constraint that applies to every option:** none of these ship a "cosplay marketplace prohibited
content" classifier out of the box. What they ship is a *general-purpose* label vocabulary. The
ForgeMind-specific judgement — *is this wig, or is this a real gun?* — has to be built on top either
way. In Path 1 that top layer is a **hand-written mapping from vendor labels to the permitted-category
list**. This is real work and it is the part most likely to be underestimated.

### 2.3 Cost model at the app's actual scale

**Google Cloud Vision list pricing** (per feature per image; the first 1,000 units of each feature
per month are free):

| Feature | First 1,000 units/mo | 1,001 – 5,000,000 | 5,000,001+ |
|---------|---------------------|-------------------|-------------|
| Label Detection | Free | $1.50 / 1,000 | $1.00 / 1,000 |
| Text Detection | Free | $1.50 / 1,000 | $0.60 / 1,000 |
| Safe Search Detection | Free | Free *when bundled with* Label Detection, else $1.50 | Free when bundled, else $0.60 |

At ForgeMind's real scale — 6 seed listings, and a thesis demo that will not see 1,000 real listing
submissions — **the screener costs $0.00.** It sits inside the free tier indefinitely. The cost model
is not a deciding factor at this scale; it only becomes one at a scale this project will not reach.

For reference, the same model at hypothetical scale (3 photos per listing):

| Monthly listings | Vision units (3/listing, 1 feature) | Monthly cost |
|------------------|--------------------------------------|--------------|
| 6 (today) | 18 | **$0.00** |
| 300 | 900 | **$0.00** |
| 1,000 | 3,000 | ~$3.00 |
| 10,000 | 30,000 | ~$43.50 |

### 2.4 What data leaves the device, and the privacy implications

**Sent to the third party, on every listing submission:**

- Every listing **photo** (image bytes, base64 or via a signed URL)
- The listing **title and description** as text
- The chosen **category**
- An API key (server-side only)

**Must never be sent, under any path:**

- **ID verification images.** `ForgeMind.docx ¶019` and the schema doc both treat front/back ID
  images as encrypted, reference-only, Holder-only data. `ForgeMind.docx ¶003` forbids the AI from
  "verifying identity." Route separation must be structural — ideally a *separate* service account
  and a separate credential with no access to the verification bucket. This is a design requirement,
  not a preference.
- **Marketplace chat content.** `ForgeMind.docx ¶007` ("Chat content is never read or used as AI
  input") and `¶035` ("never reads or analyzes marketplace chat content"). The schema doc already
  plans to enforce this with a database role that has no `SELECT` on `chat_messages`. Preserve that.
- **Live-location data.** Never persisted, never relevant (`ForgeMind.docx ¶035`, build plan `¶035`).
- **User profile fields** — email, display name, payout details. The screener needs none of these.

**Privacy assessment, stated plainly.** Listing photos are cosplay merchandise photos that the seller
has chosen to publish to a marketplace. Sending them to a hosted vision API is a materially smaller
disclosure than sending ID documents, and it is proportionate to the purpose. The genuine costs are:

1. **Third-party data processing.** Vendor terms govern retention and training use. This must be
   checked and disclosed — the app already has a `ConsentBanner` and a `policies.ts` privacy policy
   (`src/constants/policies.ts`), which is where the disclosure belongs.
2. **Availability dependency.** A vendor outage blocks listing creation entirely. Needs a
   fail-open/fail-closed decision: **recommend fail-closed with a retry** (a listing that cannot be
   screened must not go public — that is the one autonomous action in the system, per `¶035`).
3. **Ongoing egress.** Under Path 1, every future listing's photos go to a third party forever. Under
   Path 2, they stay in-house. This is the one real privacy argument for Path 2, and it is a genuine
   one — it is simply not decisive at this scale.

### 2.5 Latency expectations

No published SLA is being promised here; the following is an engineering estimate to plan against,
and **must be measured during Phase 5 integration, not assumed**:

- Label Detection round trip: typically **~200–800 ms** per image from an Asia-Pacific region,
  depending on image size and network path. Convention-floor Wi-Fi is the worst case and the build
  plan already anticipates poor connectivity (`Build Plan ¶052`).
- With 3 photos, round trips should be **batched into a single API call** (Cloud Vision accepts an
  array of requests), so wall-clock is roughly one round trip, not three. Batching is required, not
  optional.
- Text classification: sub-100 ms typically.
- **Design implication:** screening is a blocking step on the submit path. Budget **2 s** and show a
  real progress state. A listing submission that feels slow is a UX failure even if it is correct.

### 2.6 How it plugs into the existing backend-only architecture

`Build Plan ¶002` already establishes the rule: the AI service is "called by the backend rather than
directly by the app." The mock currently **violates** this — it runs in the app
(`CreateListingScreen.tsx:144`). Path 1 is therefore also the fix for an existing architectural
inconsistency.

Target flow, matching `Build Plan ¶033` ("on submit, route the listing's photos/text to the
AI/ML classification service before making it publicly visible"):

```
Mobile app  ──POST /listings──▶  Backend (Node/Express + PostgreSQL)
                                   │
                                   ├─ 1. persist listing as screening_result='pending'
                                   │      listing_status='blocked'   ← never public
                                   ├─ 2. load active permitted_categories
                                   ├─ 3. call AI/ML service ──────────▶ Vision API (label+safe-search)
                                   │                                 + text classifier
                                   ├─ 4. map vendor output → permitted-category verdict
                                   │      + per-label scores retained
                                   ├─ 5. UPDATE screening_result, screening_reason,
                                   │           write audit_events row
                                   └─ 6. if passed → listing_status='active', published_at=now
                                              if blocked → return reason, listing stays blocked
```

Required schema support (already present in `docs/database/SCHEMA_RECONCILIATION.md`):
`listings.screening_result`, `listings.screening_reason`, `listings.appeal_status`,
`listings.appeal_message`, and the append-only `audit_events` table. The vendor's raw label output
should be stored in `audit_events.event_data` so a block decision is reconstructable months later —
essential for a defense, essential for appeals.

**Work items in Path 1 (realistic):** vendor account + billing + API key management · backend
screening endpoint · the label→category mapping layer · the decision-combination logic · fail-closed
retry handling · audit logging · a fixture-based test set built from the `Build Plan ¶050` edge cases ·
replacing the client-side mock call.

---

## 3. PATH 2 — Custom dataset and self-hosted model

**This section deliberately does not flatter Path 2.** It is written to establish what the path
actually costs, so that choosing it is a decision rather than an accident.

### 3.1 Stage 1 — Data collection. This is where the path breaks.

**Where would positive examples come from?**
- Cosplay marketplace listings, e.g. AliExpress cosplay sections, eBay cosplay, Etsy cosplay,
  Cosplay.com classifieds. Reasonable volume exists.
- The project's own 6 seed listings — **irrelevant**, there are 6.
- The team's own photographs. A handful.

**Where would negative examples come from?**
- Generic marketplaces: real firearms, real ammunition, drugs, vehicles, real estate, live animals.
  Also reasonable volume.
- **But negatives are not a natural category.** "Not cosplay" is the *complement* of a fuzzy,
  community-defined boundary, and it contains a large grey zone: a costume sword accessory sold on
  a cosplay site is a *permitted* item; a real katana sold on the same site is not. Scraping
  "firearm listings from eBay" produces thousands of easy negatives and zero hard ones. The hard
  cases — the ones the model would actually need to learn — are precisely the ones that require a
  human to make a judgement call about cosplay.

**Scale reality check.** A defensible image classifier at this task typically wants **thousands**,
optimally tens of thousands, of labeled examples. The realistic collection target here is hundreds,
with a heavily skewed difficulty distribution. That is below the floor for training a model that
beats a well-written rule set.

**The circularity problem, stated plainly.** If the team labels the dataset themselves, the model
learns the labeler's rules. If the labeling rules are the thing the model was supposed to discover,
there is nothing gained — a network has merely been trained to reproduce a hand-written blocklist,
with added latency, added hosting, and reduced explainability. The only way Path 2 escapes this is
if the labels come from **real users and real Holder appeal outcomes** — which, per `ForgeMind.docx
¶030`, is exactly the improvement mechanism the spec describes, and which does not exist until after
launch. **Path 2 is therefore not merely expensive; at this stage it is logically unavailable.**

### 3.2 Stage 2 — Labeling

- **Who labels?** No annotation team exists. Realistically the developer(s), possibly a classmate.
  At ~30–60 seconds per image for a judgement that requires knowing cosplay, **1,000 images ≈
  8–16 hours** of someone's time. 5,000 images ≈ 2–3 weeks of full-time work — which is
  **half of Phase 4's entire 5–7 week budget**, spent on one of Phase 4's six deliverables.
- **Labeling schema.** Needs to encode ForgeMind's own taxonomy: `permitted_categories` with
  `description`, `examples`, and `edge_case_notes` columns (all three already in the schema doc), plus
  a per-label confidence and a required reason field on every negative. The `edge_case_notes` column
  is the correct home for exactly the prop-gun problem.
- **Edge cases, and the killer one.** The `Build Plan ¶050` list names them: *props that resemble
  weapons, cosmetics-adjacent items like contact lenses*. A **foam EVA katana** and a **real katana**
  are visually near-identical in a listing photo. A **prop gun replica** and a **real firearm** are
  more similar still. No image classifier, trained or hosted, resolves this reliably from pixels
  alone — the distinction is often *conveyed by the text* ("foam, EVA, 3-blade, cosplay prop") and
  sometimes not at all. This is not a dataset-size problem that more data fixes; it is an
  information-availability problem in the input.
  **The honest conclusion: the appeal path is not a nice-to-have here, it is the mechanism.** It is
  the only thing that resolves the genuinely ambiguous case, and it is already built
  (`AppealModal.tsx`, `submitAppeal()`). That is an argument for investing effort in the appeal and
  audit experience — not for training a model.
- **Inter-annotator agreement.** With one or two labelers there is no way to measure label quality.
  A custom model trained on unmeasured labels inherits unmeasured error, which is worse than a
  transparent rule set because it is invisible.

### 3.3 Stage 3 — Training / fine-tuning

- **Model family.** For images: a pretrained CNN backbone (EfficientNet / ResNet / ViT) fine-tuned
  on the custom set. For text: a pretrained transformer (BERT / DistilBERT) fine-tuned for
  multi-label classification.
- **Infrastructure.** Managed (Vertex AI AutoML, AWS SageMaker) or raw. Managed AutoML image
  classification training is **$3.465/node-hour**; a deployed online-prediction endpoint is
  **$1.375/node-hour ≈ $990/month**, billed continuously. Raw custom training on a comparable
  `n1-standard-4` is far cheaper per hour (~$0.22) but requires managing the training code,
  containers, and hardware yourself.
- **Honest comparison:** at this scale, **training compute is cheap and irrelevant** — the bill would
  be single-digit dollars. The cost of Path 2 is *not* compute. It is the labeling hours in §3.2 and
  the maintenance in §3.5. Anyone who picks Path 2 to "save money" has misread the trade.

### 3.4 Stage 4 — Hosting

An in-house model must run somewhere, permanently:

- A **managed endpoint** (~$990/month for 24/7 image classification) — the simple option, and still
  an ongoing cost for a thesis project.
- **Self-hosted inference** on a small VM or a container — cheaper, but now the team owns uptime,
  scaling, TLS, model versioning, and rollbacks for a model that will be retrained in §3.5.
- A **`screening_result='failed'` state** and retry logic, because now there is a component you can
  take down. Under Path 1 that risk is the vendor's; under Path 2 it is the team's.

### 3.5 Stage 5 — Ongoing maintenance (the cost that recurs forever)

- **Retraining cadence.** As new prohibited-item categories emerge — and they will, per `Build
  Plan ¶007` ("refined later with real listing data") — the model must be retrained, revalidated,
  redeployed, and monitored. Realistically monthly-to-quarterly. Each cycle is a repeat of §3.2 and
  §3.3.
- **Regression risk.** Every retrain can degrade performance on previously-correct cases. Without a
  held-out regression set and a CI gate, retraining is an unbounded source of new bugs. Under Path 1
  the vendor absorbs this.
- **Drift monitoring.** Cosplay trends change what a "cosplay item" looks like. A model trained in
  September is miscalibrated by next year's conventions. Somebody has to notice.
- **On-call.** A self-hosted model that 503s during a defense demo is a catastrophic failure mode
  that Path 1's managed endpoint largely removes.

### 3.6 Effort summary — stated without hedging

| Stage | Realistic effort | Status at this project |
|-------|------------------|------------------------|
| Data collection | 2–4 weeks | **Blocked** — no images exist |
| Labeling | 2–3 weeks | **Blocked** — no labels exist, no annotators |
| Training pipeline | 1–2 weeks | Not started |
| Hosting + inference | 1 week | Not started |
| Retraining + monitoring | Ongoing, ~1 week per cycle | Not started |
| **Total before first working model** | **6–11 weeks** | — |
| **Phase 4 budget** | **5–7 weeks** | — |
| **Phase 4's other five deliverables** | attire matching, new-variant detection, readiness forecasting, trade-fairness/pricing, contest tiers | Would receive **zero** time |

**Path 2 does not fit inside Phase 4. It would consume the entire phase and deliver one of six
deliverables.** That is the whole argument, and it is an arithmetic one.

---

## 4. ALIGNMENT CHECK AGAINST `ForgeMind.docx`

Three principles from the spec constrain this decision. Each is checked against each path.

### 4.1 "The system's intelligence is applied to comparing items, estimating effort, forecasting outcomes, and organizing information, never to judging people or verifying identity." — `ForgeMind.docx ¶003`

| | Path 1 | Path 2 |
|---|---|---|
| Alignment | ✅ **Confirms.** The screener judges an *item's category*, not a person. It does not touch identity at all — `¶019` makes verification Holder-only, and `¶003` forbids the AI from it | ✅ **Confirms in principle** — the output type is identical |
| Risk | The `permitted_categories` list is a project artefact; if anyone drifts toward "who is this seller looks like", this is the mechanism that could be misused. Keep the endpoint's input strictly `{photos, title, description, category}` and nothing else | Same risk, plus a bigger surface: a trained model encodes its training data's assumptions, and those are harder to audit than a rule set |

**No conflict for either path.** But note the sharper point: this principle is the reason the
screener may exist at all. It classifies a listing, not a cosplayer. Neither path changes that.

### 4.2 "This is the one point in the system where the AI acts rather than only suggests" — `ForgeMind.docx ¶035`

This is the load-bearing constraint. The screener is the **only** autonomous action in the entire
system, so its accuracy and its appeal path matter more here than anywhere else.

| Criterion | Path 1 | Path 2 |
|-----------|--------|--------|
| **Explainability of a block** | ⚠️ **Partial.** Cloud Vision returns a per-label score, so a block can be recorded as *"image scored 0.94 on 'firearm'"* — a vendor-defined label, but a real, inspectable number | ✅ **Better on paper.** A custom model scores directly against ForgeMind's own taxonomy, so the explanation is in the project's own vocabulary |
| **Which is actually safer?** | ⚠️ The Vendor-label indirection is a real weakness: "the image looked like a gun to Google" is a weaker appeal story than "our own model scored this 0.94 on prohibited-weapon." But the scores are inspectable and logged | ⚠️ **But an unvalidated model is not more trustworthy — it is less.** Without a held-out test set, a custom model's 0.94 carries no more evidential weight than a vendor's 0.94. Per §3.1, at this data scale the custom model would be reproducing hand-written rules with lower transparency |
| **A wrong block** | Seller appeals, Holder reviews — the built path absorbs it | Same |
| **A wrong pass-through (FN)** | **This is the dangerous direction.** A real firearm listed in a cosplay marketplace is the exact harm `¶035` says the feature exists to prevent, and it is **not recoverable by appeal** — the listing was public | Same |

**Verdict: no blocking conflict for either path.** Path 2 offers a nominally better explanation format
and a materially worse evidence base. Under the "one autonomous action" constraint, **evidence beats
vocabulary** — Path 1's inspectable, vendor-benchmarked, reproducible score is the more defensible
position at a defense than an unvalidated custom score in the project's own words.

### 4.3 "The Holder appeal path exists specifically to absorb the model's unavoidable errors" — `ForgeMind.docx ¶031`, `¶037`, `¶038`

This is the principle that most shapes the recommendation, because it establishes a deliberate
**error asymmetry**:

| Error | Meaning | Recoverable? | Spec's stance |
|-------|---------|--------------|---------------|
| **False positive** — legitimate cosplay item wrongly blocked | A seller loses a submission and files an appeal | **Yes** — the appeal path exists precisely for this | `¶038`: "may occasionally misclassify an unusual but legitimate item, **which the Holder appeal path exists to correct**" |
| **False negative** — unrelated/prohibited item passes | A prohibited item is public in a cosplay marketplace, visible to everyone, and may be acted on before anyone reviews it | **No** — nobody is watching a live feed | `¶035`: the block "exists to keep the marketplace a **safe**, on-topic space" |

**The asymmetry is not a judgment call; it is written into the spec.** `¶031` asks for both to be
minimized, but `¶037`/`¶038` say the appeal path is what absorbs the residual error — which only
makes sense if the residual error being absorbed is the *recoverable* kind. So the correct operating
point is **FP-tolerant, FN-strict**: set the threshold so borderline items pass to a human rather than
being auto-blocked on weak evidence, and make the block path require strong evidence.

**How each path affects that tradeoff:**

- **Path 1 — tunable, and tunable in the right direction.** Cloud Vision returns a continuous `score`
  (and a `topicality` value) per label. The block threshold is a **number you can set, log, and
  justify** — "block at ≥ 0.85, route 0.60–0.85 to the appeal queue, pass below." Tuning that
  number against a fixture set is exactly the `¶031` "tuned to minimize both" language, made concrete.
- **Path 2 — also tunable in principle**, but you cannot tune what you cannot measure. With no
  held-out set and no appeal-outcome history, the threshold is set by guesswork and defended by
  assertion. Under the one-autonomous-action constraint, **an untunable threshold is a safety defect.**

### 4.4 ⚠️ The alignment gap neither path closes on its own

`ForgeMind.docx ¶030`:

> "The listing screener improves at distinguishing genuine cosplay-community items from unrelated ones
> as more listings and Holder appeal outcomes accumulate."

**A hosted API does not improve from ForgeMind's appeals.** Cloud Vision's weights are Google's, and
they do not move because a Holder overturned a block in this app. Read literally, `¶030` describes
something closer to a feedback loop than a vendor call.

This is the strongest argument in the document **for** Path 2, and it should not be waved away. It is
also, fortunately, satisfiable **without** Path 2:

> **Required in both paths — a feedback-capture loop, not a second model.**
> Log every screening decision with its inputs, its scores, its verdict, and the appeal outcome, into
> `audit_events`. The schema already supports this (`audit_events.event_data` JSONB, append-only). The
> "improvement" in `¶030` can then be demonstrated honestly as **threshold and mapping-rule refinement
> driven by observed appeals** — which is a real, defensible, buildable mechanism, and is the same
> mechanism `Build Plan ¶040` endorses for attire matching ("upgrade toward a learned model only once
> enough logged data exists to justify it").
>
> **This is the bridge:** it satisfies `¶030` now, produces the dataset Path 2 would need *later*,
> and makes the Path 2 decision revisitable with evidence instead of guesswork.

---

## 5. RECOMMENDATION

### ✅ Take Path 1 (hosted classification API), plus feedback capture.

This is the recommendation because it is what the build plan already says, because it fits the
project's actual scale, and because Path 2 is not merely more expensive — at this stage it is
**logically unavailable**.

**The reasoning, plainly:**

1. **It is the documented plan.** `Build Plan ¶046` names a hosted image-classification API and a
   text-classification endpoint, backend-exposed only. Nothing in either locked document describes
   curating or training a screener dataset (§1.4). Choosing Path 1 is following the spec; choosing
   Path 2 is amending it, and amending it silently is exactly what this document exists to prevent.

2. **The project's own stated philosophy points the same way.** `Build Plan ¶040` says, in the very
   same phase, to "start as a rule-based attribute scorer … since your training data will be small
   early on; upgrade toward a learned model only once enough logged data exists to justify it."
   Applying that sentence consistently means the screener starts hosted too.

3. **Path 2's blocker is data, not money or skill.** There are **0 listing photos** and **6 seed
   listings**. A custom model needs labeled images that do not exist and cannot exist until real users
   are posting — which is after the defense. The compute is cheap (single-digit dollars); the labeling
   is 2–3 weeks; and the whole pre-first-model path is **6–11 weeks against a 5–7 week phase**, which
   would deliver one of six Phase 4 deliverables and starve the other five.

4. **Path 2 would make the system's one autonomous action *less* explainable, not more.** `¶035` makes
   this the single point where the AI acts. At this data scale a custom model is a hand-written rule
   set behind a neural network — lower transparency, untunable threshold, no held-out evidence —
   for the feature that most needs to be defensible. Under `¶031`/`¶038`, an untunable threshold is
   a safety defect, not a sophistication.

5. **The cost argument is a non-issue, and pretending otherwise is a mistake.** At 6 listings, Vision
   is **$0.00** — permanently inside the free tier for any plausible demo load. Path 2 would add
   ~$990/month of endpoint cost *and* 2–3 weeks of labeling to build something the spec did not ask
   for, on a budget that does not cover it.

**What is given up by choosing Path 1 — stated, not hidden:**

- The screener's accuracy is capped by a general-purpose vendor model, not tuned to cosplay.
- The blocked-reason vocabulary is Google's, not ForgeMind's, so appeal explanations are slightly
  weaker (§4.2).
- **Listing photos leave the device to a third party**, permanently, with all the consent, terms and
  egress implications in §2.4. This is the one argument that genuinely favors Path 2, and it should be
  disclosed to users rather than dismissed.
- `¶030`'s "improves over time" is **not** satisfied by the vendor call alone. It requires the
  feedback loop in §4.4, which is a real engineering obligation, not a freebie.

**This recommendation is a starting position, not a permanent verdict.** It should be revisited — with
real numbers, not with impressions — the moment a documented trigger fires. Those triggers are in §6.3.

---

## 6. AWAITING USER DECISION

### 6.1 What must be decided, and by when

**Decision required: Path 1 or Path 2 for the Phase 4 listing screener.**

**Deadline: before any Phase 4 AI/ML work begins.** Concretely, this must be settled before the
Phase 4 build starts — and per `Build Plan ¶029`, Phase 3 (backend, 4–6 weeks) is where the screener
trigger endpoint gets built, so the decision is needed **before Phase 3 Step 2 (backend
implementation) begins**, not merely before Phase 4. Choosing late means writing a backend endpoint
against the wrong contract.

**Status: ⏳ AWAITING USER DECISION.**

| | |
|---|---|
| **Question 1** | Path 1 (hosted API — recommended) or Path 2 (custom dataset + training)? |
| **Question 2** | If Path 1: which vendor — Google Cloud Vision (named in the plan), or AWS Rekognition / Azure AI Vision? |
| **Question 3** | If Path 1: which vendor, what fails when the API is down — **fail closed** (recommended: never let an unscreened listing go public, per `¶035`) or fail open? |
| **Question 4** | The threshold policy from §4.3 — confirm **FP-tolerant / FN-strict**, i.e. auto-block only on strong evidence and route borderline cases to the appeal path rather than blocking them automatically |
| **Question 5** | Confirm the feedback-capture loop (§4.4) is in scope, since it is what actually satisfies `¶030` |
| **Question 6** | Confirm the privacy position: listing photos (and only listing photos) are sent to a third party, disclosed in `policies.ts` + the consent banner, with ID images, chat content and location data **structurally excluded** |
| **Question 7** | The `"Other"` category problem — `src/constants/marketplaceCategories.ts:17` offers `'Other'` as a permitted category, but `ForgeMind.docx ¶028` blocks "any listing that does not match a permitted category." `'Other'` is self-defeating as a classification target. **Does `'Other'` stay as a permitted category, or does selecting it force routing to the Holder instead of auto-publish?** |

> **Question 7 is a genuine spec ambiguity, not an implementation detail.** It should be settled
> before the classification logic is written, because it changes the contract.

### 6.2 What this decision does *not* block

Choosing Path 1 does not block the Phase 3 backend work, the `listings` table, the
`audit_events` table, or the appeal path — all of which are needed under either path. The only thing
blocked pending the decision is the **screening endpoint's contract**: which service it calls, what it
sends, and what it returns.

### 6.3 Documented triggers to reopen this decision

The recommendation should be re-examined — with data, not with impressions — if **any** of these
become true:

| # | Trigger | Why it matters |
|---|---------|----------------|
| 1 | The marketplace accumulates **≥ 5,000 real listings** with photos **and** a meaningful number of Holder appeal outcomes | Path 2's core prerequisite finally exists. Re-evaluate against real appeal data — the only label source that escapes the circularity problem in §3.1 |
| 2 | Phase 4 testing (`Build Plan ¶050` edge cases) shows the hosted API performs **materially worse** than the current rule set on prop-vs-real distinctions | Evidence of a real accuracy ceiling, not a guess |
| 3 | A privacy or institutional requirement prohibits **any** third-party processing of user-uploaded images | Path 1 becomes non-viable regardless of its other merits. This is the one trigger that overrides everything else |
| 4 | The permitted-category list stops being a 8-item draft and becomes a large, actively-maintained taxonomy (`permitted_categories` growing well past ~50 rows) | At that size the label→category mapping layer in Path 1 (§2.2) may become the bottleneck, at which point a trained classifier over the project's own taxonomy becomes the better shape |

**Triggers 1 and 4 are the realistic ones, and both require the marketplace to be live. Neither can
fire before this capstone is defended.**

---

## 7. CROSS-REFERENCE

| Document | Relationship |
|----------|-------------|
| `docs/database/SCHEMA_RECONCILIATION.md` | Provides `permitted_categories`, `listings.screening_result` / `screening_reason` / `appeal_status` / `appeal_message`, and the append-only `audit_events` table this feature depends on. **Not yet approved** |
| `ForgeMind.docx` | Locked concept spec. Every claim in §4 is quoted from it |
| `ForgeMind_Overall_Data_Information.docx` | Locked build plan. Phase 4 duration, toolchain, and phase boundaries are quoted from it |
| `src/utils/listingScreener.ts` | The mock this replaces. **Not modified by this document** |
| `src/constants/marketplaceCategories.ts` | The draft permitted-category list from `Build Plan ¶007`. Contains the `'Other'` ambiguity in Question 7 |
| `src/screens/cosplayer/CreateListingScreen.tsx` | Where the mock is called client-side, and where `photos: []` is hardcoded |
| `AppealModal.tsx`, `ListingBlockedModal.tsx`, `MarketplaceContext.tsx` | The Holder appeal path that `¶031`/`¶037`/`¶038` make load-bearing. Already built |

---

**END OF LISTING SCREENER AI PLAN — AWAITING USER DECISION**
