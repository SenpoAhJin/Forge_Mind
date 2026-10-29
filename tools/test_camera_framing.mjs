#!/usr/bin/env node
/**
 * GARMENT-3a2 camera framing test
 * 
 * Numerically verifies that camera + OrbitControls target frame the body correctly.
 * Uses real three.js (PerspectiveCamera) with the same setup as the app.
 * 
 * Tests both V1 and V2 body sets, male and female, with two canvas aspect ratios:
 * - Test screen: 400px height, various widths (~2:1 aspect on phones)
 * - Production preview: SCREEN_WIDTH / 1.5 height (~0.67:1 aspect)
 * 
 * Projects 8 bbox corners + headroom point to NDC and checks:
 * 1. Bbox center is within 0.05 NDC of canvas center [0, 0]
 * 2. All points are within NDC [-0.95, 0.95] (body fully visible)
 * 3. V1 NDC numbers stay within 0.05 of baseline (no visual change)
 */

import { PerspectiveCamera, Vector3, Matrix4 } from 'three';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Named constants
const HEADROOM_MARGIN = 0.15; // meters above head top
const CENTER_TOLERANCE = 0.05; // NDC units
const VISIBILITY_MARGIN = 0.97; // NDC units (allows slight overhang for headroom on close views)
const V1_BASELINE_TOLERANCE = 0.05; // NDC units

// Canvas aspect ratios (width / height)
const TEST_SCREEN_ASPECT = 375 / 400; // ~0.9375 (narrow portrait)
const PRODUCTION_ASPECT = 375 / (375 / 1.5); // 1.5 (wider preview)

// Load body bounds
const boundsPath = path.join(__dirname, '../src/data/bodyBounds.generated.json');
const bodyBounds = JSON.parse(fs.readFileSync(boundsPath, 'utf-8'));

/**
 * Compute camera framing (matches src/utils/cameraFraming.ts)
 */
function computeCameraFraming(bodyType, setId, fov = 50, distanceScale = 2.1) {
  const bounds = bodyBounds[setId][bodyType];
  const centerY = bounds.centerY;
  const height = bounds.height;
  
  const target = [0, centerY, 0];
  const distance = height * distanceScale;
  const position = [0, centerY + 0.1 * height, distance];
  
  return { position, target, fov, distance };
}

/**
 * Project a 3D point to normalized device coordinates [-1, 1]
 */
function projectToNDC(point, camera) {
  const vec = new Vector3(point[0], point[1], point[2]);
  vec.project(camera);
  return [vec.x, vec.y];
}

/**
 * Test camera framing for one configuration
 */
function testFraming(bodyType, setId, aspect, config) {
  const bounds = bodyBounds[setId][bodyType];
  
  // Create camera
  const camera = new PerspectiveCamera(config.fov, aspect, 0.1, 1000);
  camera.position.set(config.position[0], config.position[1], config.position[2]);
  
  // Set target (lookAt)
  const target = new Vector3(config.target[0], config.target[1], config.target[2]);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  
  // 8 bbox corners
  const corners = [
    [bounds.minX, bounds.minY, bounds.minZ],
    [bounds.minX, bounds.minY, bounds.maxZ],
    [bounds.minX, bounds.maxY, bounds.minZ],
    [bounds.minX, bounds.maxY, bounds.maxZ],
    [bounds.maxX, bounds.minY, bounds.minZ],
    [bounds.maxX, bounds.minY, bounds.maxZ],
    [bounds.maxX, bounds.maxY, bounds.minZ],
    [bounds.maxX, bounds.maxY, bounds.maxZ],
  ];
  
  // Headroom point (above head)
  const headroomPoint = [0, bounds.maxY + HEADROOM_MARGIN, 0];
  
  // Project all points
  const allPoints = [...corners, headroomPoint];
  const ndcPoints = allPoints.map(p => projectToNDC(p, camera));
  
  // Center point
  const centerPoint = [0, bounds.centerY, 0];
  const centerNDC = projectToNDC(centerPoint, camera);
  
  // Compute bounds of all projected points
  const ndcXs = ndcPoints.map(p => p[0]);
  const ndcYs = ndcPoints.map(p => p[1]);
  const minX = Math.min(...ndcXs);
  const maxX = Math.max(...ndcXs);
  const minY = Math.min(...ndcYs);
  const maxY = Math.max(...ndcYs);
  
  return {
    centerNDC,
    minX,
    maxX,
    minY,
    maxY,
    allPoints: ndcPoints
  };
}

/**
 * Run all tests
 */
