/**
 * D8a Step 3: Wearing System Proof Script
 * 
 * Tests REAL functions from src/utils/wearing.ts (no copied logic).
 * Checks: slot map, color map, buildWornGarments with matcher result.
 */

import { matcherSlotToGarmentSlot, colorNameToHex, buildWornGarments } from '../src/utils/wearing.ts';

console.log('═══════════════════════════════════════');
console.log('D8a Step 3: Wearing System Proof');
console.log('═══════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

// TEST 1: Slot map for all 5 matcher slots
console.log('--- Test 1: Slot Map (5 matcher slots) ---');
const slotTests = [
  { matcher: 'wig', expected: 'head' },
  { matcher: 'top', expected: 'torso' },
  { matcher: 'bottom', expected: 'legs' },
  { matcher: 'accessory', expected: 'prop' },
  { matcher: 'footwear', expected: 'prop' },
];

for (const test of slotTests) {
  const result = matcherSlotToGarmentSlot(test.matcher);
  if (result === test.expected) {
    console.log(`  ✓ ${test.matcher} → ${result}`);
    passCount++;
  } else {
    console.error(`  ✗ ${test.matcher} → ${result} (expected ${test.expected})`);
    failCount++;
  }
}

// TEST 2: Unknown slot returns null
console.log('\n--- Test 2: Unknown Slot Returns Null ---');
const unknownResult = matcherSlotToGarmentSlot('unknown-slot');
if (unknownResult === null) {
  console.log(`  ✓ unknown-slot → null`);
  passCount++;
} else {
  console.error(`  ✗ unknown-slot → ${unknownResult} (expected null)`);
  failCount++;
}

// TEST 3: Color map for all 9 names + unclear
console.log('\n--- Test 3: Color Map (9 colors + unclear) ---');
const colorTests = [
  { name: 'white', expected: '#FFFFFF' },
  { name: 'black', expected: '#000000' },
  { name: 'red', expected: '#FF0000' },
  { name: 'blue', expected: '#0000FF' },
  { name: 'pink', expected: '#FFC0CB' },
  { name: 'brown', expected: '#8B4513' },
  { name: 'green', expected: '#008000' },
  { name: 'purple', expected: '#800080' },
  { name: 'yellow', expected: '#FFFF00' },
  { name: 'unclear', expected: '#808080' }, // Default grey
];

for (const test of colorTests) {
  const result = colorNameToHex(test.name);
  if (result === test.expected) {
    console.log(`  ✓ ${test.name} → ${result}`);
    passCount++;
  } else {
    console.error(`  ✗ ${test.name} → ${result} (expected ${test.expected})`);
    failCount++;
  }
}

// TEST 4: buildWornGarments with matcher result (wig/top/bottom filled, accessory missing)
console.log('\n--- Test 4: buildWornGarments (3 slots filled) ---');

const mockMatchResult = {
  character_variant_id: 'char-var-1',
  character_name: 'Test Character',
  variant_name: 'Test Variant',
  suggested_outfit: {
    wig: {
      item_id: 'attr-1',
      name: 'Black Wig',
      score: 0.95,
      confidence: 'excellent',
      breakdown: { color: 1.0, keywords: 0.9, category: 1.0 },
    },
    top: {
      item_id: 'attr-2',
      name: 'Red Jacket',
      score: 0.88,
      confidence: 'good',
      breakdown: { color: 0.85, keywords: 0.9, category: 1.0 },
    },
    bottom: {
      item_id: 'attr-3',
      name: 'Blue Pants',
      score: 0.82,
      confidence: 'good',
      breakdown: { color: 0.8, keywords: 0.85, category: 1.0 },
    },
    // accessory missing (not in suggested_outfit)
  },
  alternatives: {},
  missing_items: [],
  match_quality: {
    overall_score: 0.88,
    quality_label: 'good',
  },
};

const mockOwnedItems = [
  {
    attire_id: 'attr-1',
    user_id: 'test',
    entry_method: 'text',
    entry_language: 'english',
    original_input_text: 'black wig',
    photo_urls: [],
    auto_categorized_type: 'wig',
    auto_categorized_color: 'black',
    auto_categorized_style: 'spiky',
    flexibility_tag: 'as-is-only',
    condition_rating: 4,
    condition_photo_history: [],
    availability_status: 'free',
    committed_to_project_id: null,
    acquired_date: '2026-01-01',
    acquisition_cost: 0,
    notes: '',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    attire_id: 'attr-2',
    user_id: 'test',
    entry_method: 'text',
    entry_language: 'english',
    original_input_text: 'red jacket',
    photo_urls: [],
    auto_categorized_type: 'clothing',
    auto_categorized_color: 'red',
    auto_categorized_style: 'leather',
    flexibility_tag: 'restyle-willing',
    condition_rating: 3,
    condition_photo_history: [],
    availability_status: 'free',
    committed_to_project_id: null,
    acquired_date: '2026-01-01',
    acquisition_cost: 1500,
    notes: '',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    attire_id: 'attr-3',
    user_id: 'test',
    entry_method: 'text',
    entry_language: 'english',
    original_input_text: 'blue pants',
    photo_urls: [],
    auto_categorized_type: 'clothing',
    auto_categorized_color: 'blue',
    auto_categorized_style: 'casual',
    flexibility_tag: 'as-is-only',
    condition_rating: 4,
    condition_photo_history: [],
    availability_status: 'free',
    committed_to_project_id: null,
    acquired_date: '2026-01-01',
    acquisition_cost: 800,
    notes: '',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const wornGarments = buildWornGarments(mockMatchResult, mockOwnedItems, 'male');

// Check count (should be 3: wig, top, bottom)
if (wornGarments.length === 3) {
  console.log(`  ✓ Count: ${wornGarments.length} garments`);
  passCount++;
} else {
  console.error(`  ✗ Count: ${wornGarments.length} (expected 3)`);
  failCount++;
}

// Check each garment
const expected = [
  { slot: 'head', itemId: 'attr-1', colorHex: '#000000', label: 'black wig' },
  { slot: 'torso', itemId: 'attr-2', colorHex: '#FF0000', label: 'red clothing' },
  { slot: 'legs', itemId: 'attr-3', colorHex: '#0000FF', label: 'blue clothing' },
];

for (const exp of expected) {
  const found = wornGarments.find(w => w.slot === exp.slot);
  if (found) {
    let allMatch = true;
    let errors = [];
    
    if (found.itemId !== exp.itemId) {
      allMatch = false;
      errors.push(`itemId ${found.itemId} (expected ${exp.itemId})`);
    }
    if (found.colorHex !== exp.colorHex) {
      allMatch = false;
      errors.push(`colorHex ${found.colorHex} (expected ${exp.colorHex})`);
    }
    if (found.label !== exp.label) {
      allMatch = false;
      errors.push(`label "${found.label}" (expected "${exp.label}")`);
    }
    
    if (allMatch) {
      console.log(`  ✓ ${exp.slot}: ${found.label} (${found.colorHex})`);
      passCount++;
    } else {
      console.error(`  ✗ ${exp.slot}: ${errors.join(', ')}`);
      failCount++;
    }
  } else {
    console.error(`  ✗ ${exp.slot}: not found in wornGarments`);
    failCount++;
  }
}

// TEST 5: Empty result returns []
console.log('\n--- Test 5: Empty Result Returns [] ---');
const emptyMatchResult = {
  character_variant_id: 'char-var-2',
  character_name: 'Empty Character',
  variant_name: 'Empty Variant',
  suggested_outfit: {}, // No matches
  alternatives: {},
  missing_items: [],
  match_quality: {
    overall_score: 0,
    quality_label: 'no-matches',
  },
};

const emptyWorn = buildWornGarments(emptyMatchResult, mockOwnedItems, 'male');
if (emptyWorn.length === 0) {
  console.log(`  ✓ Empty result → [] (length ${emptyWorn.length})`);
  passCount++;
} else {
  console.error(`  ✗ Empty result → length ${emptyWorn.length} (expected 0)`);
  failCount++;
}

// SUMMARY
console.log('\n═══════════════════════════════════════');
console.log('TEST SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`PASS: ${passCount}`);
console.log(`FAIL: ${failCount}`);
console.log(`TOTAL: ${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n✅ ALL TESTS PASSED');
  console.log('Slot map, color map, and buildWornGarments work correctly.');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED');
  console.log('Fix required before wearing system is ready.');
  process.exit(1);
}
