#!/usr/bin/env node
/**
 * Manually verify one vertex's skinning assignment
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
  
  const binChunkStart = jsonEnd + 8;
  const binBuffer = buffer.slice(binChunkStart);
  
  return { gltf, binBuffer };
}

const { gltf, binBuffer } = readGLB(join(ASSETS, '3D_Model_Male_V2_rigged.glb'));
const contract = JSON.parse(readFileSync(join(ASSETS, '3D_Model_Male_V2_contract.json'), 'utf8'));

const bodyNode = gltf.nodes.find(n => n.mesh !== undefined);
const mesh = gltf.meshes[bodyNode.mesh];
const prim = mesh.primitives[0];

const posAccessor = gltf.accessors[prim.attributes.POSITION];
const posView = gltf.bufferViews[posAccessor.bufferView];
const posOffset = (posView.byteOffset || 0) + (posAccessor.byteOffset || 0);

const jointsAccessor = gltf.accessors[prim.attributes.JOINTS_0];
const weightsAccessor = gltf.accessors[prim.attributes.WEIGHTS_0];
const jointsView = gltf.bufferViews[jointsAccessor.bufferView];
const weightsView = gltf.bufferViews[weightsAccessor.bufferView];

const skin = gltf.skins[0];

// Find a vertex with X > 0.15 (should be thigh.L per contract)
for (let i = 0; i < posAccessor.count; i++) {
  const idx = posOffset + i * 12;
  const x = binBuffer.readFloatLE(idx);
  const y = binBuffer.readFloatLE(idx + 4);
  const z = binBuffer.readFloatLE(idx + 8);
  
  if (x > 0.15) {
    // Read skinning
    const jOffset = (jointsView.byteOffset || 0) + i * 4;  // 4 bytes: 4 × UNSIGNED_BYTE
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
    
    console.log(`Vertex ${i}:`);
    console.log(`  Position (raw): [${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)}]`);
    console.log(`  Position (negated X): [${(-x).toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)}]`);
    console.log(`  Skinning:`);
    
    for (let k = 0; k < 4; k++) {
      if (weights[k] > 0.01) {
        const jointIdx = joints[k];
        if (jointIdx < skin.joints.length) {
          const nodeIdx = skin.joints[jointIdx];
          const nodeName = gltf.nodes[nodeIdx].name;
          console.log(`    Joint ${jointIdx} (${nodeName}): weight=${weights[k].toFixed(3)}`);
        } else {
          console.log(`    Joint ${jointIdx}: INVALID INDEX`);
        }
      }
    }
    
    console.log('');
    
    // Only show first few
    if (i > 100) break;
  }
}

console.log('\n=== CONTRACT BONE POSITIONS ===');
console.log('thigh.L:', contract.bones.find(b => b.name === 'thigh.L').head);
console.log('thigh.R:', contract.bones.find(b => b.name === 'thigh.R').head);
console.log('\nContract says thigh.L at X=+0.0766, thigh.R at X=-0.0766');
console.log('Mesh vertices with X>0.15 (raw) should be dominated by thigh.L per contract.');
console.log('But if they\'re dominated by thigh.R or other bones, the skinning is incorrect.');
