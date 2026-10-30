import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  findBodyMesh,
  computeLandmarks,
  resolveBoneSet,
  buildBoneSegments,
  selectPieceTriangles,
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

async function loadGLB(filepath) {
  const data = await fs.readFile(filepath);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(data.buffer, '', (gltf) => resolve(gltf), (err) => reject(err));
  });
}

async function main() {
  const gltf = await loadGLB(path.join(ROOT, 'assets/models/3D_Model_Male_V2_rigged.glb'));
  const skinnedMesh = findBodyMesh(gltf.scene);
  const geometry = skinnedMesh.geometry;
  const bodyBbox = new THREE.Box3().setFromObject(skinnedMesh);
  const landmarks = computeLandmarks(maleContract, bodyBbox);
  const boneSegments = buildBoneSegments(maleContract);
  
  console.log('Landmarks:', Object.keys(landmarks));
  
  const topDef = costumePiecesData.pieces.find(p => p.id === 'top');
  console.log('Top has clips:', topDef.clips ? 'yes' : 'no');
  console.log('Top has yMin:', topDef.yMin ? 'yes' : 'no');
  
  const boneSet = resolveBoneSet(topDef);
  console.log('BoneSet size:', boneSet.size);
  
  try {
    const selectedTriangles = selectPieceTriangles(
      geometry,
      topDef,
      boneSet,
      boneSegments,
      landmarks
    );
    console.log('Selected triangles:', selectedTriangles.length);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

main();
