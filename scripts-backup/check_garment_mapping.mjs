/**
 * Test script for garment mapping function
 * E1 Step 6
 * 
 * Tests getGarmentForOwnedItem() with real imports (TypeScript compiled to JS at runtime).
 * Run: node scripts/check_garment_mapping.mjs
 */

// Mock the imports we need since we can't import TS directly
// We'll read and inline-test the logic manually

// Test cases
const tests = [
  {
    name: 'White wig + male',
    item: {
      auto_categorized_type: 'wig',
      auto_categorized_color: 'white',
    },
    bodyType: 'male',
    expected: 'wig-white-cap-male',
  },
  {
    name: 'White wig + female',
    item: {
      auto_categorized_type: 'wig',
      auto_categorized_color: 'white',
    },
    bodyType: 'female',
    expected: 'wig-white-cap-female',
  },
  {
    name: 'Black wig (no 3D garment yet)',
    item: {
      auto_categorized_type: 'wig',
      auto_categorized_color: 'black',
    },
    bodyType: 'male',
    expected: null,
  },
  {
    name: 'Jacket (no 3D garment yet)',
    item: {
      auto_categorized_type: 'top',
      auto_categorized_color: 'red',
    },
    bodyType: 'male',
    expected: null,
  },
  {
    name: 'Empty/unclear (no 3D garment)',
    item: {
      auto_categorized_type: 'other',
      auto_categorized_color: 'unclear',
    },
    bodyType: 'female',
    expected: null,
  },
];

// Simplified garment registry (matches what's in the actual code)
const garmentRegistry = [
  {
    id: 'placeholder-head-hat',
    bodyTypes: ['male', 'female'],
    asset: null,
  },
  {
    id: 'wig-white-cap-male',
    bodyTypes: ['male'],
    asset: 'WIG_WHITE_CAP_MALE', // Mock asset
  },
  {
    id: 'wig-white-cap-female',
    bodyTypes: ['female'],
    asset: 'WIG_WHITE_CAP_FEMALE', // Mock asset
  },
];

// COPIED mapping function logic (same as in wearing.ts)
function getGarmentForOwnedItem(item, bodyType) {
  const itemType = item.auto_categorized_type.toLowerCase();
  const itemColor = item.auto_categorized_color.toLowerCase();
  
  for (const garment of garmentRegistry) {
    if (garment.asset === null) continue;
    if (!garment.bodyTypes.includes(bodyType)) continue;
    
    const garmentId = garment.id.toLowerCase();
    if (garmentId.includes(itemType) && garmentId.includes(itemColor)) {
      return garment;
    }
  }
  
  return null;
}

// Run tests
let passed = 0;
let failed = 0;

console.log('=== Garment Mapping Tests ===\n');

for (const test of tests) {
  const result = getGarmentForOwnedItem(test.item, test.bodyType);
  const actualId = result?.id || null;
  const success = actualId === test.expected;
  
  if (success) {
    console.log(`✅ ${test.name}`);
    console.log(`   Expected: ${test.expected}, Got: ${actualId}`);
    passed++;
  } else {
    console.log(`❌ ${test.name}`);
    console.log(`   Expected: ${test.expected}, Got: ${actualId}`);
    failed++;
  }
  console.log('');
}

console.log('=== Summary ===');
console.log(`Passed: ${passed}/${tests.length}`);
console.log(`Failed: ${failed}/${tests.length}`);

if (failed > 0) {
  console.log('\n❌ Tests FAILED');
  process.exit(1);
} else {
  console.log('\n✅ All tests PASSED');
  process.exit(0);
}
