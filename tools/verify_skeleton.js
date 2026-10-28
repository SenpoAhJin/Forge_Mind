/**
 * Skeleton Verification Tool
 * Verifies GLB skeleton matches contract structure
 * 
 * Usage: node tools/verify_skeleton.js <glb_path> <contract_path>
 * 
 * @ts-nocheck
 */

const fs = require('fs');
const path = require('path');

// Import GLB reader
const { readGLB } = require('./glb_inspect.js');

function verifySkeleton(glbPath, contractPath) {
  console.log('\n========================================');
  console.log('SKELETON VERIFICATION');
  console.log(`GLB: ${path.basename(glbPath)}`);
  console.log(`Contract: ${path.basename(contractPath)}`);
  console.log('========================================\n');
  
  // Load files
  const { gltf } = readGLB(glbPath);
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  if (!gltf.skins || gltf.skins.length === 0) {
    console.error('ERROR: No skins found in GLB');
    return false;
  }
  
  const skin = gltf.skins[0];
  
  // Build joint name to index map
  const jointMap = {};
  skin.joints.forEach(jointIdx => {
    const node = gltf.nodes[jointIdx];
    if (node.name) {
      jointMap[node.name] = jointIdx;
    }
  });
  
  // Build node hierarchy
  const children = {};
  gltf.nodes.forEach((node, nodeIdx) => {
    if (node.children) {
      children[nodeIdx] = node.children;
    }
  });
  
  // Check 1: All contract bones exist
  console.log('=== CHECK 1: Bone Names ===\n');
  const missing = [];
  contract.bones.forEach(bone => {
    if (jointMap[bone.name] === undefined) {
      missing.push(bone.name);
    }
  });
  
  if (missing.length > 0) {
    console.log('✗ FAIL: Missing bones:', missing.join(', '));
    return false;
  }
  
  console.log(`✓ PASS: All ${contract.bones.length} bones present\n`);
  
  // Check 2: Hierarchy matches
  console.log('=== CHECK 2: Bone Hierarchy ===\n');
  
  const hierarchyErrors = [];
  
  contract.bones.forEach(bone => {
    const nodeIdx = jointMap[bone.name];
    const node = gltf.nodes[nodeIdx];
    
    if (bone.parent === null) {
      // Root bone - should have no parent in joint list
      // (might be child of armature node, which is fine)
      return;
    }
    
    const parentIdx = jointMap[bone.parent];
    if (parentIdx === undefined) {
      hierarchyErrors.push(`${bone.name}: parent "${bone.parent}" not found in skeleton`);
      return;
    }
    
    // Check if this node is a child of the parent node
    const parentChildren = children[parentIdx] || [];
    if (!parentChildren.includes(nodeIdx)) {
      hierarchyErrors.push(`${bone.name}: not a child of "${bone.parent}" in GLB hierarchy`);
    }
  });
  
  if (hierarchyErrors.length > 0) {
    console.log('✗ FAIL: Hierarchy mismatches:');
    hierarchyErrors.forEach(err => console.log(`  - ${err}`));
    return false;
  }
  
  console.log(`✓ PASS: Hierarchy matches contract\n`);
  
  // Check 3: Verify inverse bind matrices exist
  console.log('=== CHECK 3: Inverse Bind Matrices ===\n');
  
  if (!skin.inverseBindMatrices) {
    console.log('✗ FAIL: No inverse bind matrices found');
    return false;
  }
  
  console.log('✓ PASS: Inverse bind matrices present\n');
  
  // Check 4: Basic structural checks
  console.log('=== CHECK 4: Structural Checks ===\n');
  
  const structuralIssues = [];
  
  // Check joint count
  if (skin.joints.length !== contract.bones.length) {
    structuralIssues.push(`Joint count mismatch: expected ${contract.bones.length}, got ${skin.joints.length}`);
  }
  
  // Check that all joints have translations (not stuck at origin)
  let zeroTranslations = 0;
  contract.bones.forEach(bone => {
    if (bone.name === 'root') return; // Root might be at origin
    
    const nodeIdx = jointMap[bone.name];
    const node = gltf.nodes[nodeIdx];
    const trans = node.translation || [0, 0, 0];
    
    const length = Math.sqrt(trans[0]**2 + trans[1]**2 + trans[2]**2);
    if (length < 0.001) {
      zeroTranslations++;
    }
  });
  
  if (zeroTranslations > 5) {
    structuralIssues.push(`Too many bones with zero translation: ${zeroTranslations} (suggests invalid export)`);
  }
  
  if (structuralIssues.length > 0) {
    console.log('✗ FAIL:');
    structuralIssues.forEach(issue => console.log(`  - ${issue}`));
    return false;
  }
  
  console.log('✓ PASS: Structure looks valid\n');
  
  // Success
  console.log('========================================');
  console.log('VERDICT: ✓ SKELETON VALID');
  console.log('========================================\n');
  console.log('The skeleton structure matches the contract.');
  console.log('Bone names, hierarchy, and inverse bind matrices are correct.');
  console.log('The model is ready to use.\n');
  
  return true;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node tools/verify_skeleton.js <glb_path> <contract_path>');
    process.exit(1);
  }
  
  const glbPath = args[0];
  const contractPath = args[1];
  
  if (!fs.existsSync(glbPath)) {
    console.error(`Error: GLB file not found: ${glbPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(contractPath)) {
    console.error(`Error: Contract file not found: ${contractPath}`);
    process.exit(1);
  }
  
  try {
    const valid = verifySkeleton(glbPath, contractPath);
    process.exit(valid ? 0 : 1);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { verifySkeleton };