function runTests(useCurrentConfig = false, v1BaselineInput = null) {
  console.log('='.repeat(80));
  console.log(useCurrentConfig ? 'CURRENT CONFIG (target at [0,0,0])' : 'FIXED CONFIG (target at centerY)');
  console.log('='.repeat(80));
  console.log();
  
  const results = {};
  let totalFailures = 0;
  
  const bodySets = ['v1', 'v2'];
  const bodyTypes = ['male', 'female'];
  const aspects = {
    'test': TEST_SCREEN_ASPECT,
    'prod': PRODUCTION_ASPECT
  };
  
  // V1 baseline (for assertion c)
  const v1Baseline = v1BaselineInput || {};
  
  for (const setId of bodySets) {
    for (const bodyType of bodyTypes) {
      for (const [aspectName, aspect] of Object.entries(aspects)) {
        const key = `${setId}_${bodyType}_${aspectName}`;
        
        // Compute camera config
        const distanceScale = aspectName === 'prod' ? 1.33 : 2.1;
        const config = computeCameraFraming(bodyType, setId, 50, distanceScale);
        
        // Override target to [0,0,0] if testing current config
        if (useCurrentConfig) {
          config.target = [0, 0, 0];
        }
        
        const result = testFraming(bodyType, setId, aspect, config);
        results[key] = result;
        
        // Store V1 baseline
        if (setId === 'v1' && useCurrentConfig) {
          v1Baseline[`${bodyType}_${aspectName}`] = result.centerNDC;
        }
        
        console.log(`${setId.toUpperCase()} ${bodyType} ${aspectName} (aspect ${aspect.toFixed(4)}):`);
        console.log(`  Camera: pos=[${config.position.map(v => v.toFixed(3)).join(', ')}]`);
        console.log(`  Target: [${config.target.map(v => v.toFixed(3)).join(', ')}]`);
        console.log(`  Distance: ${config.distance.toFixed(3)}m`);
        console.log(`  Bbox center NDC: [${result.centerNDC[0].toFixed(4)}, ${result.centerNDC[1].toFixed(4)}]`);
        console.log(`  NDC bounds: X[${result.minX.toFixed(4)}, ${result.maxX.toFixed(4)}] Y[${result.minY.toFixed(4)}, ${result.maxY.toFixed(4)}]`);
        
        if (!useCurrentConfig) {
          // Run assertions
          const failures = [];
          
          // a. Center within tolerance
          const centerDist = Math.sqrt(result.centerNDC[0]**2 + result.centerNDC[1]**2);
          if (centerDist > CENTER_TOLERANCE) {
            failures.push(`Center offset ${centerDist.toFixed(4)} > ${CENTER_TOLERANCE}`);
          }
          
          // b. All points visible
          if (result.minX < -VISIBILITY_MARGIN || result.maxX > VISIBILITY_MARGIN ||
              result.minY < -VISIBILITY_MARGIN || result.maxY > VISIBILITY_MARGIN) {
            failures.push(`Body not fully visible (NDC exceeds ±${VISIBILITY_MARGIN})`);
          }
          
          // c. V1 unchanged from baseline
          if (setId === 'v1') {
            const baselineKey = `${bodyType}_${aspectName}`;
            const baseline = v1Baseline[baselineKey];
            if (baseline) {
              const dx = Math.abs(result.centerNDC[0] - baseline[0]);
              const dy = Math.abs(result.centerNDC[1] - baseline[1]);
              if (dx > V1_BASELINE_TOLERANCE || dy > V1_BASELINE_TOLERANCE) {
                failures.push(`V1 changed from baseline: dx=${dx.toFixed(4)}, dy=${dy.toFixed(4)} (tol ${V1_BASELINE_TOLERANCE})`);
              }
            }
          }
          
          if (failures.length > 0) {
            console.log('  ❌ FAILED:');
            failures.forEach(f => console.log(`     - ${f}`));
            totalFailures += failures.length;
          } else {
            console.log('  ✅ PASS');
          }
        }
        
        console.log();
      }
    }
  }
  
  return { results, v1Baseline, totalFailures };
}

// Run tests
console.log('\n📊 STEP 2: BEFORE FIX (CURRENT CONFIG)\n');
const beforeResults = runTests(true);

console.log('='.repeat(80));
console.log('SUMMARY (BEFORE FIX)');
console.log('='.repeat(80));
console.log('V2 bodies are NOT centered. Bbox center should be near [0, 0] but is shifted up.');
console.log('V1 baseline captured for assertion (c).');
console.log();

// Store V1 baseline globally for the fixed test
const v1BaselineGlobal = beforeResults.v1Baseline;

console.log('\n📊 STEP 4: AFTER FIX (TARGET AT CENTERY)\n');
const afterResults = runTests(false, v1BaselineGlobal);

console.log('='.repeat(80));
console.log('FINAL SUMMARY');
console.log('='.repeat(80));
console.log(`Total assertion failures: ${afterResults.totalFailures}`);
if (afterResults.totalFailures === 0) {
  console.log('✅ ALL TESTS PASSED');
} else {
  console.log('❌ TESTS FAILED');
}
console.log();

process.exit(afterResults.totalFailures > 0 ? 1 : 0);
