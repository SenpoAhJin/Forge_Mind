# ForgeMind — Sprint Plan (corrects the Kiro setup guide)

Read `CLAUDE.md` first — its decisions are authoritative. This file operationalizes
them into a week-by-week plan. It **supersedes** `FULL_IMPLEMENTATION_SETUP.md`
and `QUICK_START_ACTION_PLAN.md` wherever they conflict — specifically, drop
`react-native-unity-view` and any native-Unity-bridge step from those docs. Keep
everything else from them; the sprint boundaries, checklists, and cost estimates
were sound.

## The one correction, stated once so it doesn't get re-litigated per sprint

Unity stays. Blender stays. Mixamo stays. What changes is the **export target and
embed method**: Unity's build target is **WebGL**, producing a static HTML/JS/WASM
bundle you ship as an app asset, loaded through `react-native-webview` — not
`react-native-unity-view`, not any native plugin. This needs no Android SDK, no
emulator, no EAS dev build, and it runs in plain Expo Go today. It also means the
3D layer has **zero ongoing hosting cost** — it's a bundled asset, not a server —
which changes the cost estimate below in your favor versus Kiro's number.

## Sprint 0 — Foundation (1 week)

Keep from Kiro's guide: Node v18+, Python 3.10+ venv, Git LFS for large assets,
VS Code extensions, Firebase Blaze plan upgrade, Google Cloud Vision service
account, git tag `v0.6-baseline` before touching anything.

Change from Kiro's guide:
- Install Unity 2022.3 LTS as normal, but when creating the project, set the
  **build target to WebGL** (Build Settings → Platform → WebGL) from day one, not
  as an afterthought. Confirm a trivial default scene builds and produces an
  `index.html` + `Build/` folder before writing any real content — this is your
  smoke test that the pipeline works in principle.
- Add `react-native-webview` to the Expo project now (`npx expo install
  react-native-webview`). Do **not** add `react-native-unity-view` or
  `@react-native-firebase/*` native packages that require config plugins beyond
  what Expo's managed workflow / EAS supports without a dev client — check each
  package's install notes for "requires custom native code" before adding it.
- Confirm the trivial WebGL build loads inside a `WebView` pointed at a bundled
  local asset (`source={{ uri: 'file:///android_asset/...' }}` on native,
  a relative path on web) before Sprint 2 starts. This is the actual foundation —
  if this doesn't work, everything downstream needs re-planning, so find out in
  week 1, not week 4.

## Sprint 1 — Holder Verification (2 weeks)

Follow `HOLDER_ROLE_IMPLEMENTATION_SPEC.md` already in the repo. No changes needed
from that spec; Kiro's 2-week estimate matches its scope (data model + migration
order + two new screens + self-check list).

## Sprint 2–3 — 3D Visualization (7 weeks, the long pole either way)

1. **Weeks 1–2:** Two base body meshes (male/female) in Blender, each with a
   continuous blend shape spanning the full size range (plus-size included in the
   same range, not a separate mesh, per the governing spec). Rig via Mixamo
   reference. Export into Unity, confirm the blend shape drives correctly at
   several slider positions in the Unity editor before building anything else.
2. **Week 3:** Starter garment set (wig, top, bottom, dress, shoes) per gender,
   skinned to deform with the blend shape. Build the WebGL bundle, load it in the
   `WebView`, confirm it renders on both the web/phone-frame preview and a real
   device via Expo Go — this is the checkpoint that proves the whole chain works
   end to end, same milestone as "Phase 0" in `3D_PREVIEW_SETUP_SPEC.md`, just now
   done in real Unity instead of `<model-viewer>`.
3. **Weeks 4–5:** Dress-up renderer logic — given matched item IDs + stored
   slider value, apply blend shape, layer garments, fill gaps with the default
   casual set. Bridge data in/out of the WebView via `postMessage`/
   `injectedJavaScript`, matching how `Preview3D.tsx` was scoped.
4. **Weeks 6–7:** Drape tuning at multiple slider points (not just the two
   extremes), plus the variant-specific costume swap from Phase 1 of the earlier
   spec — one variant asset at a time, not all at once.

Kiro's red flag stands, corrected for cause: **if nothing renders in the WebView
by the end of week 3, the problem is almost certainly the WebGL build/bundling
step (asset paths, WASM MIME type, bundle size), not "Unity is too hard."** Debug
the build pipeline specifically before concluding 3D needs descoping.

## Sprint 4 — Live Location (3 weeks)

Keep Kiro's stack: Firebase Realtime Database, `expo-location`,
`react-native-maps`. Hard requirement from the governing spec, not optional:
per-event opt-in, broadcast only to other opted-in members of the same event
group, session ends automatically when the event ends or sharing is disabled,
**no location data retained once the session ends** — build the cleanup as part
of the feature, not a follow-up.

## Sprint 5 — AI Attire Matching (4 weeks)

Keep Kiro's stack: Python/Flask, scikit-learn. One correction of emphasis, not
mechanics: start **rule-based** (color/style/material attribute scoring →
exact/close/loose), per the build plan — do not reach for a trained classifier
yet, there's no logged data to train on this early. Cloud Vision is fine here for
photo auto-categorization stub input, not for the matching decision itself.

## Sprint 6 — Listing Screener (3 weeks)

Keep Kiro's stack: Cloud Vision (image) + a text-classification endpoint
(title/description) against the permitted-category list. This is the one place
in the whole system allowed to act autonomously (auto-block at submission) — the
Holder appeal path (already in `HOLDER_ROLE_IMPLEMENTATION_SPEC.md`) is what
absorbs its errors, so build the appeal review screen in the same sprint as the
screener, not later.

## Sprint 7 — Integration & Testing (2 weeks)

Keep Kiro's checklist. Add: test the WebGL 3D viewer specifically across the full
slider range on a real device through Expo Go, not just the web preview — WebView
rendering behavior can differ between platforms in ways the browser preview won't
catch.

## Cost estimate, corrected

Kiro's $35–300/month assumed ongoing Unity-related hosting/runtime cost. With the
WebGL-bundled-as-asset approach, 3D adds **$0** ongoing cost — it's static files
in the app, not a server. Remaining costs are Firebase (Blaze, usage-based) and
Google Cloud Vision (per-call), which Kiro's $35–80/month "minimal" tier already
covers reasonably. Set the spending alert Kiro recommended regardless — that
advice was sound.

## Red flags, kept from Kiro's guide, cause corrected where noted

- Week 3 (not week 4): WebGL build not rendering in `WebView` → debug the build/
  bundling pipeline, not "3D is too hard" (see Sprint 2–3 note above).
- Week 8: no AI matching working → confirm you're still on the rule-based scorer,
  not stuck trying to train a model prematurely.
- Week 12: 3+ features incomplete → reduce scope, same as Kiro's guide said.
- Week 16: still writing new features → stop, test what exists, same as Kiro's
  guide said.

## What to do with Kiro's other four files

`IMPLEMENTATION_STATUS.md`, `MISSING_FEATURES.md`, and `BUTTON_AUDIT.md` are point-
in-time audits — keep them as historical record, don't treat them as living specs.
`FULL_IMPLEMENTATION_SETUP.md` and `QUICK_START_ACTION_PLAN.md` — keep the
installation/checklist mechanics (Firebase steps, Day 1–7 schedule, tool
installs), strike every native-Unity-bridge instruction, replace with the WebGL
target instructions in Sprint 0 above.
