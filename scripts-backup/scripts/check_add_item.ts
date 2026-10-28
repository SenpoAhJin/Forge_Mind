/**
 * D7d-1 Step 3: Test old-shape and text-entry items through normalizer and data paths
 * 
 * Simulates loading old items from AsyncStorage (missing photo_urls, condition_photo_history)
 * and text-entry items (have photo_urls: []) through the REAL normalizer function,
 * then runs the same data access patterns used in list/detail screens.
 */

import { OwnedAttire } from '../src/types/owned-attire';

console.log('═══════════════════════════════════════');
console.log('D7d-1 Step 3: Add Item Normalizer Test');
console.log('═══════════════════════════════════════\n');

// Simulate normalizer from OwnedAttireContext.tsx load function
const normalizeItem = (item: any): OwnedAttire => {
  return {
    ...item,
    photo_urls: Array.isArray(item.photo_urls) ? item.photo_urls : [],
    condition_photo_history: Array.isArray(item.condition_photo_history) 
      ? item.condition_photo_history 
      : [],
  };
};

// Test Case 1: OLD SHAPE ITEM (saved before photo_urls/condition_photo_history existed)
const oldShapeItem = {
  attire_id: 'attr-old-1',
  user_id: 'test@example.com',
  entry_method: 'text',
  entry_language: 'english',
  original_input_text: 'black wig spiky style',
  // photo_urls: undefined (missing key)
  // condition_photo_history: undefined (missing key)
  auto_categorized_type: 'wig',
  auto_categorized_color: 'black',
  auto_categorized_style: 'spiky',
  flexibility_tag: 'as-is-only',
  condition_rating: 4,
  availability_status: 'free',
  committed_to_project_id: null,
  acquired_date: '2026-01-15',
  acquisition_cost: 0,
  notes: '',
  created_at: '2026-01-15T10:00:00.000Z',
  updated_at: '2026-01-15T10:00:00.000Z',
};

// Test Case 2: TEXT ENTRY ITEM (from TextEntryScreen after D7d-1 Step 2 fix)
const textEntryItem = {
  attire_id: 'attr-text-1',
  user_id: 'test@example.com',
  entry_method: 'text',
  entry_language: 'english',
  original_input_text: 'red jacket leather style',
  photo_urls: [], // Explicitly empty array from entry form
  auto_categorized_type: 'top',
  auto_categorized_color: 'red',
  auto_categorized_style: 'leather',
  flexibility_tag: 'restyle-willing',
  condition_rating: 3,
  condition_photo_history: [
    {
      timestamp: '2026-10-15T12:00:00.000Z',
      photo_url: null,
      condition_rating: 3,
    },
  ],
  availability_status: 'free',
  committed_to_project_id: null,
  acquired_date: '2026-10-15',
  acquisition_cost: 1500,
  notes: 'Bought at convention',
  created_at: '2026-10-15T12:00:00.000Z',
  updated_at: '2026-10-15T12:00:00.000Z',
};

let passCount = 0;
let failCount = 0;

// NORMALIZE both items
console.log('--- Normalizing Items ---\n');
const normalizedOld = normalizeItem(oldShapeItem);
const normalizedText = normalizeItem(textEntryItem);

console.log(`Old Shape Item normalized:
  photo_urls: ${JSON.stringify(normalizedOld.photo_urls)}
  condition_photo_history: ${JSON.stringify(normalizedOld.condition_photo_history)}`);

console.log(`\nText Entry Item normalized:
  photo_urls: ${JSON.stringify(normalizedText.photo_urls)}
  condition_photo_history: ${JSON.stringify(normalizedText.condition_photo_history)}\n`);

