#!/usr/bin/env node
/**
 * COSTUME-6C C1-VERIFY: Compare current pipeline output with C0 baseline.
 * 
 * Uses selectPieceTriangles + buildOffsetGeometry (same as app's buildCostumePiece).
 * Compares: triangle count, bbox (within 1e-6), hash of sorted indices.
 * Exit 1 on any mismatch.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

import {
  findBodyMesh,
  computeLandmarks,
  resolveBoneSet,
  buildBoneSegments,
  selectPieceTriangles,
  buildOffsetGeometry,
} from '../src/utils/costumeBuilder.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const costumePiecesData = JSON.parse(
  await fs.readFile(path.join(ROOT, 'src/data/costumePieces.json'), 'utf8')
);

const maleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Male_V2_contract.json'), 'utf8')
);

const femaleContract = JSON.parse(
  await fs.readFile(path.join(ROOT, 'assets/models/3D_Model_Female_V2_contract.json'), 'utf8')
);

const baseline = JSON.parse(
  await fs.readFile(path.join(ROOT, 'docs/costume6c_before.json'), 'utf8')
);

async function loadGLB(filepath) {
  const data = await fs.readFile(filepath);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(data.buffer, '', (gltf) => resolve(gltf), (err) => reject(err));
  });
}

function hashIndices(indices) {
  const sorted = [...indices].sort((a, b) => a - b);
  const buffer = Buffer.from(new Uint32Array(sorted).buffer);
  return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 8);
}

async function testGender(gender, glbPath, contract) {
  console.log(`\n=== ${gender.toUpperCase()} ===`);
  
  const gltf = await loadGLB(glbPath);
  const skinnedMesh = findBodyMesh(gltf.scene);
  if (!skinnedMesh) throw new Error(`No SkinnedMesh found`);

  const geometry = skinnedMesh.geometry;
  const bodyBbox = new THREE.Box3().setFromObject(skinnedMesh);
  const landmarks = computeLandmarks(contract, bodyBbox);
  const boneSegments = buildBoneSegments(contract);
  
  const baselineData = baseline[gender];
  let anyMismatch = false;

  for (const pieceDef of costumePiecesData.pieces) {
    if (pieceDef.type === 'torus') {
      console.log(`${pieceDef.id}: SKIP (torus)`);
      continue;
    }
    
    const pieceId = pieceDef.id;
    const expected = baselineData[pieceId];
    if (!expected) {
      console.log(`${pieceId}: NO BASELINE`);
      continue;
    }

    const boneSet = resolveBoneSet(pieceDef);
    
    // Use the SAME pipeline as buildCostumePiece
    const selectedTriangles = selectPieceTriangles(
      geometry,
      pieceDef,
      boneSet,
      boneSegments,
      landmarks
    );
    
    const pieceGeometry = buildOffsetGeometry(geometry, selectedTriangles, pieceDef.offset_m);
    pieceGeometry.computeBoundingBox();
    const bbox = pieceGeometry.boundingBox;
    
    const count = selectedTriangles.length;
    const hash = hashIndices(selectedTriangles);
    
    // Compare
    const countMatch = count === expected.triangles;
    const hashMatch = hash === expected.hash;
    
    const bboxMinMatch = 
      Math.abs(bbox.min.x - expected.bbox.min.x) < 1e-6 &&
      Math.abs(bbox.min.y - expected.bbox.min.y) < 1e-6 &&
      Math.abs(bbox.min.z - expected.bbox.min.z) < 1e-6;
    
    const bboxMaxMatch =
      Math.abs(bbox.max.x - expected.bbox.max.x) < 1e-6 &&
      Math.abs(bbox.max.y - expected.bbox.max.y) < 1e-6 &&
      Math.abs(bbox.max.z - expected.bbox.max.z) < 1e-6;
    
    const allMatch = countMatch && hashMatch && bboxMinMatch && bboxMaxMatch;
    
    if (allMatch) {
      console.log(`${pieceId}: PASS (${count} tris, hash ${hash})`);
    } else {
      console.log(`${pieceId}: FAIL`);
      if (!countMatch) {
        console.log(`  Count: got ${count}, expected ${expected.triangles}`);
      }
      if (!hashMatch) {
        console.log(`  Hash: got ${hash}, expected ${expected.hash}`);
      }
      if (!bboxMinMatch) {
        console.log(`  BBox min: got (${bbox.min.x.toFixed(6)}, ${bbox.min.y.toFixed(6)}, ${bbox.min.z.toFixed(6)})`);
        console.log(`            exp (${expected.bbox.min.x.toFixed(6)}, ${expected.bbox.min.y.toFixed(6)}, ${expected.bbox.min.z.toFixed(6)})`);
      }
      if (!bboxMaxMatch) {
        console.log(`  BBox max: got (${bbox.max.x.toFixed(6)}, ${bbox.max.y.toFixed(6)}, ${bbox.max.z.toFixed(6)})`);
        console.log(`            exp (${expected.bbox.max.x.toFixed(6)}, ${expected.bbox.max.y.toFixed(6)}, ${expected.bbox.max.z.toFixed(6)})`);
      }
      anyMismatch = true;
    }
    
    pieceGeometry.dispose();
  }
  
  return anyMismatch;
}

async function main() {
  console.log('COSTUME-6C C1-VERIFY: Compare with C0 baseline\n');
  
  const maleMismatch = await testGender('male', path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'), maleContract);
  const femaleMismatch = await testGender('female', path.join(ROOT, 'assets/models/3D_Model_Female_V2_rigged.glb'), femaleContract);
  
  if (maleMismatch || femaleMismatch) {
    console.log('\n=== MISMATCH DETECTED ===');
    process.exit(1);
  }
  
  console.log('\n=== ALL MATCH ===');
  process.exit(0);
}

main();
