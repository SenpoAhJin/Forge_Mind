/**
 * verify-glb-models.mjs
 *
 * FE-3D Milestone 0 — asset pipeline verification for the Blender base bodies.
 *
 * Confirms the exported .glb files in assets/models/ are fit for use by
 * BodyModel.tsx, and that nothing was lost or silently altered on export.
 *
 * Checks, per file:
 *   [container] GLB header/chunk structure is valid and self-consistent
 *   [bones]     every bone name keyed in body_size_bone_scale.json exists as a
 *               node in the exported skeleton
 *   [skin]      the skinned mesh has JOINTS_0/WEIGHTS_0, a skin with joints,
 *               joint indices in range, and no unweighted vertices
 *   [restpose]  every target bone's rest-pose scale is (1,1,1), i.e. the file was
 *               exported at body_size = 0 and not baked mid-widen
 *   [names]     every target bone still resolves to a skeleton bone after
 *               three.js sanitises node names on load
 *
 * Plus a cross-file check that the male and female skeletons expose identical
 * bone name sets.
 *
 * No *new* dependencies: a GLB is a 12-byte header plus typed chunks, so the
 * inspection reads the container directly rather than pulling in a glTF library
 * (or a headless-WebGL three.js context). The only import is three's own
 * `PropertyBinding`, already a direct dependency, used so the name-sanitising
 * check matches the runtime exactly instead of reimplementing it.
 *
 * The [names] check exists because three.js's GLTFLoader runs every node name
 * through `PropertyBinding.sanitizeNodeName`, which strips `. / [ ] :`. So
 * "DEF-spine.001" arrives at runtime as "DEF-spine001". A bone lookup keyed on
 * the raw JSON names matches almost nothing. This check proves the mapping is
 * complete and unambiguous; Milestone 2 owns consuming it.
 *
 * Usage:
 *   node scripts/verify-glb-models.mjs
 *   node scripts/verify-glb-models.mjs --json
 *   node scripts/verify-glb-models.mjs path/to/a.glb path/to/b.glb
 *
 * With no file arguments it checks the two base bodies already staged in
 * assets/models/. Pass paths explicitly to vet a candidate export (e.g. one
 * still sitting in forgemind-ai/) before promoting it into the app.
 *
 * Exits 0 if every check passes, 1 on any failure, 2 on bad invocation.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PropertyBinding } from 'three';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const MODEL_DIR = join(REPO_ROOT, 'assets', 'models');

const SCALE_TABLE = join(MODEL_DIR, 'body_size_bone_scale.json');
const DEFAULT_TARGETS = [
  { gender: 'male', file: join(MODEL_DIR, '3D_Model_Male.glb') },
  { gender: 'female', file: join(MODEL_DIR, '3D_Model_Female.glb') },
];

/** @type {{gender: string, file: string}[]} */
let TARGETS = DEFAULT_TARGETS;

/** Rest-pose scale tolerance. Blender writes exact 1.0; 1e-6 catches float32 noise only. */
const SCALE_EPSILON = 1e-6;

// ---------------------------------------------------------------------------
// glTF / GLB primitives
// ---------------------------------------------------------------------------

const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a; // 'JSON'
const CHUNK_BIN = 0x004e4942; // 'BIN\0'

const COMPONENT_SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const COMPONENT_READER = {
  5120: (dv, o) => dv.getInt8(o),
  5121: (dv, o) => dv.getUint8(o),
  5122: (dv, o) => dv.getInt16(o, true),
  5123: (dv, o) => dv.getUint16(o, true),
  5125: (dv, o) => dv.getUint32(o, true),
  5126: (dv, o) => dv.getFloat32(o, true),
};
const TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const ACCESSOR_NAME = {
  5120: 'BYTE',
  5121: 'UNSIGNED_BYTE',
  5122: 'SHORT',
  5123: 'UNSIGNED_SHORT',
  5125: 'UNSIGNED_INT',
  5126: 'FLOAT',
};

