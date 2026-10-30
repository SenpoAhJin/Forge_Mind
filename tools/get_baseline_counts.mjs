#!/usr/bin/env node
/**
 * COSTUME-7A: Get baseline triangle counts before any changes.
 * Count = number of selected triangles (already integers from selectPieceTriangles).
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  findBodyMesh,
  computeLandmarks,
  buildBoneSegments,
  selectPieceTriangles,
  resolveBoneSet,
} from '../src/utils/costumeBuilder.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const costumePiecesData = JSON.parse(
  await fs.readFile(path.join(ROOT, 'src/data/costumePieces.json'), 'utf8')
);

async function loadGLB(filepath) {
  const data = await fs.readFile(filepath);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(data.buffer, '', (gltf) => resolve(gltf), (err) => reject(err));
  });
}

async function getCounts(gender, glbPath, contract) {
  const gltf = await loadGLB(glbPath);
  const skinnedMesh = findBodyMesh(gltf.scene);
  if (!skinnedMesh) throw new Error(`No SkinnedMesh found for ${gender}`);

  const geometry = skinnedMesh.geometry;
  const bodyBbox = new THREE.Box3().setFromObject(skinnedMesh);
  const landmarks = computeLandmarks(contract, bodyBbox);
  const boneSegments = buildBoneSegments(contract);

  const pieces = ['top', 'bottom', 'shoes', 'gloves', 'wig'];
  const counts = {};

  for (const pieceId of pieces) {
    const pieceDef = costumePiecesData.pieces.find(p => p.id === pieceId);
    if (!pieceDef) throw new Error(`${pieceId} not found in data`);

    const boneSet = resolveBoneSet(pieceDef);
    const selected = selectPieceTriangles(
      geometry,
      pieceDef,
      boneSet,
      boneSegments,
      landmarks
    );

    // selected is an array of triangle indices
    counts[pieceId] = selected.length;
  }

  return counts;
}

async function main() {
  const maleContract = JSON.parse(
    await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json'), 'utf8')
  );
  const femaleContract = JSON.parse(
    await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json'), 'utf8')
  );

  console.log('Getting baseline counts...\n');

  const maleCounts = await getCounts(
    'male',
    path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'),
    maleContract
  );

  const femaleCounts = await getCounts(
    'female',
    path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'),
    femaleContract
  );

  const result = { male: maleCounts, female: femaleCounts };

  console.log('Male:');
  console.log(`  top:    ${maleCounts.top}`);
  console.log(`  bottom: ${maleCounts.bottom}`);
  console.log(`  shoes:  ${maleCounts.shoes}`);
  console.log(`  gloves: ${maleCounts.gloves}`);
  console.log(`  wig:    ${maleCounts.wig}`);

  console.log('\nFemale:');
  console.log(`  top:    ${femaleCounts.top}`);
  console.log(`  bottom: ${femaleCounts.bottom}`);
  console.log(`  shoes:  ${femaleCounts.shoes}`);
  console.log(`  gloves: ${femaleCounts.gloves}`);
  console.log(`  wig:    ${femaleCounts.wig}`);

  await fs.writeFile(
    path.join(ROOT, 'docs/costume7a_before.json'),
    JSON.stringify(result, null, 2)
  );

  console.log('\nBaseline saved to docs/costume7a_before.json');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
