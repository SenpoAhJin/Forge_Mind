#!/usr/bin/env node
/**
 * inspect_node_transform.mjs
 * Inspect the body node's transform matrix
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets', 'models');

function readGLB(filePath) {
  const buffer = readFileSync(filePath);
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546C67) throw new Error(`Not a GLB: ${filePath}`);
  
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  const jsonString = buffer.toString('utf8', jsonStart, jsonEnd);
  const gltf = JSON.parse(jsonString);
  
  return gltf;
}

const maleGLTF = readGLB(join(ASSETS, '3D_Model_Male_V2_rigged.glb'));
const femaleGLTF = readGLB(join(ASSETS, '3D_Model_Female_V2_rigged.glb'));

console.log('=== MALE BODY NODE ===');
const maleBodyNode = maleGLTF.nodes.find(n => n.mesh !== undefined);
console.log('Node name:', maleBodyNode.name);
console.log('Has matrix:', !!maleBodyNode.matrix);
console.log('Has translation:', !!maleBodyNode.translation);
console.log('Has rotation:', !!maleBodyNode.rotation);
console.log('Has scale:', !!maleBodyNode.scale);
console.log('Node keys:', Object.keys(maleBodyNode));

if (maleBodyNode.matrix) {
  const m = maleBodyNode.matrix;
  console.log('\nMatrix (column-major):');
  console.log(`[${m[0].toFixed(4)}, ${m[1].toFixed(4)}, ${m[2].toFixed(4)}, ${m[3].toFixed(4)}]`);
  console.log(`[${m[4].toFixed(4)}, ${m[5].toFixed(4)}, ${m[6].toFixed(4)}, ${m[7].toFixed(4)}]`);
  console.log(`[${m[8].toFixed(4)}, ${m[9].toFixed(4)}, ${m[10].toFixed(4)}, ${m[11].toFixed(4)}]`);
  console.log(`[${m[12].toFixed(4)}, ${m[13].toFixed(4)}, ${m[14].toFixed(4)}, ${m[15].toFixed(4)}]`);
}

console.log('\n=== FEMALE BODY NODE ===');
const femaleBodyNode = femaleGLTF.nodes.find(n => n.mesh !== undefined);
console.log('Node name:', femaleBodyNode.name);
console.log('Has matrix:', !!femaleBodyNode.matrix);
console.log('Node keys:', Object.keys(femaleBodyNode));

console.log('\n=== CHECK SKIN AND INVERSE BIND MATRICES ===');
console.log('Male skin count:', maleGLTF.skins.length);
if (maleGLTF.skins.length > 0) {
  const skin = maleGLTF.skins[0];
  console.log('Skin joints count:', skin.joints.length);
  console.log('Has inverseBindMatrices accessor:', !!skin.inverseBindMatrices);
  
  // Check first few joint nodes
  console.log('\nFirst 3 joint nodes:');
  for (let i = 0; i < Math.min(3, skin.joints.length); i++) {
    const nodeIdx = skin.joints[i];
    const node = maleGLTF.nodes[nodeIdx];
    console.log(`  Joint ${i}: ${node.name}, matrix: ${!!node.matrix}, translation: ${!!node.translation}`);
  }
}