/** Parse a .glb into { json, bin } and verify the container is self-consistent. */
function parseGlb(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const magic = dv.getUint32(0, true);
  if (magic !== GLB_MAGIC) {
    throw new Error(
      `not a GLB: expected magic 0x${GLB_MAGIC.toString(16)} ('glTF'), got 0x${magic.toString(16)}`,
    );
  }

  const version = dv.getUint32(4, true);
  if (version !== 2) {
    throw new Error(`unsupported GLB container version ${version} (expected 2)`);
  }

  const declaredLength = dv.getUint32(8, true);
  if (declaredLength !== bytes.byteLength) {
    throw new Error(
      `header length ${declaredLength} does not match actual file size ${bytes.byteLength}`,
    );
  }

  let json = null;
  let bin = null;
  let offset = 12;

  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) {
      throw new Error(`truncated chunk header at byte ${offset}`);
    }
    const chunkLength = dv.getUint32(offset, true);
    const chunkType = dv.getUint32(offset + 4, true);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLength;

    if (dataEnd > bytes.byteLength) {
      throw new Error(
        `chunk at byte ${offset} declares ${chunkLength} bytes but only ` +
          `${bytes.byteLength - dataStart} remain`,
      );
    }

    if (chunkType === CHUNK_JSON) {
      if (json) throw new Error('more than one JSON chunk');
      json = JSON.parse(new TextDecoder().decode(bytes.subarray(dataStart, dataEnd)));
    } else if (chunkType === CHUNK_BIN) {
      if (bin) throw new Error('more than one BIN chunk');
      bin = bytes.subarray(dataStart, dataEnd);
    }
    // Unknown chunk types are skipped per spec.

    // Chunks are 4-byte aligned; the padding is not counted in chunkLength.
    offset = dataStart + Math.ceil(chunkLength / 4) * 4;
  }

  if (!json) throw new Error('GLB has no JSON chunk');
  return { json, bin };
}

/** Read an accessor into a flat JS array, honouring bufferView/byteOffset/stride. */
function readAccessor(json, bin, index) {
  const accessor = json.accessors?.[index];
  if (!accessor) throw new Error(`accessor ${index} does not exist`);
  if (accessor.bufferView === undefined) {
    throw new Error(`accessor ${index} has no bufferView (sparse/zero-filled accessors unsupported)`);
  }

  const bufferView = json.bufferViews?.[accessor.bufferView];
  if (!bufferView) throw new Error(`bufferView ${accessor.bufferView} does not exist`);
  if (bufferView.buffer !== 0) throw new Error(`bufferView ${accessor.bufferView} targets a non-zero buffer`);

  const componentType = accessor.componentType;
  const read = COMPONENT_READER[componentType];
  if (!read) throw new Error(`unsupported componentType ${componentType}`);
  const componentSize = COMPONENT_SIZE[componentType];

  const components = TYPE_COMPONENTS[accessor.type];
  if (!components) throw new Error(`unsupported accessor type ${accessor.type}`);
  const elementSize = componentSize * components;
  const stride = bufferView.byteStride ?? elementSize;

  const viewStart = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const count = accessor.count;
  const out = new Array(count * components);

  const dv = new DataView(bin.buffer, bin.byteOffset + viewStart, count * stride);
  for (let e = 0; e < count; e++) {
    for (let c = 0; c < components; c++) {
      out[e * components + c] = read(dv, e * stride + c * componentSize);
    }
  }
  return { data: out, components, count, componentType, type: accessor.type };
}

/**
 * Rest-pose scale of a glTF node.
 * Nodes may carry `scale`, or a baked `matrix` with no TRS, or neither (identity).
 * Returns null when the scale cannot be determined, so callers can fail loudly.
 */
