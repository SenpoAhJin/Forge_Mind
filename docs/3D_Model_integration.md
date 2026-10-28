# ForgeMind — 3D Body Model Integration: Milestones & Roadmap

**Purpose:** Track the integration of the already-built Blender male/female base bodies (Rigify-based, `body_size` custom-property driver, per-bone scale table) into the live ForgeMind app, replacing the current React-Three-Fiber placeholder/proof-of-concept in `Preview3D.tsx`.

**Why a separate roadmap doc:** This is a multi-phase, technically risky integration (glTF export does not carry Blender drivers), so it's tracked here as its own milestone ladder rather than as a single FE-style step. Each milestone below becomes its own scoped Claude Code task prompt, same workflow as FE-6/FE-7.

---

## Current State (as of Sept 27, 2026)

**Assets already built, living in `forgemind-ai/datasets/`:**
- `Male_3D_Model/` — `3D_Model_Male.blend`, `3D_Model_Male.glb`, front/left/right/back reference renders
- `Female_3D_Model/` — `3D_Model_Female.blend`, `3D_Model_Female.glb`, front/left/right/back reference renders
- Both rigs share a Rigify-derived human metarig with identical `DEF-*` bone naming
- Both rigs have a `body_size` custom property (0.0–1.0) on the armature, driving per-bone scale via scripted drivers: `1 + 0.15 * body_size`
- Bones are classified `aligned` (scale X+Z only, skip the length axis) vs. `rolled` (scale all 3 axes), based on each bone's local-Y-in-world-space alignment
- `inherit_scale` is set to `NONE` on every target bone, so the widening does not compound down bone chains
- A shared `body_size_bone_scale.json` table records each target bone's scale-at-`body_size=1.0`, generated from the same script for both rigs
- Verified: classification and pelvis-width behavior (8.3% loose-threshold / 14.7% strict-threshold measured widening, consistent with the driver's 15% target after accounting for skin-weight blending at joints) match on both rigs

**Known hard constraint:** glTF/.glb export does **not** preserve Blender drivers or custom properties as runtime logic. Only the rest-pose skeleton and skin weights survive. This means the `body_size` slider behavior must be **reimplemented client-side** — the .glb gives us the skeleton and mesh, and `body_size_bone_scale.json` gives us the target values; the runtime interpolation and the `inherit_scale = NONE` behavior have to be rebuilt in Three.js/React Three Fiber, since Three.js bones always inherit parent scale by default.

**App-side 3D stack (per earlier Sprint 0 decision):** React Three Fiber (`@react-three/fiber`, `@react-three/drei`, `expo-gl`, `three`), not Unity. `Preview3D.tsx` currently only has a rotating-cubes / simple-scale placeholder.

---

## Milestone 0 — Asset Pipeline & Verification
**Goal:** Get the real .glb files into the app repo correctly, and confirm nothing was lost or altered on export.

- [ ] Move/copy both `.glb` files and `body_size_bone_scale.json` into the Expo app (e.g. `assets/models/`), Git LFS tracked
- [ ] Write a small verification script (Node + `@gltf-transform` or three.js `GLTFLoader` in a headless context) that loads each `.glb` and confirms:
  - All `DEF-*` bones referenced in the JSON table exist in the loaded skeleton by name
  - The skinned mesh has a valid skin index / bone weights
  - Bones are at rest scale `(1,1,1)` on load (i.e., exported at `body_size = 0`, not baked mid-widen)
- [ ] Confirm male and female bone name sets match 1:1 (already true per the classification printout, but re-verify against the actual exported skeleton, not just Blender's pose bones)

## Milestone 1 — Base Model Loader (no slider logic yet)
**Goal:** Render the real base body in the app, unscaled, replacing the placeholder geometry.

- [ ] Build a `BodyModel` component using `useGLTF` (drei) to load the male or female `.glb` by prop
- [ ] Confirm materials/textures render correctly on device and web preview
- [ ] Confirm camera framing, lighting, and `OrbitControls` work the same as the existing `Preview3DTestScreen` cube/placeholder test
- [ ] No body-size scaling applied yet — this milestone is purely "does the real asset load and look right"

## Milestone 2 — Body-Size Runtime Scaling (highest technical risk)
**Goal:** Reproduce the Blender driver behavior — including the `inherit_scale = NONE` behavior — entirely in JS, driven by a 0–1 slider.

- [ ] Load `body_size_bone_scale.json` and build a `boneName -> scaleAtMax [x,y,z]` lookup
- [ ] On slider change, for each target bone, set local scale to a linear interpolation between `(1,1,1)` and `scaleAtMax` using the slider value (mirrors the driver's `1 + 0.15 * value` expression, generalized to the per-bone axis set already baked into the JSON table)
- [ ] Solve the inherit-scale problem: Three.js `Bone` objects (as `Object3D`) always inherit parent scale when composing world matrices, unlike Blender's per-bone `inherit_scale` setting. This needs an explicit fix — most likely decomposing each target bone's parent world matrix, discarding its scale component, and recomposing before applying the bone's own local scale — so a scaled pelvis doesn't compound into scaled thighs/shins below it.
- [ ] Validate visually against the Blender reference renders at `body_size = 0.0`, `0.5`, and `1.0` — the app's rendered silhouette at each point should match Blender's viewport at the same slider value, not just at the two extremes
- [ ] Wire the real slider UI into this logic, replacing the placeholder `morphFactor` prop-based scaling in `Preview3D.tsx`

## Milestone 3 — Onboarding & Persistence
**Goal:** Connect the real model + slider to the actual user data flow described in the spec docs.

- [ ] Body-slider onboarding screen (male/female base body selection + slider, set once, editable later) writes to the user's stored profile value (per `ForgeMind.docx`'s data section — no scan/measurement, just the stored slider value)
- [ ] The 3D dress-up viewer screen (currently a Phase-1 placeholder) is rewired to use the real `BodyModel` + the user's stored slider value instead of mock data

## Milestone 4 — Multi-Point Slider Testing **[CANCELLED - October 14, 2026]**
**Status:** CANCELLED. Body-size slider feature permanently removed. App uses fixed male/female GLB bodies only.

**Original Goal:** Per the spec's explicit optimization note — drape/deformation must be tuned across the *whole* slider range, not just the two ends.

~~- [ ] Test and screenshot the rendered body at 5+ evenly spaced slider positions (not just 0.0/1.0)~~  
~~- [ ] Confirm no visible seams, kinks, or clipping at any tested position, on both male and female rigs~~

**Reason for Cancellation:** Runtime bone scaling complexity vs. benefit. Fixed bodies simplify 3D preview system.

## Milestone 5 — Garment Layering (deferred, explicitly out of scope until garments exist)
**Goal:** Layer skinned garment assets (wig, top, bottom, dress, shoes) onto the deformed base body per the build plan's Phase 2 scope.

- [ ] Not started — no garment assets exist yet. Flagged here only so the roadmap doesn't lose track of it; each garment will need its own skin weights tuned against this same `body_size` scaling system once Milestone 2 is proven out.

---

## Open Assumptions / Decisions Log
- Shared `body_size_bone_scale.json` (one file, both rigs) is kept as-is unless a real divergence between the male and female bone classifications is found — none has been so far.
- `WIDEN_AMOUNT = 0.15` and the aligned/rolled per-bone axis classification are treated as fixed inputs carried over unchanged from the Blender pipeline — Milestone 2 reproduces them, it does not redesign them.
- No garment work begins before Milestone 2 is visually validated against the Blender reference renders.

---

*This file tracks planning/status only. Implementation details, commits, and test results for each milestone go in the project's `CHANGELOG.md` as each milestone's task prompt is executed.*
