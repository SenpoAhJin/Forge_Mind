import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

async function loadGLB(filepath) {
  const data = await fs.readFile(filepath);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(data.buffer, '', (gltf) => resolve(gltf), (err) => reject(err));
  });
}

(async () => {
  for (const gender of ['male', 'female']) {
    const glbPath = path.join(ROOT, `assets/models/3D_Model_${gender === 'male' ? 'Male' : 'Female'}_V2_rigged.glb`);
    const gltf = await loadGLB(glbPath);
    
    const bones = [];
    gltf.scene.traverse((node) => {
      if (node.type === 'Bone') bones.push(node);
    });
    
    const findBone = (name) => {
      for (const n of bones) {
        if (n.name === name) return n;
      }
      throw new Error(`Bone ${name} not found in ${gender}`);
    };
    
    const toeL = findBone('toeL');
    const footL = findBone('footL');
    const toeR = findBone('toeR');
    const footR = findBone('footR');
    const head = findBone('head');
    
    // Get world positions
    const toeL_world = new THREE.Vector3();
    const footL_world = new THREE.Vector3();
    const toeR_world = new THREE.Vector3();
    const footR_world = new THREE.Vector3();
    const head_world = new THREE.Vector3();
    
    toeL.getWorldPosition(toeL_world);
    footL.getWorldPosition(footL_world);
    toeR.getWorldPosition(toeR_world);
    footR.getWorldPosition(footR_world);
    head.getWorldPosition(head_world);
    
    const fwdL = toeL_world.z - footL_world.z;
    const fwdR = toeR_world.z - footR_world.z;
    
    console.log(`${gender.toUpperCase()}: toeL world z = ${toeL_world.z.toFixed(6)}, footL world z = ${footL_world.z.toFixed(6)}, forward L = ${fwdL.toFixed(6)}`);
    console.log(`${gender.toUpperCase()}: toeR world z = ${toeR_world.z.toFixed(6)}, footR world z = ${footR_world.z.toFixed(6)}, forward R = ${fwdR.toFixed(6)}`);
    console.log(`${gender.toUpperCase()}: head world position = (${head_world.x.toFixed(6)}, ${head_world.y.toFixed(6)}, ${head_world.z.toFixed(6)})`);
    console.log(`${gender.toUpperCase()}: Forward sign = ${fwdL > 0 ? '+' : '-'}Z`);
    console.log('');
  }
})();
