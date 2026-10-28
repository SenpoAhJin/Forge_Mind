/**
 * Test script for garment mapping function
 * E1 Step 6
 * 
 * Tests getGarmentForOwnedItem() with real function (no copied logic).
 * Run: npx ts-node scripts/check_garment_mapping.ts
 */

import { getGarmentForOwnedItem } from '../src/utils/wearing';
import type { OwnedAttire } from '../src/types/owned-attire';

// Test cases
const tests: Array<{
  name: string;
  item: Partial<OwnedAttire>;
  bodyType: 'male' | 'female';
  expected: string | null; // Expected garment ID or null
}> = [
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
  {
    name: 'White wig with wrong body type (male item on female body)',
    item: {
      auto_categorized_type: 'wig',
      auto_categorized_color: 'white',
    },
    bodyType: 'female',
    expected: 'wig-white-cap-female', // Should get female wig, not null
  },
];

// Run tests
let passed = 0;
let failed = 0;

console.log('=== Garment Mapping Tests ===\n');

for (const test of tests) {
  const result = getGarmentForOwnedItem(test.item as OwnedAttire, test.bodyType);
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
