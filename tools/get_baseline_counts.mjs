#!/usr/bin/env node
/**
 * COSTUME-7A: Get baseline counts matching the Debug panel.
 * Debug panel shows triangleCount and (coveredVertexCount/eligibleVertexCount).
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  findBodyMesh,
  computePieceDebugInfo,
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

  const pieces = ['top', 'bottom', 'shoes', 'gloves', 'wig'];
  const counts = {};

  for (const pieceId of pieces) {
    const pieceDef = costumePiecesData.pieces.find(p => p.id === pieceId);
    if (!pieceDef) throw new Error(`${pieceId} not found in data`);

    const info = computePieceDebugInfo(gltf.scene, contract, pieceDef, costumePiecesData);
    if (!info) throw new Error(`No debug info for ${pieceId}`);

    counts[pieceId] = {
      triangles: info.triangleCount,
      covered: info.coveredVertexCount,
      eligible: info.eligibleVertexCount,
    };
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

  console.log('Getting baseline counts (Debug panel format)...\n');

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
  for (const [piece, c] of Object.entries(maleCounts)) {
    const pct = c.eligible > 0 ? ((c.covered / c.eligible) * 100).toFixed(1) : '0.0';
    console.log(`  ${piece}: ${c.triangles} tris (${c.covered}/${c.eligible} verts, ${pct}%)`);
  }

  console.log('\nFemale:');
  for (const [piece, c] of Object.entries(femaleCounts)) {
    const pct = c.eligible > 0 ? ((c.covered / c.eligible) * 100).toFixed(1) : '0.0';
    console.log(`  ${piece}: ${c.triangles} tris (${c.covered}/${c.eligible} verts, ${pct}%)`);
  }

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