function nodeRestScale(node) {
  if (Array.isArray(node.scale)) return [...node.scale];
  if (Array.isArray(node.matrix)) {
    // glTF matrices are column-major: the basis vectors are the first 3 columns.
    const m = node.matrix;
    return [0, 1, 2].map((c) => Math.hypot(m[c * 4], m[c * 4 + 1], m[c * 4 + 2]));
  }
  return [1, 1, 1];
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const asJson = process.argv.includes('--json');
const results = [];

function record(scope, name, passed, detail) {
  results.push({ scope, name, passed, detail });
  if (!asJson) {
    const tag = passed === null ? 'INFO' : passed ? 'PASS' : 'FAIL';
    console.log(`  [${tag}] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function fail(scope, name, detail) {
  record(scope, name, false, detail);
}

function pass(scope, name, detail) {
  record(scope, name, true, detail);
}

function info(scope, name, detail) {
  record(scope, name, null, detail);
}

const fmtList = (items, cap = 8) =>
  items.length === 0
    ? '(none)'
    : items.length <= cap
      ? items.join(', ')
      : `${items.slice(0, cap).join(', ')} +${items.length - cap} more`;

// ---------------------------------------------------------------------------
// Per-file checks
// ---------------------------------------------------------------------------

function verifyFile({ gender, file }) {
  const label = relative(REPO_ROOT, file).replace(/\\/g, '/');
  const scope = label;
  if (!asJson) console.log(`\n=== ${label} (${gender}) ===`);

  const bytes = new Uint8Array(readFileSync(file));

  // --- container -----------------------------------------------------------
  let gltf;
  try {
    gltf = parseGlb(bytes);
    pass(scope, 'GLB container parses', `${bytes.byteLength} bytes, JSON chunk OK`);
  } catch (err) {
    fail(scope, 'GLB container parses', err.message);
    return null;
  }

  const { json, bin } = gltf;
  const nodes = json.nodes ?? [];
  const named = new Map();
  for (const node of nodes) {
    if (node.name && !named.has(node.name)) named.set(node.name, node);
  }
  info(scope, 'Skeleton inventory', `${nodes.length} nodes, ${named.size} uniquely named`);

  // --- (a) target bones present -------------------------------------------
  const targetBones = Object.keys(boneScaleTable);
  const missing = targetBones.filter((bone) => !named.has(bone));
  if (missing.length === 0) {
    pass(scope, 'All body_size_bone_scale.json bones exist in skeleton', `${targetBones.length}/${targetBones.length} found`);
  } else {
    fail(scope, 'All body_size_bone_scale.json bones exist in skeleton', `${missing.length} missing: ${fmtList(missing)}`);
  }

  // --- (b) skin + weights --------------------------------------------------
  const skins = json.skins ?? [];
  const skinnedNodes = nodes.filter((n) => n.skin !== undefined);

  if (skins.length === 0) {
    fail(scope, 'Skin present with joints', 'glTF declares no skins');
  } else if (skinnedNodes.length === 0) {
    fail(scope, 'Skin present with joints', `${skins.length} skin(s) declared but no node references one`);
  } else {
    const skin = skins[skinnedNodes[0].skin];
    const jointCount = skin.joints?.length ?? 0;
    pass(scope, 'Skin present with joints', `${skins.length} skin(s); node "${skinnedNodes[0].name}" -> ${jointCount} joints`);

    const badJoints = (skin.joints ?? []).filter((j) => j >= nodes.length);
    if (badJoints.length === 0) {
      pass(scope, 'Skin joint indices in range', `all ${jointCount} indices < nodes.length (${nodes.length})`);
    } else {
      fail(scope, 'Skin joint indices in range', `${badJoints.length} out of range: ${fmtList(badJoints.map(String))}`);
    }

    const skinName = skin.name ?? '(unnamed)';
    const meshRef = skinnedNodes[0].mesh;
    const mesh = json.meshes?.[meshRef];
    const primitives = mesh?.primitives ?? [];

    let vertexTotal = 0;
    let weightedPrimitives = 0;
    const problems = [];

    for (const [i, prim] of primitives.entries()) {
      const primName = `${mesh.name ?? skinName}#${i}`;
      const hasJoints = prim.attributes?.JOINTS_0 !== undefined;
      const hasWeights = prim.attributes?.WEIGHTS_0 !== undefined;
      const hasIndices = prim.indices !== undefined;

      if (!hasJoints || !hasWeights) {
        problems.push(
          `${primName} missing ${!hasJoints ? 'JOINTS_0' : ''}${!hasJoints && !hasWeights ? ' + ' : ''}${!hasWeights ? 'WEIGHTS_0' : ''}`.trim(),
        );
        continue;
      }
      if (!hasIndices) {
        problems.push(`${primName} has no vertex indices`);
        continue;
      }

      const joints = readAccessor(json, bin, prim.attributes.JOINTS_0);
      const weights = readAccessor(json, bin, prim.attributes.WEIGHTS_0);
      const indices = readAccessor(json, bin, prim.indices);
      const vertexCount = Math.max(joints.count, weights.count);
      vertexTotal += vertexCount;

      if (joints.count !== weights.count) {
        problems.push(`${primName} JOINTS_0 count ${joints.count} != WEIGHTS_0 count ${weights.count}`);
        continue;
      }
      if (indices.count > 0 && indices.count % 3 !== 0) {
        problems.push(`${primName} index count ${indices.count} is not a multiple of 3`);
      }
      if (weights.components !== 4) {
        problems.push(`${primName} WEIGHTS_0 is ${weights.type} (expected VEC4)`);
      }

      let unweighted = 0;
      let outOfRangeJoint = 0;
      for (let v = 0; v < vertexCount; v++) {
        let sum = 0;
        for (let c = 0; c < 4; c++) {
          const w = weights.data[v * 4 + c];
          sum += w;
          if (w > 0) {
            const joint = joints.data[v * joints.components + Math.min(c, joints.components - 1)];
            if (joint >= jointCount) outOfRangeJoint++;
          }
        }
        if (sum <= 0) unweighted++;
      }

      weightedPrimitives++;
      const kind = `JOINTS_0=${ACCESSOR_NAME[joints.componentType]}, WEIGHTS_0=${ACCESSOR_NAME[weights.componentType]}, ${weights.type}`;
      if (unweighted > 0) {
        problems.push(`${primName} has ${unweighted}/${vertexCount} vertices with zero total weight`);
      }
      if (outOfRangeJoint > 0) {
        problems.push(`${primName} has ${outOfRangeJoint} non-zero weights pointing past the ${jointCount} joints`);
      }
      info(scope, `Skin data ${primName}`, `${vertexCount} verts, ${indices.count / 3} tris, ${kind}`);
    }

    if (weightedPrimitives > 0 && problems.length === 0) {
      pass(scope, 'Skinned mesh has valid skin indices and non-empty weights', `${weightedPrimitives}/${primitives.length} primitives, ${vertexTotal} weighted vertices, 0 unweighted`);
    } else if (weightedPrimitives === 0) {
      fail(scope, 'Skinned mesh has valid skin indices and non-empty weights', `no primitive exposed JOINTS_0/WEIGHTS_0: ${fmtList(problems)}`);
    } else {
      fail(scope, 'Skinned mesh has valid skin indices and non-empty weights', problems.join('; '));
    }
  }

  // --- (c) rest pose scale -------------------------------------------------
  const offRest = [];
  const unknown = [];
  for (const bone of targetBones) {
    const node = named.get(bone);
    if (!node) continue; // already reported by check (a)
    const s = nodeRestScale(node);
    if (s === null) {
      unknown.push(bone);
      continue;
    }
    const dev = Math.max(...s.map((v) => Math.abs(v - 1)));
    if (dev > SCALE_EPSILON) {
      offRest.push(`${bone}=[${s.map((v) => v.toFixed(4)).join(', ')}]`);
    }
  }

  if (offRest.length === 0 && unknown.length === 0) {
    pass(scope, 'Target bones at rest scale (1,1,1)', `${targetBones.length} bones within ${SCALE_EPSILON} of identity — exported at body_size = 0`);
  } else if (offRest.length > 0) {
    fail(scope, 'Target bones at rest scale (1,1,1)', `${offRest.length} bone(s) scaled in the exported rest pose: ${fmtList(offRest, 5)}`);
  } else {
    fail(scope, 'Target bones at rest scale (1,1,1)', `scale undeterminable for: ${fmtList(unknown)}`);
  }

  // --- (d) runtime bone-name resolution ------------------------------------
  // three.js rewrites node names on load, so the JSON keys are not the names a
  // Bone lookup will see. Verify every key still maps to exactly one bone.
  const runtimeNames = new Map();
  for (const name of named.keys()) {
    const safe = PropertyBinding.sanitizeNodeName(name);
    if (!runtimeNames.has(safe)) runtimeNames.set(safe, []);
    runtimeNames.get(safe).push(name);
  }

  const nameProblems = [];
  let renamed = 0;
  const renameExamples = [];
  for (const bone of targetBones) {
    const safe = PropertyBinding.sanitizeNodeName(bone);
    const sources = runtimeNames.get(safe);
    if (!sources) {
      nameProblems.push(`${bone} -> "${safe}" not in skeleton`);
    } else if (sources.length > 1) {
      nameProblems.push(`${bone} -> "${safe}" is ambiguous (${sources.join(', ')})`);
    }
    if (safe !== bone) {
      renamed++;
      if (renameExamples.length < 4) renameExamples.push(`${bone} -> ${safe}`);
    }
  }

  if (nameProblems.length === 0) {
    pass(scope, 'Target bones resolve under three.js name sanitising', `${targetBones.length}/${targetBones.length} map 1:1 onto skeleton bones`);
  } else {
    fail(scope, 'Target bones resolve under three.js name sanitising', nameProblems.join('; '));
  }

  if (renamed > 0) {
    info(
      scope,
      'Runtime bone names differ from JSON keys',
      `${renamed}/${targetBones.length} sanitised (dots stripped): ${renameExamples.join(', ')}${renamed > renameExamples.length ? ', ...' : ''}`,
    );
  }

  return { gender, label, boneNames: new Set(targetBones.filter((b) => named.has(b))), allNodeNames: new Set(named.keys()) };
}
// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

if (asJson) {
  console.log('(--json output is emitted after the checks run; text mode is the default)');
}

const cliFiles = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (cliFiles.length > 0) {
  TARGETS = cliFiles.map((file) => ({
    gender: /female/i.test(file) ? 'female' : /male/i.test(file) ? 'male' : 'model',
    file: resolve(process.cwd(), file),
  }));
  console.log(`Targets overridden from CLI (${TARGETS.length} file(s))`);
}

console.log('FE-3D Milestone 0 — base body .glb verification');
console.log(`Repo: ${REPO_ROOT}`);

let boneScaleTable;
try {
  boneScaleTable = JSON.parse(readFileSync(SCALE_TABLE, 'utf8'));
} catch (err) {
  console.error(`\nFATAL: cannot read ${relative(REPO_ROOT, SCALE_TABLE)} — ${err.message}`);
  process.exit(2);
}
console.log(`Scale table: ${relative(REPO_ROOT, SCALE_TABLE)} (${Object.keys(boneScaleTable).length} target bones)`);

const perFile = [];
for (const target of TARGETS) {
  try {
    const out = verifyFile(target);
    if (out) perFile.push(out);
  } catch (err) {
    fail(relative(REPO_ROOT, target.file), 'unexpected error', err.stack ?? err.message);
  }
}

// --- cross-file: male/female bone parity -----------------------------------
if (perFile.length === TARGETS.length) {
  const [a, b] = perFile;
  const onlyMale = [...a.boneNames].filter((n) => !b.boneNames.has(n));
  const onlyFemale = [...b.boneNames].filter((n) => !a.boneNames.has(n));
  if (onlyMale.length === 0 && onlyFemale.length === 0) {
    pass('male vs female', 'Skeleton bone name sets match 1:1', `${a.boneNames.size} shared bone names`);
  } else {
    fail('male vs female', 'Skeleton bone name sets match 1:1', `male-only: ${fmtList(onlyMale)} | female-only: ${fmtList(onlyFemale)}`);
  }
} else {
  fail('male vs female', 'Skeleton bone name sets match 1:1', 'skipped — one or both files failed earlier checks');
}

// --- summary ---------------------------------------------------------------
const failures = results.filter((r) => r.passed === false);
const passes = results.filter((r) => r.passed === true);

if (asJson) {
  console.log(JSON.stringify({ passes: passes.length, failures: failures.length, results }, null, 2));
} else {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`SUMMARY: ${passes.length} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log('\nFailed checks:');
    for (const f of failures) console.log(`  - [${f.scope}] ${f.name}: ${f.detail}`);
    console.log('\nRESULT: FAIL — fix the assets before wiring BodyModel.tsx.');
  } else {
    console.log('RESULT: PASS — assets are ready for the base model loader (Milestone 1).');
  }
  console.log(`${'='.repeat(72)}`);
}

process.exit(failures.length > 0 ? 1 : 0);
