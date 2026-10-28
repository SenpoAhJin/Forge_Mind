/**
 * GLB Inspector with Contract Validation
 * Validates rigged body GLBs against contract specifications
 * Dependency-free Node.js script
 * 
 * Usage: node tools/glb_inspect.js <glb_path> <contract_path> [tolerance]
 * 
 * @ts-nocheck
 */

const fs = require('fs');
const path = require('path');

// Default rest-pose tolerance in meters
const DEFAULT_TOLERANCE = 0.01;

function readGLB(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  // Read GLB header (12 bytes)
  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  
  if (magic !== 0x46546C67) { // 'glTF' in ASCII
    throw new Error('Not a valid GLB file (bad magic number)');
  }
  
  // Read first chunk (JSON)
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);
  
  if (jsonChunkType !== 0x4E4F534A) { // 'JSON' in ASCII
    throw new Error('Expected JSON chunk');
  }
  
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  const jsonString = buffer.toString('utf8', jsonStart, jsonEnd);
  const gltf = JSON.parse(jsonString);
  
  return { buffer, gltf, fileSize: buffer.length };
}

function analyzeMesh(gltf, meshIndex) {
  const mesh = gltf.meshes[meshIndex];
  let triangleCount = 0;
  
  mesh.primitives.forEach(prim => {
    if (prim.indices !== undefined) {
      const accessor = gltf.accessors[prim.indices];
      triangleCount += accessor.count / 3;
    }
  });
  
  return { name: mesh.name || `Mesh_${meshIndex}`, triangleCount };
}

function countMorphTargets(gltf) {
  if (!gltf.meshes) return 0;
  
  let totalMorphs = 0;
  gltf.meshes.forEach(mesh => {
    mesh.primitives.forEach(prim => {
      if (prim.targets) {
        totalMorphs += prim.targets.length;
      }
    });
  });
  
  return totalMorphs;
}

/**
 * Convert Blender coordinates (Z up) to glTF (Y up)
 * Blender: (x, y, z) → glTF: (x, z, -y)
 */
function blenderToGltf(blenderPos) {
  return [
    blenderPos[0],
    blenderPos[2],
    -blenderPos[1]
  ];
}

/**
 * Build parent lookup table
 */
function buildParentLookup(gltf) {
  const parentLookup = {};
  
  gltf.nodes.forEach((node, nodeIndex) => {
    if (node.children) {
      node.children.forEach(childIndex => {
        parentLookup[childIndex] = nodeIndex;
      });
    }
  });
  
  return parentLookup;
}

/**
 * Calculate world position from local transforms
 */
function getNodeWorldPosition(gltf, nodeIndex, parentLookup, cache = {}) {
  if (cache[nodeIndex]) {
    return cache[nodeIndex];
  }
  
  const node = gltf.nodes[nodeIndex];
  const localPos = node.translation || [0, 0, 0];
  
  const parentIndex = parentLookup[nodeIndex];
  if (parentIndex === undefined) {
    // Root node
    cache[nodeIndex] = localPos;
    return localPos;
  }
  
  // Recursively get parent world position
  const parentWorldPos = getNodeWorldPosition(gltf, parentIndex, parentLookup, cache);
  
  // Add parent world position to local position
  const worldPos = [
    parentWorldPos[0] + localPos[0],
    parentWorldPos[1] + localPos[1],
    parentWorldPos[2] + localPos[2]
  ];
  
  cache[nodeIndex] = worldPos;
  return worldPos;
}

/**
 * Get joint world positions from glTF nodes
 */
function getJointWorldPositions(gltf, skin) {
  const jointPositions = {};
  const parentLookup = buildParentLookup(gltf);
  const cache = {};
  
  skin.joints.forEach(jointIndex => {
    const node = gltf.nodes[jointIndex];
    if (node && node.name) {
      const worldPos = getNodeWorldPosition(gltf, jointIndex, parentLookup, cache);
      jointPositions[node.name] = worldPos;
    }
  });
  
  return jointPositions;
}