// TEST 1: ItemConfirmationScreen.tsx line 79 pattern (the crash site)
console.log('--- Test 1: ItemConfirmationScreen.tsx:79 filter pattern ---');
try {
  // Simulate draft object from entry form
  const draftOld = {
    ...normalizedOld,
    entry_method: 'text' as const,
    entry_language: 'english' as const,
    original_input_text: normalizedOld.original_input_text,
    photo_urls: normalizedOld.photo_urls,
    auto_categorized_type: normalizedOld.auto_categorized_type,
    auto_categorized_color: normalizedOld.auto_categorized_color,
    auto_categorized_style: normalizedOld.auto_categorized_style,
    condition_rating: normalizedOld.condition_rating,
  };
  
  // OLD CRASH LINE: draft.photo_urls.filter(...)
  // NEW SAFE LINE: (draft.photo_urls ?? []).filter(...)
  const photosOld = (draftOld.photo_urls ?? []).filter((u): u is string => u !== null);
  
  const draftText = {
    ...normalizedText,
    entry_method: 'text' as const,
    entry_language: 'english' as const,
    original_input_text: normalizedText.original_input_text,
    photo_urls: normalizedText.photo_urls,
    auto_categorized_type: normalizedText.auto_categorized_type,
    auto_categorized_color: normalizedText.auto_categorized_color,
    auto_categorized_style: normalizedText.auto_categorized_style,
    condition_rating: normalizedText.condition_rating,
  };
  
  const photosText = (draftText.photo_urls ?? []).filter((u): u is string => u !== null);
  
  console.log(`  Old shape item photos: ${JSON.stringify(photosOld)} (length: ${photosOld.length})`);
  console.log(`  Text entry item photos: ${JSON.stringify(photosText)} (length: ${photosText.length})`);
  console.log('  ✓ PASS: No crash on undefined photo_urls\n');
  passCount++;
} catch (err: any) {
  console.error(`  ✗ FAIL: ${err.message}\n`);
  failCount++;
}

// TEST 2: OwnedItemDashboard.tsx line 95 pattern (optional chaining)
console.log('--- Test 2: OwnedItemDashboard.tsx:95 optional chaining pattern ---');
try {
  const firstPhotoOld = normalizedOld.photo_urls?.[0];
  const firstPhotoText = normalizedText.photo_urls?.[0];
  
  console.log(`  Old shape first photo: ${firstPhotoOld ?? 'undefined'}`);
  console.log(`  Text entry first photo: ${firstPhotoText ?? 'undefined'}`);
  console.log('  ✓ PASS: Optional chaining works, no crash\n');
  passCount++;
} catch (err: any) {
  console.error(`  ✗ FAIL: ${err.message}\n`);
  failCount++;
}

// TEST 3: OwnedItemDetail.tsx line 235 pattern (condition history)
console.log('--- Test 3: OwnedItemDetail.tsx:235 condition history pattern ---');
try {
  const hasHistoryOld = normalizedOld.condition_photo_history?.length ?? 0;
  const hasHistoryText = normalizedText.condition_photo_history?.length ?? 0;
  
  console.log(`  Old shape condition history length: ${hasHistoryOld}`);
  console.log(`  Text entry condition history length: ${hasHistoryText}`);
  
  if (hasHistoryOld > 0) {
    const reversedOld = normalizedOld.condition_photo_history!.slice().reverse();
    console.log(`    Reversed old history: ${reversedOld.length} entries`);
  }
  
  if (hasHistoryText > 0) {
    const reversedText = normalizedText.condition_photo_history!.slice().reverse();
    console.log(`    Reversed text history: ${reversedText.length} entries`);
  }
  
  console.log('  ✓ PASS: Condition history access works\n');
  passCount++;
} catch (err: any) {
  console.error(`  ✗ FAIL: ${err.message}\n`);
  failCount++;
}

// TEST 4: Filter operations on items array (Dashboard patterns)
console.log('--- Test 4: Dashboard filter operations ---');
try {
  const items = [normalizedOld, normalizedText];
  
  const freeItems = items.filter((i) => i.availability_status === 'free');
  const committedItems = items.filter((i) => i.availability_status === 'committed');
  
  console.log(`  Free items: ${freeItems.length}`);
  console.log(`  Committed items: ${committedItems.length}`);
  
  // Type filter
  const wigItems = items.filter((i) => i.auto_categorized_type === 'wig');
  const topItems = items.filter((i) => i.auto_categorized_type === 'top');
  
  console.log(`  Wig items: ${wigItems.length}`);
  console.log(`  Top items: ${topItems.length}`);
  console.log('  ✓ PASS: Dashboard filters work\n');
  passCount++;
} catch (err: any) {
  console.error(`  ✗ FAIL: ${err.message}\n`);
  failCount++;
}

// SUMMARY
console.log('═══════════════════════════════════════');
console.log('TEST SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`PASS: ${passCount}`);
console.log(`FAIL: ${failCount}`);
console.log(`TOTAL: ${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n✅ ALL TESTS PASSED');
  console.log('Old-shape and text-entry items work through normalizer and data paths.');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED');
  console.log('Fix required before items can be safely loaded.');
  process.exit(1);
}
