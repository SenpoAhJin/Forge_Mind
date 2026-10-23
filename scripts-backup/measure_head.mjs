/**
 * measure_head.mjs
 *
 * Measures the real head joint position in both body GLBs.
 * Rigify's head deform bone is usually DEF-spine.006 (top of neck/head).
 *
 * Run: node scripts/measure_head.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = join(__dirname, '..', 'assets', 'models');

function readGLB(filePath) {
  const buf = readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  return JSON.parse(jsonStr);
}

function multiplyMat4Vec3(mat, vec) {
  const w = mat[3] * vec[0] + mat[7] * vec[1] + mat[11] * vec[2] + mat[15];
  return [
    (mat[0] * vec[0] + mat[4] * vec[1] + mat[8] * vec[2] + mat[12]) / w,
    (mat[1] * vec[0] + mat[5] * vec[1] + mat[9] * vec[2] + mat[13]) / w,
    (mat[2] * vec[0] + mat[6] * vec[1] + mat[10] * vec[2] + mat[14]) / w,
  ];
}

function identityMat4() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiplyMat4(a, b) {
  const out = new Array(16);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      out[row + col * 4] =
        a[row + 0] * b[0 + col * 4] +
        a[row + 4] * b[1 + col * 4] +
        a[row + 8] * b[2 + col * 4] +
        a[row + 12] * b[3 + col * 4];
    }
  }
  return out;
}

function translationFromMatrix(mat) {
  return [mat[12], mat[13], mat[14]];
}

function measureHeadJoint(bodyType, glbPath) {
  const gltf = readGLB(glbPath);
  
  // Find head joint (Rigify: DEF-spine.006 or DEF-spine006)
  const headJointNames = ['DEF-spine.006', 'DEF-spine006', 'head'];
  let headNode = null;
  let headIndex = -1;
  
  for (const name of headJointNames) {
    headIndex = gltf.nodes.findIndex(n => n.name === name);
    if (headIndex !== -1) {
      headNode = gltf.nodes[headIndex];
      break;
    }
  }
  
  if (!headNode) {
    console.log(`\n${bodyType.toUpperCase()} body:`);
    console.log('  ❌ Head joint not found. Available spine joints:');
    const spineJoints = gltf.nodes
      .filter(n => n.name && (n.name.includes('spine') || n.name.includes('head') || n.name.includes('DEF')))
      .map(n => n.name)
      .slice(0, 20); // Show first 20
    console.log('    ', spineJoints.join(', '));
    return null;
  }
  
  console.log(`\n${bodyType.toUpperCase()} body:`);
  console.log(`  Found head joint: "${headNode.name}" (node index ${headIndex})`);
  
  // Walk parent chain to build world matrix
  let worldMatrix = identityMat4();
  let currentIndex = headIndex;
  const visited = new Set();
  
  while (currentIndex !== -1 && !visited.has(currentIndex)) {
    visited.add(currentIndex);
    const node = gltf.nodes[currentIndex];
    
    // Get local matrix (prefer `matrix`, fall back to TRS)
    let localMatrix;
    if (node.matrix) {
      localMatrix = node.matrix;
    } else {
      const t = node.translation || [0, 0, 0];
      const r = node.rotation || [0, 0, 0, 1];
      const s = node.scale || [1, 1, 1];
      
      // Build TRS matrix (simplified - translation only for now)
      localMatrix = identityMat4();
      localMatrix[12] = t[0];
      localMatrix[13] = t[1];
      localMatrix[14] = t[2];
      // TODO: Apply rotation and scale if needed (not typical for Rigify bone chains)
    }
    
    // Pre-multiply: world = local * world
    worldMatrix = multiplyMat4(localMatrix, worldMatrix);
    
    // Find parent
    currentIndex = -1;
    for (let i = 0; i < gltf.nodes.length; i++) {
      if (gltf.nodes[i].children && gltf.nodes[i].children.includes(node.__index || currentIndex)) {
        currentIndex = i;
        break;
      }
    }
  }
  
  // Extract world position
  const worldPos = translationFromMatrix(worldMatrix);
  
  // Head top Y from bodyBounds
  const headTopY = bodyType === 'male' ? 0.931 : 0.944;
  const headHeight = headTopY - worldPos[1];
  const headHalfHeight = headHeight / 2;
  const headCenterY = worldPos[1] + headHalfHeight;
  
  console.log(`  World position: [${worldPos.map(v => v.toFixed(3)).join(', ')}]`);
  console.log(`  Head top Y: ${headTopY.toFixed(3)} (from bodyBounds)`);
  console.log(`  Head height (top - joint): ${headHeight.toFixed(3)}`);
  console.log(`  Head half-height: ${headHalfHeight.toFixed(3)}`);
  console.log(`  Head center Y: ${headCenterY.toFixed(3)}`);
  
  return {
    jointPos: worldPos,
    headTopY,
    headHeight,
    headHalfHeight,
    headCenterY,
  };
}

console.log('=== Measuring Head Joints from Body GLBs ===');

const maleData = measureHeadJoint('male', join(MODELS_DIR, '3D_Model_Male.glb'));
const femaleData = measureHeadJoint('female', join(MODELS_DIR, '3D_Model_Female.glb'));

console.log('\n=== Comparison with Generator Estimates ===');
console.log('Generator estimates (from generate_wig_glb.mjs):');
console.log('  HEAD.halfHeight: 0.125');
console.log('  BODIES.male.headTopY: 0.931, centerX: -0.002, centerZ: -0.012');
console.log('  BODIES.female.headTopY: 0.944, centerX: -0.003, centerZ: 0.002');

if (maleData && femaleData) {
  console.log('\nMeasured values:');
  console.log(`  Male head half-height: ${maleData.headHalfHeight.toFixed(3)}`);
  console.log(`  Female head half-height: ${femaleData.headHalfHeight.toFixed(3)}`);
  console.log(`  Male head center: [${maleData.jointPos[0].toFixed(3)}, ${maleData.headCenterY.toFixed(3)}, ${maleData.jointPos[2].toFixed(3)}]`);
  console.log(`  Female head center: [${femaleData.jointPos[0].toFixed(3)}, ${femaleData.headCenterY.toFixed(3)}, ${femaleData.jointPos[2].toFixed(3)}]`);
  
  const maleHeightDiff = Math.abs(maleData.headHalfHeight - 0.125);
  const femaleHeightDiff = Math.abs(femaleData.headHalfHeight - 0.125);
  
  if (maleHeightDiff > 0.02 || femaleHeightDiff > 0.02) {
    console.log('\n⚠️  Measured head heights differ significantly from estimates!');
    console.log('   Consider updating HEAD.halfHeight in generate_wig_glb.mjs and regenerating.');
  } else {
    console.log('\n✅ Estimated head heights are close to measured values.');
  }
}

console.log('\n=== End of Measurement ===\n');