/**
 * Check if two positions match within tolerance
 */
function positionsMatch(pos1, pos2, tolerance) {
  const dx = Math.abs(pos1[0] - pos2[0]);
  const dy = Math.abs(pos1[1] - pos2[1]);
  const dz = Math.abs(pos1[2] - pos2[2]);
  
  return dx <= tolerance && dy <= tolerance && dz <= tolerance;
}

/**
 * Check left/right symmetry for paired bones
 */
function checkSymmetry(jointPositions, tolerance) {
  const pairs = [
    ['clavicle.L', 'clavicle.R'],
    ['upperarm.L', 'upperarm.R'],
    ['forearm.L', 'forearm.R'],
    ['hand.L', 'hand.R'],
    ['thigh.L', 'thigh.R'],
    ['shin.L', 'shin.R'],
    ['foot.L', 'foot.R'],
    ['toe.L', 'toe.R']
  ];
  
  const failures = [];
  
  pairs.forEach(([left, right]) => {
    const leftPos = jointPositions[left];
    const rightPos = jointPositions[right];
    
    if (leftPos && rightPos) {
      // Check that X is mirrored, Y and Z match
      const xSymmetric = Math.abs(Math.abs(leftPos[0]) - Math.abs(rightPos[0])) <= tolerance;
      const yMatch = Math.abs(leftPos[1] - rightPos[1]) <= tolerance;
      const zMatch = Math.abs(leftPos[2] - rightPos[2]) <= tolerance;
      
      if (!xSymmetric || !yMatch || !zMatch) {
        failures.push({
          pair: `${left} / ${right}`,
          leftPos,
          rightPos
        });
      }
    }
  });
  
  return failures;
}

/**
 * Main inspection function
 */
