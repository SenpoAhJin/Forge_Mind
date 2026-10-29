#!/usr/bin/env node
/**
 * Verify frontAxis for both genders using two methods:
 * (a) Contract blender_axes → glTF conversion
 * (b) Foot geometry: toes in front of heel
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const profile = JSON.parse(readFileSync(join(ROOT, 'src/data/bodyProfile.generated.json'), 'utf8'));
const maleContract = JSON.parse(readFileSync(join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json'), 'utf8'));
const femaleContract = JSON.parse(readFileSync(join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json'), 'utf8'));

function verifyGender(gender, contract) {
  console.log(`\n=== ${gender.toUpperCase()} ===`);
  
  // Method (a): Contract axes conversion
  console.log('\nMethod (a): Contract axes conversion');
  console.log(`  Contract blender_axes: "${contract.blender_axes}"`);
  console.log('  Blender: Z up, body faces -Y, left = +X');
  console.log('  glTF conversion: Y up, front = Blender -Y → glTF +Z');
  console.log('  Expected frontAxis: [0, 0, 1] (+Z)');
  
  // Method (b): Foot geometry
  console.log('\nMethod (b): Foot geometry');
  const ankle = contract.bones.find(b => b.name === 'foot.L').head;  // foot bone head = ankle
  const toeHead = contract.bones.find(b => b.name === 'toe.L').head;
  
  // Contract coords are Blender [x, y, z] where y=front/back, z=height
  // In glTF: [x, z, y] so front/back is now glTF Z
  const ankleGLTF = [ankle[0], ankle[2], ankle[1]];
  const toeGLTF = [toeHead[0], toeHead[2], toeHead[1]];
  
  const frontOffset = toeGLTF[2] - ankleGLTF[2];  // Z difference
  console.log(`  Ankle (foot.L head): glTF Z = ${ankleGLTF[2].toFixed(4)}`);
  console.log(`  Toe (toe.L head): glTF Z = ${toeGLTF[2].toFixed(4)}`);
  console.log(`  Toe Z - Ankle Z = ${frontOffset.toFixed(4)}`);
  
  if (frontOffset < -0.01) {
    console.log('  → Toes are in -Z direction (front = -Z) [0, 0, -1]');
  } else if (frontOffset > 0.01) {
    console.log('  → Toes are in +Z direction (front = +Z) [0, 0, 1]');
  } else {
    console.log('  → Inconclusive (difference < 1cm)');
  }
  
  // Profile frontAxis
  const profileAxis = profile.v2[gender].frontAxis.axis;
  console.log(`\nProfile frontAxis: [${profileAxis}]`);
  console.log(`Profile evidence: ${profile.v2[gender].frontAxis.evidence}`);
  
  // Check agreement
  const methodA = [0, 0, 1];
  const methodB = frontOffset > 0.01 ? [0, 0, 1] : (frontOffset < -0.01 ? [0, 0, -1] : null);
  
  console.log('\n--- VERDICT ---');
  if (methodB === null) {
    console.log('Method (b) inconclusive');
  } else if (methodA[2] === methodB[2] && methodA[2] === profileAxis[2]) {
    console.log(`✓ AGREEMENT: Both methods and profile agree on frontAxis = [${profileAxis}]`);
  } else {
    console.log(`✗ DISAGREEMENT: Method (a)=[${methodA}], Method (b)=[${methodB}], Profile=[${profileAxis}]`);
  }
}

verifyGender('male', maleContract);
verifyGender('female', femaleContract);

console.log('\n' + '='.repeat(60));
