# 3D Assets

Rigged base bodies for the dress-up preview, staged from the Blender pipeline.

| File | Source | Size | Exporter |
| --- | --- | --- | --- |
| `3D_Model_Male.glb` | `forgemind-ai/models/male_base_body.glb` | 1,403,512 B | Khronos glTF Blender I/O v5.2.40 |
| `3D_Model_Female.glb` | `forgemind-ai/models/female_base_body.glb` | 1,253,432 B | Khronos glTF Blender I/O v5.2.40 |
| `body_size_bone_scale.json` | `forgemind-ai/models/body_size_bone_scale.json` | 1,852 B | — |

## Which Blender export to use

There are **two** `.glb` exports of each body in the repository. Only the ones
staged here are usable:

- **Usable — `forgemind-ai/models/{male,female}_base_body.glb`.** Contains the full
  Rigify skeleton (160 `DEF-*` bones), one glTF skin (`rig`) with 706/707 joints,
  and valid `JOINTS_0`/`WEIGHTS_0` on the mesh. This is what is staged here.
- **Not usable — `forgemind-ai/datasets/{Male,Female}_3D_Model/3D_Model_*.glb`.**
  Exported by glTF Blender I/O v4.3.47 and contains a **single unrigged node**
  (`Mesh0`) — no armature, no skin, zero `DEF-*` bones. These are static mesh
  dumps. Body-size skinning is impossible against them.

The dataset exports failed 4 of the checks in `scripts/verify-glb-models.mjs` and
were rejected during FE-3D Milestone 0. The filename is retained here so it keeps
matching the name used in `3D_Model_integration.md`, but **the contents are the
rigged `forgemind-ai/models/` export, not the dataset file of the same name.**

## Verify before trusting

```sh
node scripts/verify-glb-models.mjs
```

Checks, per file, with a PASS/FAIL summary and a non-zero exit on any failure:
GLB container integrity; every bone in `body_size_bone_scale.json` present in the
exported skeleton; skin with in-range joints and no unweighted vertices; every
target bone still at rest scale `(1,1,1)` (i.e. exported at `body_size = 0`, not
baked mid-widen); every JSON target resolving to a distinct node **after** three.js
name sanitisation; and the two skeletons exposing identical target-bone sets. Pass
explicit paths to vet a candidate export before promoting it.

Last run: **15 passed, 0 failed** (708 male / 709 female nodes). The script adds no
dependencies — it parses the GLB container itself and imports only `three`, which
the app already depends on. `--json` emits a machine-readable report.

## ⚠️ Bone names change at runtime — Milestone 2 must map them

`body_size_bone_scale.json` uses Blender's Rigify bone names, but three.js
sanitises glTF node names via `PropertyBinding.sanitizeNodeName`, which strips
`.` and other reserved characters. **30 of the 31 target keys do not exist by name
in the loaded scene:**

| JSON key | three.js node name |
| --- | --- |
| `DEF-spine.001` | `DEF-spine001` |
| `DEF-pelvis.L` | `DEF-pelvisL` |
| `DEF-spine.004` | `DEF-spine004` |
| `DEF-upper_arm.L` | `DEF-upper_armL` |

Only `DEF-spine` is unaffected. The verifier asserts this explicitly so the mapping
is never lost silently, and it must be applied before Milestone 2 scales anything
— otherwise `getObjectByName` returns `undefined` and the slider silently no-ops.
Sanitisation is lossy but collision-free here: all 31 targets still map 1:1.

## Known gaps

- **No materials or textures.** Both meshes expose only `POSITION`, `NORMAL`,
  `TEXCOORD_0`, `JOINTS_0`, `WEIGHTS_0` — zero materials, zero images, and no
  vertex colors. three.js therefore builds a default `MeshStandardMaterial` and
  the body renders untextured grey. This was reviewed and accepted for
  Milestones 0–1. Materials are a separate pass; `TEXCOORD_0` did survive, so UVs
  are available when they are authored.
- **No animations.** `animations: []`. The rig is a rest-pose skeleton only, which
  is all Milestones 0-1 need.
- **The female rig has one extra node, `neutral_bone`** (a Rigify root helper),
  accounting for 709 vs 708 nodes and 707 vs 706 joints. All 31 body-size target
  bones still match 1:1, so the scaling target set is shared.
- **Blender drivers and the `body_size` custom property do not survive export** —
  `extras` is `null` on both files, as expected. The slider has to be reimplemented
  at runtime; see Milestone 2 in `3D_Model_integration.md`.

## Loading

Tracked via **Git LFS** (`*.glb` in the repo root `.gitattributes`). Loaded at
runtime by `src/components/BodyModel.tsx` via drei's `useGLTF`.

Three pieces make that work, per the SDK 57 asset docs:

- `metro.config.js` adds `glb` to `resolver.assetExts` so `require()` returns an
  asset module instead of failing to parse it.
- `src/types/glb.d.ts` declares `*.glb` modules as `string | number` — Metro yields
  a numeric asset ID on native and a dev-server URL on web.
- `app.json` registers `expo-asset` with an `assets` array containing both GLBs, so
  they are embedded in the native binary at build time rather than fetched at
  runtime. The `assets` option explicitly supports `.glb`.

`Asset.fromModule` then normalises either shape; its `localUri` is used once the
asset is downloaded, otherwise the remote `uri` is used and react-three-fiber
fetches it. `useGLTF` keys its cache on the resulting path string.
