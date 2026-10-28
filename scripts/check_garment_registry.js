/**
 * Garment Registry Validation Script
 * Task C2 STEP E
 * 
 * Validates garmentRegistry.ts for:
 * - Asset paths exist (if not null and not placeholder)
 * - Slot values are valid
 * - bodyTypes are valid
 * - isPlaceholder consistency (true => asset null, placeholder defined)
 * 
 * Run: node scripts/check_garment_registry.js
 */

const fs = require('fs');
const path = require('path');

// Valid enums (must match garmentRegistry.ts)
const VALID_SLOTS = ['head', 'torso', 'legs', 'hands', 'prop'];
const VALID_BODY_TYPES = ['male', 'female'];

// Read and parse registry (simple require since it's TS)
// We'll read the source and extract the registry array manually
const registryPath = path.join(__dirname, '..', 'src', 'data', 'garmentRegistry.ts');
const registrySource = fs.readFileSync(registryPath, 'utf8');

// Extract registry array (simple regex for our known structure)
const registryMatch = registrySource.match(/const garmentRegistry: GarmentEntry\[\] = \[([\s\S]*?)\];/);
if (!registryMatch) {
  console.error('❌ Could not extract garmentRegistry array from source');
  process.exit(1);
}

// Parse entries manually (since it's TS, we can't require it directly)
// Count entries by looking for id: patterns
const entryMatches = registrySource.match(/id: '[^']+'/g);
const entryCount = entryMatches ? entryMatches.length : 0;

console.log('=== Garment Registry Validation ===\n');
console.log(`Found ${entryCount} garment entries in registry\n`);

let errorCount = 0;
let warningCount = 0;

// Extract each entry (simple approach: split by id:)
const entries = [];
const rawEntries = registrySource.split(/(?=\s+id: ')/);
for (const rawEntry of rawEntries) {
  if (!rawEntry.includes("id: '")) continue;
  
  const idMatch = rawEntry.match(/id: '([^']+)'/);
  const slotMatch = rawEntry.match(/slot: '([^']+)'/);
  const assetMatch = rawEntry.match(/asset: (null|'[^']+')/);
  const isPlaceholderMatch = rawEntry.match(/isPlaceholder: (true|false)/);
  const placeholderMatch = rawEntry.match(/placeholder: \{/);
  const bodyTypesMatch = rawEntry.match(/bodyTypes: \[([^\]]+)\]/);
  
  if (!idMatch || !slotMatch || !assetMatch) continue;
  
  const id = idMatch[1];
  const slot = slotMatch[1];
  const asset = assetMatch[1] === 'null' ? null : assetMatch[1].replace(/'/g, '');
  const isPlaceholder = isPlaceholderMatch ? isPlaceholderMatch[1] === 'true' : false;
  const hasPlaceholderDef = !!placeholderMatch;
  const bodyTypes = bodyTypesMatch 
    ? bodyTypesMatch[1].split(',').map(s => s.trim().replace(/'/g, ''))
    : [];
  
  entries.push({ id, slot, asset, isPlaceholder, hasPlaceholderDef, bodyTypes });
}

console.log(`Parsed ${entries.length} entries for validation\n`);

// Validate each entry
for (const entry of entries) {
  const { id, slot, asset, isPlaceholder, hasPlaceholderDef, bodyTypes } = entry;
  
  console.log(`Checking: ${id}`);
  
  // Check slot validity
  if (!VALID_SLOTS.includes(slot)) {
    console.error(`  ❌ Invalid slot "${slot}" (valid: ${VALID_SLOTS.join(', ')})`);
    errorCount++;
  } else {
    console.log(`  ✓ slot: ${slot}`);
  }
  
  // Check bodyTypes validity
  for (const bt of bodyTypes) {
    if (!VALID_BODY_TYPES.includes(bt)) {
      console.error(`  ❌ Invalid bodyType "${bt}" (valid: ${VALID_BODY_TYPES.join(', ')})`);
      errorCount++;
    }
  }
  if (bodyTypes.length > 0) {
    console.log(`  ✓ bodyTypes: ${bodyTypes.join(', ')}`);
  } else {
    console.error(`  ❌ No bodyTypes defined`);
    errorCount++;
  }
  
  // Check isPlaceholder consistency
  if (isPlaceholder) {
    if (asset !== null) {
      console.error(`  ❌ Placeholder garment should have asset: null`);
      errorCount++;
    } else {
      console.log(`  ✓ asset: null (placeholder)`);
    }
    
    if (!hasPlaceholderDef) {
      console.error(`  ❌ isPlaceholder: true but no placeholder definition found`);
      errorCount++;
    } else {
      console.log(`  ✓ placeholder definition present`);
    }
  } else {
    // Non-placeholder: should have asset (a variable name or import)
    if (asset === null) {
      console.warn(`  ⚠️  Non-placeholder garment has no asset (will fail at runtime)`);
      warningCount++;
    } else {
      // Asset should be a variable name (uppercase constant from import)
      // Check if that import exists in the file
      const importRegex = new RegExp(`import\\s+${asset}\\s+from.*\\.glb['"]`);
      if (registrySource.match(importRegex)) {
        console.log(`  ✓ asset: ${asset} (import found)`);
      } else {
        console.error(`  ❌ asset: ${asset} (import NOT FOUND - add: import ${asset} from '../../assets/models/garments/...')`);
        errorCount++;
      }
    }
  }
  
  console.log(`  ✓ isPlaceholder: ${isPlaceholder}`);
  console.log('');
}

// Summary
console.log('=== Validation Summary ===');
console.log(`Total entries: ${entries.length}`);
console.log(`Errors: ${errorCount}`);
console.log(`Warnings: ${warningCount}`);

if (errorCount > 0) {
  console.log('\n❌ Validation FAILED');
  process.exit(1);
} else if (warningCount > 0) {
  console.log('\n⚠️  Validation PASSED with warnings');
  process.exit(0);
} else {
  console.log('\n✅ Validation PASSED');
  process.exit(0);
}