function inspectWithContract(glbPath, contractPath, tolerance = DEFAULT_TOLERANCE) {
  console.log(`\n========================================`);
  console.log(`GLB: ${path.basename(glbPath)}`);
  console.log(`Contract: ${path.basename(contractPath)}`);
  console.log(`Tolerance: ${tolerance} m`);
  console.log(`========================================\n`);
  
  // Load files
  const { buffer, gltf, fileSize } = readGLB(glbPath);
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  const results = {
    checks: [],
    pass: true
  };
  
  function addCheck(name, target, actual, pass, details = '') {
    results.checks.push({ name, target, actual, pass, details });
    if (!pass) results.pass = false;
  }
  
  // Check 1: Joint count
  const skinCount = gltf.skins?.length || 0;
  const jointCount = skinCount > 0 ? gltf.skins[0].joints.length : 0;
  const expectedJointCount = contract.bones.length;
  addCheck(
    'Joint count',
    expectedJointCount,
    jointCount,
    jointCount === expectedJointCount
  );
  
  // Check 2: Joint names
  if (skinCount > 0) {
    const skin = gltf.skins[0];
    const actualJointNames = skin.joints.map(idx => gltf.nodes[idx].name);
    const expectedJointNames = contract.bones.map(b => b.name);
    
    const missing = expectedJointNames.filter(n => !actualJointNames.includes(n));
    const extra = actualJointNames.filter(n => !expectedJointNames.includes(n));
    
    const jointNamesMatch = missing.length === 0 && extra.length === 0;
    addCheck(
      'Joint names',
      'all match',
      jointNamesMatch ? 'all match' : `missing: [${missing.join(', ')}], extra: [${extra.join(', ')}]`,
      jointNamesMatch,
      jointNamesMatch ? '' : `Missing: [${missing.join(', ')}] Extra: [${extra.join(', ')}]`
    );
  } else {
    addCheck('Joint names', 'N/A', 'N/A (no skin)', false);
  }
  
  // Check 3: Skin count
  addCheck('Skin count', 1, skinCount, skinCount === 1);
  
  // Check 4: Triangle count
  let totalTriangles = 0;
  if (gltf.meshes) {
    gltf.meshes.forEach((mesh, i) => {
      const analysis = analyzeMesh(gltf, i);
      totalTriangles += analysis.triangleCount;
    });
  }
  const triangleLimit = contract.triangles || 20000;
  addCheck(
    'Triangle count',
    `<= ${triangleLimit}`,
    Math.floor(totalTriangles),
    totalTriangles <= triangleLimit
  );
  
  // Check 5: Morph targets
  const morphCount = countMorphTargets(gltf);
  addCheck('Morph targets', 0, morphCount, morphCount === 0);
  
  // Check 6: File size (report only)
  addCheck(
    'File size',
    'report',
    `${(fileSize / 1024).toFixed(2)} KB`,
    true
  );
  
  // Check 7: Rest-pose verification
  if (skinCount > 0) {
    const skin = gltf.skins[0];
    const jointPositions = getJointWorldPositions(gltf, skin);
    
    let restPoseFailed = false;
    const restPoseFailures = [];
    
    contract.bones.forEach(bone => {
      const actualPos = jointPositions[bone.name];
      if (actualPos) {
        const expectedPos = blenderToGltf(bone.head);
        if (!positionsMatch(actualPos, expectedPos, tolerance)) {
          restPoseFailed = true;
          restPoseFailures.push({
            bone: bone.name,
            expected: expectedPos,
            actual: actualPos
          });
        }
      }
    });
    
    addCheck(
      'Rest-pose check',
      'all within tolerance',
      restPoseFailed ? `${restPoseFailures.length} mismatches` : 'all match',
      !restPoseFailed,
      restPoseFailed ? restPoseFailures.slice(0, 3).map(f => 
        `${f.bone}: exp [${f.expected.map(v => v.toFixed(3)).join(', ')}] got [${f.actual.map(v => v.toFixed(3)).join(', ')}]`
      ).join('; ') : ''
    );
  } else {
    addCheck('Rest-pose check', 'N/A', 'N/A (no skin)', false);
  }
  
  // Check 8: Left/right symmetry
  if (skinCount > 0) {
    const skin = gltf.skins[0];
    const jointPositions = getJointWorldPositions(gltf, skin);
    const symmetryFailures = checkSymmetry(jointPositions, tolerance);
    
    addCheck(
      'L/R symmetry',
      'symmetric',
      symmetryFailures.length === 0 ? 'symmetric' : `${symmetryFailures.length} asymmetric`,
      symmetryFailures.length === 0,
      symmetryFailures.length > 0 ? symmetryFailures.slice(0, 2).map(f => f.pair).join(', ') : ''
    );
  } else {
    addCheck('L/R symmetry', 'N/A', 'N/A (no skin)', false);
  }
  
  return results;
}

/**
 * Print results table
 */
function printResults(results) {
  console.log(`\nRESULTS:\n`);
  console.log(`| Check              | Target           | Actual           | Result |`);
  console.log(`|--------------------|------------------|------------------|--------|`);
  
  results.checks.forEach(check => {
    const name = check.name.padEnd(18);
    const target = String(check.target).padEnd(16);
    const actual = String(check.actual).padEnd(16);
    const result = check.pass ? 'PASS' : 'FAIL';
    console.log(`| ${name} | ${target} | ${actual} | ${result} |`);
    
    if (check.details) {
      console.log(`  └─ ${check.details}`);
    }
  });
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`OVERALL: ${results.pass ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`${'='.repeat(70)}\n`);
  
  return results.pass;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node tools/glb_inspect.js <glb_path> <contract_path> [tolerance]');
    process.exit(1);
  }
  
  const glbPath = args[0];
  const contractPath = args[1];
  const tolerance = args[2] ? parseFloat(args[2]) : DEFAULT_TOLERANCE;
  
  if (!fs.existsSync(glbPath)) {
    console.error(`Error: GLB file not found: ${glbPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(contractPath)) {
    console.error(`Error: Contract file not found: ${contractPath}`);
    process.exit(1);
  }
  
  try {
    const results = inspectWithContract(glbPath, contractPath, tolerance);
    const passed = printResults(results);
    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { inspectWithContract, readGLB };
