#!/usr/bin/env node
/**
 * diagnose_joint_attribution.mjs
 * 
 * Diagnose why left/right limb centers are both negative.
 * Prints detailed joint attribution tables for V2 bodies.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets', 'models');

const BODIES = [
  { gender: 'male', glb: '3D_Model_Male_V2_rigged.glb', contract: '3D_Model_Male_V2_contract.json' },
  { gender: 'female', glb: '3D_Model_Female_V2_rigged.glb', contract: '3D_Model_Female_V2_contract.json' },
];

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

function getPositions(gltf, binBuffer, accessorIndex) {
  const accessor = gltf.accessors[accessorIndex];
  if (accessor.type !== 'VEC3' || accessor.componentType !== 5126) {
    throw new Error('Expected VEC3 FLOAT accessor');
  }
  
  const bufferView = gltf.bufferViews[accessor.bufferView];
  const offset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const count = accessor.count;
  const positions = [];
  
  for (let i = 0; i < count; i++) {
    const idx = offset + i * 12;
    positions.push([
      binBuffer.readFloatLE(idx),
      binBuffer.readFloatLE(idx + 4),
      binBuffer.readFloatLE(idx + 8),
    ]);
  }
  
  return positions;
}

function applyTransform(pos, matrix) {
  if (!matrix) return pos;
  const [x, y, z] = pos;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

function diagnoseBody(config) {
  const glbPath = join(ASSETS, config.glb);
  const contractPath = join(ASSETS, config.contract);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`GENDER: ${config.gender.toUpperCase()}`);
  console.log('='.repeat(60));
  
  const { gltf, binBuffer } = readGLB(glbPath);
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  
  const bodyNode = gltf.nodes.find(n => n.mesh !== undefined);
  const mesh = gltf.meshes[bodyNode.mesh];
  const prim = mesh.primitives[0];
  
  const positions = getPositions(gltf, binBuffer, prim.attributes.POSITION);
  const jointsAccessor = gltf.accessors[prim.attributes.JOINTS_0];
  const weightsAccessor = gltf.accessors[prim.attributes.WEIGHTS_0];
  const jointsView = gltf.bufferViews[jointsAccessor.bufferView];
  const weightsView = gltf.bufferViews[weightsAccessor.bufferView];
  
  const skin = gltf.skins[0];
  
  // Build joint data: for each joint, collect vertices where it's dominant
  const jointData = [];
  
  for (let jointIdx = 0; jointIdx < skin.joints.length; jointIdx++) {
    const nodeIdx = skin.joints[jointIdx];
    const node = gltf.nodes[nodeIdx];
    const nodeName = node.name;
    
    // Find contract bone name
    const contractBone = contract.bones.find(b => b.name === nodeName);
    const contractBoneName = contractBone ? contractBone.name : 'N/A';
    
    // Determine side
    let side = 'center';
    if (nodeName.endsWith('.L')) side = 'L';
    else if (nodeName.endsWith('.R')) side = 'R';
    
    // Collect vertices
    const dominantVerts = [];
    for (let i = 0; i < positions.length; i++) {
      const jOffset = (jointsView.byteOffset || 0) + i * 4; // 4 × UNSIGNED_BYTE
      const wOffset = (weightsView.byteOffset || 0) + i * 16;
      
      const joints = [
        binBuffer.readUInt8(jOffset),
        binBuffer.readUInt8(jOffset + 1),
        binBuffer.readUInt8(jOffset + 2),
        binBuffer.readUInt8(jOffset + 3),
      ];
      const weights = [
        binBuffer.readFloatLE(wOffset),
        binBuffer.readFloatLE(wOffset + 4),
        binBuffer.readFloatLE(wOffset + 8),
        binBuffer.readFloatLE(wOffset + 12),
      ];
      
      let maxWeight = -1;
      let dominantJoint = -1;
      for (let k = 0; k < 4; k++) {
        if (weights[k] > maxWeight) {
          maxWeight = weights[k];
          dominantJoint = joints[k];
        }
      }
      
      if (dominantJoint === jointIdx) {
        const nodeTransform = bodyNode.matrix;
        const transformed = applyTransform(positions[i], nodeTransform);
        dominantVerts.push(transformed);
      }
    }
    
    if (dominantVerts.length > 0) {
      const xVals = dominantVerts.map(([x]) => x);
      const meanX = xVals.reduce((a, b) => a + b, 0) / xVals.length;
      const minX = Math.min(...xVals);
      const maxX = Math.max(...xVals);
      
      jointData.push({
        jointIdx,
        nodeName,
        contractBoneName,
        side,
        vertexCount: dominantVerts.length,
        meanX,
        minX,
        maxX,
      });
    }
  }
  
  // Print table
  console.log('\nJoint Attribution Table:');
  console.log('JointIdx | Node Name       | Contract Bone | Side   | VertCount | Mean X   | Min X    | Max X');
  console.log('-'.repeat(105));
  
  jointData.forEach(d => {
    const idx = String(d.jointIdx).padStart(8);
    const nodeName = d.nodeName.padEnd(15);
    const contractBone = d.contractBoneName.padEnd(13);
    const side = d.side.padEnd(6);
    const vertCount = String(d.vertexCount).padStart(9);
    const meanX = d.meanX.toFixed(4).padStart(8);
    const minX = d.minX.toFixed(4).padStart(8);
    const maxX = d.maxX.toFixed(4).padStart(8);
    
    console.log(`${idx} | ${nodeName} | ${contractBone} | ${side} | ${vertCount} | ${meanX} | ${minX} | ${maxX}`);
  });
  
  // Analyze limb groups
  console.log('\n--- LIMB GROUP ANALYSIS ---');
  
  const leftArmBones = ['clavicle.L', 'upperarm.L', 'forearm.L', 'hand.L'];
  const rightArmBones = ['clavicle.R', 'upperarm.R', 'forearm.R', 'hand.R'];
  const leftLegBones = ['thigh.L', 'shin.L', 'foot.L', 'toe.L'];
  const rightLegBones = ['thigh.R', 'shin.R', 'foot.R', 'toe.R'];
  
  const getGroupMeanX = (boneNames) => {
    const group = jointData.filter(d => boneNames.includes(d.contractBoneName));
    if (group.length === 0) return null;
    const totalVerts = group.reduce((sum, d) => sum + d.vertexCount, 0);
    const weightedSum = group.reduce((sum, d) => sum + d.meanX * d.vertexCount, 0);
    return weightedSum / totalVerts;
  };
  
  const leftArmMeanX = getGroupMeanX(leftArmBones);
  const rightArmMeanX = getGroupMeanX(rightArmBones);
  const leftLegMeanX = getGroupMeanX(leftLegBones);
  const rightLegMeanX = getGroupMeanX(rightLegBones);
  
  // Compute body center X
  const allXVals = [];
  for (let i = 0; i < positions.length; i++) {
    const nodeTransform = bodyNode.matrix;
    const transformed = applyTransform(positions[i], nodeTransform);
    allXVals.push(transformed[0]);
  }
  const bodyCenterX = allXVals.reduce((a, b) => a + b, 0) / allXVals.length;
  
  console.log(`Body center X:      ${bodyCenterX.toFixed(4)}`);
  console.log(`Left arm mean X:    ${leftArmMeanX !== null ? leftArmMeanX.toFixed(4) : 'N/A'}`);
  console.log(`Right arm mean X:   ${rightArmMeanX !== null ? rightArmMeanX.toFixed(4) : 'N/A'}`);
  console.log(`Left leg mean X:    ${leftLegMeanX !== null ? leftLegMeanX.toFixed(4) : 'N/A'}`);
  console.log(`Right leg mean X:   ${rightLegMeanX !== null ? rightLegMeanX.toFixed(4) : 'N/A'}`);
  
  console.log('\n--- CONTRACT VERIFICATION ---');
  console.log(`Contract says: "character left = +X (.L)"`);
  console.log(`Expected: left limb mean X > body center X > right limb mean X`);
  
  const leftArmCorrect = leftArmMeanX !== null && leftArmMeanX > bodyCenterX;
  const rightArmCorrect = rightArmMeanX !== null && rightArmMeanX < bodyCenterX;
  const leftLegCorrect = leftLegMeanX !== null && leftLegMeanX > bodyCenterX;
  const rightLegCorrect = rightLegMeanX !== null && rightLegMeanX < bodyCenterX;
  
  console.log(`Left arm:  ${leftArmCorrect ? 'PASS' : 'FAIL'} (${leftArmMeanX !== null ? leftArmMeanX.toFixed(4) : 'N/A'} ${leftArmCorrect ? '>' : '<?'} ${bodyCenterX.toFixed(4)})`);
  console.log(`Right arm: ${rightArmCorrect ? 'PASS' : 'FAIL'} (${rightArmMeanX !== null ? rightArmMeanX.toFixed(4) : 'N/A'} ${rightArmCorrect ? '<' : '>?'} ${bodyCenterX.toFixed(4)})`);
  console.log(`Left leg:  ${leftLegCorrect ? 'PASS' : 'FAIL'} (${leftLegMeanX !== null ? leftLegMeanX.toFixed(4) : 'N/A'} ${leftLegCorrect ? '>' : '<?'} ${bodyCenterX.toFixed(4)})`);
  console.log(`Right leg: ${rightLegCorrect ? 'PASS' : 'FAIL'} (${rightLegMeanX !== null ? rightLegMeanX.toFixed(4) : 'N/A'} ${rightLegCorrect ? '<' : '>?'} ${bodyCenterX.toFixed(4)})`);
}

function main() {
  console.log('='.repeat(60));
  console.log('JOINT ATTRIBUTION DIAGNOSIS');
  console.log('='.repeat(60));
  
  BODIES.forEach(config => diagnoseBody(config));
  
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSIS COMPLETE');
  console.log('='.repeat(60));
}

main();
