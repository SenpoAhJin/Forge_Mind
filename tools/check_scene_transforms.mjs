#!/usr/bin/env node
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
  return JSON.parse(jsonString);
}

const gltf = readGLB(join(ASSETS, '3D_Model_Male_V2_rigged.glb'));

console.log('=== SCENE ===');
console.log('Scene count:', gltf.scenes.length);
gltf.scenes.forEach((scene, i) => {
  console.log(`Scene ${i}: ${scene.name || 'unnamed'}, nodes:`, scene.nodes);
});

console.log('\n=== ALL NODES ===');
gltf.nodes.forEach((node, i) => {
  console.log(`Node ${i}: ${node.name}`);
  if (node.matrix) console.log(`  matrix: ${node.matrix}`);
  if (node.translation) console.log(`  translation: ${node.translation}`);
  if (node.rotation) console.log(`  rotation: ${node.rotation}`);
  if (node.scale) console.log(`  scale: ${node.scale}`);
  if (node.children) console.log(`  children:`, node.children);
  if (node.mesh !== undefined) console.log(`  mesh: ${node.mesh}`);
  if (node.skin !== undefined) console.log(`  skin: ${node.skin}`);
});

console.log('\n=== CHECK ACTUAL MESH POSITIONS ===');
const bodyNode = gltf.nodes.find(n => n.mesh !== undefined);
const mesh = gltf.meshes[bodyNode.mesh];
const prim = mesh.primitives[0];
const posAccessor = gltf.accessors[prim.attributes.POSITION];
console.log('Position accessor min:', posAccessor.min);
console.log('Position accessor max:', posAccessor.max);
console.log('\nMesh bounding box (raw, pre-transform):');
console.log(`  X: [${posAccessor.min[0].toFixed(4)}, ${posAccessor.max[0].toFixed(4)}]`);
console.log(`  Y: [${posAccessor.min[1].toFixed(4)}, ${posAccessor.max[1].toFixed(4)}]`);
console.log(`  Z: [${posAccessor.min[2].toFixed(4)}, ${posAccessor.max[2].toFixed(4)}]`);
console.log('\nIf X min is negative and X max is positive, the mesh is centered.');
console.log('Contract says .L should be +X, but if mesh shows .L at negative X, there may be a viewing convention issue.');
