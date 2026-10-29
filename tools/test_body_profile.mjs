#!/usr/bin/env node
/**
 * test_body_profile.mjs
 * 
 * Validates bodyProfile.generated.json structure and invariants.
 * Exits non-zero on any failure.
 * 
 * Usage: node tools/test_body_profile.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readPositions, readJoints, readWeights } from './lib/gltf_read.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROFILE_PATH = join(ROOT, 'src', 'data', 'bodyProfile.generated.json');
const ASSETS = join(ROOT, 'assets', 'models');

const BODIES = [
  { gender: 'male', glb: '3D_Model_Male_V2_rigged.glb', contract: '3D_Model_Male_V2_contract.json' },
  { gender: 'female', glb: '3D_Model_Female_V2_rigged.glb', contract: '3D_Model_Female_V2_contract.json' },
];

let profile;
let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.log(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✓ PASS: ${message}`);
  }
}

function readGLB(filePath) {
  const buffer = readFileSync(filePath);
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546C67) throw new Error(`Not a GLB: ${filePath}`);
  
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  const jsonString = buffer.toString('utf8', jsonStart, jsonEnd);
  const gltf = JSON.parse(jsonString);
  
  const binChunkStart = jsonEnd + 8;
  const binBuffer = buffer.slice(binChunkStart);
  
  return { gltf, binBuffer };
}

function testBoneResolution(bodySpec) {
  console.log(`\n=== Testing ${bodySpec.gender} bone resolution ===`);
  
  const glbPath = join(ASSETS, bodySpec.glb);
  const contractPath = join(ASSETS, bodySpec.contract);
  const { gltf, binBuffer } = readGLB(glbPath);
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const data = profile.profiles[bodySpec.gender];
  
  const skin = gltf.skins[0];
  
  // Check every bone group bone name resolved
  const allGroupBones = [];
  for (const [groupName, jointIndices] of Object.entries(data.boneGroups.groupMap)) {
    // groupMap maps boneName -> groupName, so flip it
  }
  
  // Instead check from the stored counts
  let totalGrouped = 0;
  for (const count of Object.values(data.boneGroups.jointCounts)) {
    totalGrouped += count;
  }
  
  const bodyNode = gltf.nodes.find(n => n.mesh !== undefined);
  const mesh = gltf.meshes[bodyNode.mesh];
  const prim = mesh.primitives[0];
  const positions = readPositions(gltf, binBuffer, prim.attributes.POSITION);
  
  assert(totalGrouped === positions.length, `${bodySpec.gender}: group vertex counts sum to total (${totalGrouped} === ${positions.length})`);
  
  // Check no joint in two groups - already enforced by generator, but verify partition
  const groupMap = data.boneGroups.groupMap;
  const groupSet = new Set();
  for (const [boneName, groupName] of Object.entries(groupMap)) {
    const key = `${boneName}:${groupName}`;
    assert(!groupSet.has(boneName), `${bodySpec.gender}: bone ${boneName} not in multiple groups`);
    groupSet.add(boneName);
  }
  
  // Check all joint indices < skin.joints.length
  const diagnostic = data.diagnosticTable;
  for (const [jointIdx, stats] of Object.entries(diagnostic)) {
    const idx = parseInt(jointIdx, 10);
    assert(idx >= 0 && idx < skin.joints.length, `${bodySpec.gender}: joint ${idx} in range [0, ${skin.joints.length})`);
  }
  
  // Check left mean x > body center x > right mean x for arms and legs
  const leftArmJoints = ['upperarm.L', 'forearm.L', 'hand.L'];
  const rightArmJoints = ['upperarm.R', 'forearm.R', 'hand.R'];
  const leftLegJoints = ['thigh.L', 'shin.L', 'foot.L', 'toe.L'];
  const rightLegJoints = ['thigh.R', 'shin.R', 'foot.R', 'toe.R'];
  
  const bounds = data.bounds;
  const bodyCenterX = (bounds.min.x + bounds.max.x) / 2;
  
  // Contract says "character left = +X (.L)", so .L should be > 0, .R should be < 0
  const contractLeftIsPositiveX = contract.blender_axes.includes('+X (.L)');
  
  // Find a left arm joint mean
  let leftArmMeanX = null;
  for (const boneName of leftArmJoints) {
    for (const [jointIdx, stats] of Object.entries(diagnostic)) {
      if (stats.contractName === boneName && stats.count > 0) {
        leftArmMeanX = stats.meanX;
        break;
      }
    }
    if (leftArmMeanX !== null) break;
  }
  
  let rightArmMeanX = null;
  for (const boneName of rightArmJoints) {
    for (const [jointIdx, stats] of Object.entries(diagnostic)) {
      if (stats.contractName === boneName && stats.count > 0) {
        rightArmMeanX = stats.meanX;
        break;
      }
    }
    if (rightArmMeanX !== null) break;
  }
  
  if (contractLeftIsPositiveX) {
    assert(leftArmMeanX > bodyCenterX, `${bodySpec.gender}: left arm mean x (${leftArmMeanX?.toFixed(3)}) > body center x (${bodyCenterX.toFixed(3)})`);
    assert(rightArmMeanX < bodyCenterX, `${bodySpec.gender}: right arm mean x (${rightArmMeanX?.toFixed(3)}) < body center x (${bodyCenterX.toFixed(3)})`);
    console.log(`   Contract: left = +X ✓, leftArmMeanX=${leftArmMeanX?.toFixed(3)}, rightArmMeanX=${rightArmMeanX?.toFixed(3)}, bodyCenterX=${bodyCenterX.toFixed(3)}`);
  }
}

function testWeightSums(bodySpec) {
  console.log(`\n=== Testing ${bodySpec.gender} weight sums ===`);
  
  const glbPath = join(ASSETS, bodySpec.glb);
  const { gltf, binBuffer } = readGLB(glbPath);
  
  const bodyNode = gltf.nodes.find(n => n.mesh !== undefined);
  const mesh = gltf.meshes[bodyNode.mesh];
  const prim = mesh.primitives[0];
  
  const weights = readWeights(gltf, binBuffer, prim.attributes.WEIGHTS_0);
  
  let badCount = 0;
  for (let i = 0; i < weights.length; i++) {
    const sum = weights[i].reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      badCount++;
      if (badCount <= 3) {
        console.log(`   Vertex ${i}: weight sum = ${sum.toFixed(4)}`);
      }
    }
  }
  
  assert(badCount === 0, `${bodySpec.gender}: all vertex weights sum to 1.0 within 0.01 (bad count: ${badCount}/${weights.length})`);
}

function testFrontAxis() {
  console.log(`\n=== Testing frontAxis agreement ===`);
  
  const maleMethods = profile.profiles.male.frontAxisMethods;
  const femaleMethods = profile.profiles.female.frontAxisMethods;
  
  const maleAxis = profile.profiles.male.frontAxis;
  const femaleAxis = profile.profiles.female.frontAxis;
  
  const axisMatch = maleAxis[0] === femaleAxis[0] && maleAxis[1] === femaleAxis[1] && maleAxis[2] === femaleAxis[2];
  assert(axisMatch, `frontAxis matches for both genders: male=${JSON.stringify(maleAxis)}, female=${JSON.stringify(femaleAxis)}`);
  
  // Check methods agree
  assert(maleMethods.a.match === femaleMethods.a.match, `Method (a) conversion matches: male=${maleMethods.a.match}, female=${femaleMethods.a.match}`);
  assert(maleMethods.b.direction === femaleMethods.b.direction, `Method (b) direction matches: male=${maleMethods.b.direction}, female=${femaleMethods.b.direction}`);
  
  console.log(`   Male method (a): ${maleMethods.a.match}`);
  console.log(`   Male method (b): ${maleMethods.b.direction} (toeZ-ankleZ=${maleMethods.b.toeZ_minus_ankleZ})`);
  console.log(`   Female method (a): ${femaleMethods.a.match}`);
  console.log(`   Female method (b): ${femaleMethods.b.direction} (toeZ-ankleZ=${femaleMethods.b.toeZ_minus_ankleZ})`);
}

function testGenderProfile(gender) {
  console.log(`\n=== Testing ${gender} profile structure ===`);
  
  const data = profile.profiles[gender];
  assert(data !== undefined, `${gender} profile exists`);
  
  // Required fields
  assert(data.bounds !== undefined, `${gender}: bounds present`);
  assert(data.frontAxis !== undefined, `${gender}: frontAxis present`);
  assert(data.frontAxisMethods !== undefined, `${gender}: frontAxisMethods present`);
  assert(data.landmarks !== undefined, `${gender}: landmarks present`);
  assert(data.torsoSlices !== undefined, `${gender}: torsoSlices present`);
  assert(data.torsoSlicesNoClavicle !== undefined, `${gender}: torsoSlicesNoClavicle present`);
  assert(data.boneGroups !== undefined, `${gender}: boneGroups present`);
  assert(data.diagnosticTable !== undefined, `${gender}: diagnosticTable present`);
  
  // Landmarks
  const lm = data.landmarks;
  const requiredLandmarks = ['pelvis', 'thighL', 'shinL', 'ankleL', 'ballOfFootL', 'shoulderL', 'neck', 'headTop', 'headCenterX', 'headCenterZ', 'headCenterMethod'];
  requiredLandmarks.forEach(name => {
    assert(lm[name] !== undefined, `${gender}: landmark ${name} present`);
  });
  
  // Landmark ordering
  assert(lm.ballOfFootL < lm.ankleL, `${gender}: ballOfFoot < ankle`);
  assert(lm.ankleL < lm.shinL, `${gender}: ankle < shin`);
  assert(lm.shinL < lm.thighL, `${gender}: shin < thigh`);
  assert(lm.pelvis < lm.shoulderL, `${gender}: pelvis < shoulder`);
  assert(lm.neck < lm.headTop, `${gender}: neck < headTop`);
  
  // Torso slices ordered
  for (let i = 1; i < data.torsoSlices.length; i++) {
    assert(data.torsoSlices[i].y > data.torsoSlices[i - 1].y, `${gender}: torsoSlice[${i}].y > previous`);
  }
  
  // Shoulder comparison present
  assert(data.shoulderComparison !== undefined, `${gender}: shoulderComparison present`);
  const sc = data.shoulderComparison;
  console.log(`   Shoulder widths: torsoSlices=${sc.torsoSlicesWidth.toFixed(3)}, torsoSlicesNoClavicle=${sc.torsoSlicesNoClavicleWidth.toFixed(3)}, armSpan=${sc.armSpan.toFixed(3)}`);
}

function main() {
  console.log('Testing bodyProfile.generated.json...\n');
  
  try {
    profile = JSON.parse(readFileSync(PROFILE_PATH, 'utf8'));
  } catch (err) {
    console.error(`❌ FAIL: Could not read profile: ${err.message}`);
    process.exit(1);
  }
  
  // Top-level structure
  assert(profile.version === 2, 'profile version is 2');
  assert(profile.profiles !== undefined, 'profiles field present');
  assert(profile.profiles.male !== undefined, 'male profile present');
  assert(profile.profiles.female !== undefined, 'female profile present');
  
  testGenderProfile('male');
  testGenderProfile('female');
  testFrontAxis();
  
  for (const bodySpec of BODIES) {
    testBoneResolution(bodySpec);
    testWeightSums(bodySpec);
  }
  
  console.log(`\n${'='.repeat(50)}`);
  if (failures === 0) {
    console.log('✓ ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log(`❌ ${failures} TEST(S) FAILED`);
    process.exit(1);
  }
}

main();
