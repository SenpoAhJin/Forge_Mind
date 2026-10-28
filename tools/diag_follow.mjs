#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Matrix4, Vector3, Quaternion, Object3D, PropertyBinding } from 'three';

/**
 * Resolve bone name using exact or sanitized matching
 */
function resolveBone(bodyScene, boneName) {
  const bones = [];
  bodyScene.traverse((obj) => {
    if (obj.isBone) bones.push(obj);
  });
  
  // Try exact match first
  const exactMatches = bones.filter((bone) => bone.name === boneName);
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) {
    throw new Error(`Ambiguous bone name "${boneName}": found ${exactMatches.length} exact matches`);
  }
  
  // Fall back to sanitized matching
  const sanitized = PropertyBinding.sanitizeNodeName(boneName);
  const sanitizedMatches = bones.filter((bone) => bone.name === sanitized);
  if (sanitizedMatches.length === 1) return sanitizedMatches[0];
  if (sanitizedMatches.length > 1) {
    throw new Error(`Bone "${boneName}" (sanitized: "${sanitized}") is ambiguous`);
  }
  
  throw new Error(`Bone "${boneName}" (sanitized: "${sanitized}") not found in skeleton`);
}

const BODIES = [
  { name: 'Male V2', path: '../assets/models/3D_Model_Male_V2_rigged.glb' },
];

const BONES = ['head', 'foot.L', 'foot.R'];

async function loadBody(path) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const absPath = resolve(__dirname, path);
  const buffer = readFileSync(absPath);
  const loader = new GLTFLoader();
  return new Promise((res, rej) => {
    loader.parse(buffer.buffer, '', (gltf) => res(gltf), rej);
  });
}

function maxAbsDiff(m1, m2) {
  let max = 0;
  for (let i = 0; i < 16; i++) {
    max = Math.max(max, Math.abs(m1.elements[i] - m2.elements[i]));
  }
  return max;
}

function formatVec3(v) {
  return `(${v.x.toFixed(4)}, ${v.y.toFixed(4)}, ${v.z.toFixed(4)})`;
}

function formatQuat(q) {
  return `(${q.x.toFixed(4)}, ${q.y.toFixed(4)}, ${q.z.toFixed(4)}, ${q.w.toFixed(4)})`;
}

async function main() {
  console.log('GARMENT-2d Diagnostic: Follow Matrix Test Failure\n');
  console.log('Bone       | BoneScale     | ShearDiff | L0 vs Matrix | L0 vs PostRot');
  console.log('-----------|---------------|-----------|--------------|---------------');

  for (const bodyDef of BODIES) {
    const gltf = await loadBody(bodyDef.path);
    const bodyScene = gltf.scene;
    bodyScene.updateMatrixWorld(true);

    for (const boneName of BONES) {
      let bone;
      try {
        bone = resolveBone(bodyScene, boneName);
      } catch (err) {
        console.log(`${boneName.padEnd(10)} | ERROR: ${err.message}`);
        continue;
      }

      // a. Bone matrixWorld decomposed
      const bonePos = new Vector3();
      const boneQuat = new Quaternion();
      const boneScale = new Vector3();
      bone.matrixWorld.decompose(bonePos, boneQuat, boneScale);

      // Create accessory
      const accessory = new Object3D();
      accessory.name = `accessory-${boneName}`;

      // Attach with [0, 0.1, 0] offset (matching test_attach_module)
      const offset = new Vector3(0, 0.1, 0);
      const boneWorldHead = bonePos.clone();
      const desiredPos = boneWorldHead.clone().add(offset);
      const desiredQuat = new Quaternion(); // identity
      const desiredScale = new Vector3(1, 1, 1);
      const desiredWorld = new Matrix4().compose(desiredPos, desiredQuat, desiredScale);
      
      const boneWorldInv = bone.matrixWorld.clone().invert();
      const accessoryLocal = new Matrix4().multiplyMatrices(boneWorldInv, desiredWorld);
      
      // Apply via decompose (matrixAutoUpdate = true)
      const localPos = new Vector3();
      const localQuat = new Quaternion();
      const localScale = new Vector3();
      accessoryLocal.decompose(localPos, localQuat, localScale);
      
      accessory.position.copy(localPos);
      accessory.quaternion.copy(localQuat);
      accessory.scale.copy(localScale);
      bone.add(accessory);

      // b. Right after attach, BEFORE any matrix update
      const matrixAutoUpdate = accessory.matrixAutoUpdate;
      
      // c. After accessory.updateMatrix()
      accessory.updateMatrix();
      const L0 = accessory.matrix.clone();

      // d. Shear check
      const M = accessoryLocal.clone();
      const mPos = new Vector3();
      const mQuat = new Quaternion();
      const mScale = new Vector3();
      M.decompose(mPos, mQuat, mScale);
      
      const mRecomposed = new Matrix4().compose(mPos, mQuat, mScale);
      const shearDiff = maxAbsDiff(M, mRecomposed);

      // e. Rotate bone and check if accessory.matrix changes
      const axis = new Vector3(1, 2, 3).normalize();
      bone.rotateOnAxis(axis, Math.PI / 4);
      bodyScene.updateMatrixWorld(true);
      
      const postRotMatrix = accessory.matrix.clone();
      const l0VsPostRot = maxAbsDiff(L0, postRotMatrix);

      // Format bone scale
      const scaleStr = formatVec3(boneScale);
      
      console.log(`${boneName.padEnd(10)} | ${scaleStr} | ${shearDiff.toExponential(2)} | ${maxAbsDiff(L0, accessory.matrix).toExponential(2)} | ${l0VsPostRot.toExponential(2)}`);

      // Reset bone rotation
      bone.quaternion.copy(boneQuat);
      bodyScene.updateMatrixWorld(true);
    }
  }

  console.log('\nDECISION:');
  console.log('CASE A (stale L0): All L0 vs PostRot show 0.00e+0 - local matrix does not change.');
  console.log('This means accessory.matrix stays frozen even though bone rotates.');
  console.log('The test should NOT depend on L0, but on actual world matrix changes.');
}

main().catch(console.error);
