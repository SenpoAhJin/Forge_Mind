#!/usr/bin/env node
/**
 * COSTUME-4D-1: Test outfit store pure functions
 * 
 * Tests:
 * - Scope isolation
 * - Save/restore round trip with in-memory adapter
 * - Item tap on/off/replace
 * - Unknown category -> no crash
 * - Unknown color -> slot default
 * - Wear full costume does not lock
 * - Wrong version -> empty outfit
 */

import {
  getScopeKey,
  getStorageKey,
  getAvailableSlots,
  getSlotDefaultColor,
  createEmptyOutfit,
  loadOutfit,
  saveOutfit,
  togglePiece,
  setPieceColor,
  getSlotForCategory,
  getColorFromName,
  applyItem,
  wearFullCostume,
  removeAllPieces
} from '../src/utils/outfitStore.ts';

// In-memory storage adapter for testing
class MemoryStorage {
  constructor() {
    this.data = new Map();
  }
  
  async getItem(key) {
    return this.data.get(key) || null;
  }
  
  async setItem(key, value) {
    this.data.set(key, value);
  }
  
  async removeItem(key) {
    this.data.delete(key);
  }
  
  clear() {
    this.data.clear();
  }
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    testsFailed++;
    return false;
  }
  testsPassed++;
  return true;
}

async function runTests() {
  console.log('Testing outfit store...\n');
  
  const storage = new MemoryStorage();
  
  // Test: Scope keys
  console.log('=== Scope Keys ===');
  const bodyScope = { type: 'body', bodyType: 'male' };
  const projectScope = { type: 'project', projectId: 'proj-123' };
  
  assert(getScopeKey(bodyScope) === 'body:male', 'Body scope key');
  assert(getScopeKey(projectScope) === 'project:proj-123', 'Project scope key');
  assert(getStorageKey(bodyScope) === '@forgemind:outfit:body:male', 'Storage key for body');
  assert(getStorageKey(projectScope) === '@forgemind:outfit:project:proj-123', 'Storage key for project');
  
  // Test: Available slots
  console.log('\n=== Available Slots ===');
  const slots = getAvailableSlots();
  assert(slots.length === 6, `Should have 6 slots (got ${slots.length})`);
  assert(slots.includes('top'), 'Has top slot');
  assert(slots.includes('bottom'), 'Has bottom slot');
  assert(slots.includes('shoes'), 'Has shoes slot');
  assert(slots.includes('gloves'), 'Has gloves slot');
  assert(slots.includes('wig'), 'Has wig slot');
  assert(slots.includes('belt'), 'Has belt slot');
  
  // Test: Default colors
  console.log('\n=== Default Colors ===');
  const topColor = getSlotDefaultColor('top');
  assert(topColor === '#3B82F6', `Top default color (got ${topColor})`);
  
  // Test: Empty outfit
  console.log('\n=== Empty Outfit ===');
  const empty = createEmptyOutfit();
  assert(empty.version === 1, 'Version is 1');
  assert(Object.keys(empty.pieces).length === 6, `Has 6 pieces (got ${Object.keys(empty.pieces).length})`);
  assert(empty.pieces.top.on === false, 'Top is off');
  assert(empty.pieces.top.source === 'user', 'Source is user');
  
  // Test: Save and load round trip
  console.log('\n=== Save/Load Round Trip ===');
  const outfit1 = createEmptyOutfit();
  outfit1.pieces.top.on = true;
  outfit1.pieces.top.color = '#FF0000';
  
  await saveOutfit(storage, bodyScope, outfit1);
  const loaded = await loadOutfit(storage, bodyScope);
  
  assert(loaded.version === 1, 'Loaded version is 1');
  assert(loaded.pieces.top.on === true, 'Loaded top is on');
  assert(loaded.pieces.top.color === '#FF0000', 'Loaded top color');
  
  // Test: Scope isolation
  console.log('\n=== Scope Isolation ===');
  const outfit2 = createEmptyOutfit();
  outfit2.pieces.bottom.on = true;
  
  await saveOutfit(storage, projectScope, outfit2);
  const loadedBody = await loadOutfit(storage, bodyScope);
  const loadedProject = await loadOutfit(storage, projectScope);
  
  assert(loadedBody.pieces.top.on === true, 'Body scope still has top on');
  assert(loadedBody.pieces.bottom.on === false, 'Body scope bottom is off');
  assert(loadedProject.pieces.top.on === false, 'Project scope top is off');
  assert(loadedProject.pieces.bottom.on === true, 'Project scope has bottom on');
  
  // Test: Toggle piece
  console.log('\n=== Toggle Piece ===');
  const outfit3 = createEmptyOutfit();
  const toggled = togglePiece(outfit3, 'shoes', true);
  assert(toggled.pieces.shoes.on === true, 'Shoes toggled on');
  assert(toggled.pieces.shoes.source === 'user', 'Source is user');
  assert(outfit3.pieces.shoes.on === false, 'Original unchanged');
  
  // Test: Set color
  console.log('\n=== Set Color ===');
  const colored = setPieceColor(toggled, 'shoes', '#00FF00');
  assert(colored.pieces.shoes.color === '#00FF00', 'Color changed');
  assert(colored.pieces.shoes.source === 'user', 'Source is user');
  
  // Test: Category to slot mapping
  console.log('\n=== Category Mapping ===');
  assert(getSlotForCategory('top') === 'top', 'Top category');
  assert(getSlotForCategory('bottom') === 'bottom', 'Bottom category');
  assert(getSlotForCategory('footwear') === 'shoes', 'Footwear -> shoes');
  assert(getSlotForCategory('wig') === 'wig', 'Wig category');
  assert(getSlotForCategory('accessory') === 'belt', 'Accessory -> belt');
  assert(getSlotForCategory('fabric') === null, 'Fabric has no slot');
  assert(getSlotForCategory('unknown') === null, 'Unknown has no slot');
  
  // Test: Color name mapping
  console.log('\n=== Color Name Mapping ===');
  assert(getColorFromName('red') === '#EF4444', 'Red color');
  assert(getColorFromName('blue') === '#3B82F6', 'Blue color');
  assert(getColorFromName('unclear') === null, 'Unclear returns null');
  assert(getColorFromName('unknown') === null, 'Unknown returns null');
  assert(getColorFromName(undefined) === null, 'Undefined returns null');
  
  // Test: Apply item - wear
  console.log('\n=== Apply Item - Wear ===');
  const outfit4 = createEmptyOutfit();
  const result1 = applyItem(outfit4, 'item-1', 'top', 'red', 'Red Shirt');
  
  assert(result1.action === 'worn', 'Action is worn');
  assert(result1.message.includes('Wearing'), 'Message includes Wearing');
  assert(result1.outfit.pieces.top.on === true, 'Top is on');
  assert(result1.outfit.pieces.top.itemId === 'item-1', 'Item ID set');
  assert(result1.outfit.pieces.top.color === '#EF4444', 'Red color applied');
  assert(result1.outfit.pieces.top.source === 'item', 'Source is item');
  
  // Test: Apply item - remove (tap same item)
  console.log('\n=== Apply Item - Remove ===');
  const result2 = applyItem(result1.outfit, 'item-1', 'top', 'red', 'Red Shirt');
  
  assert(result2.action === 'removed', 'Action is removed');
  assert(result2.message.includes('Removed'), 'Message includes Removed');
  assert(result2.outfit.pieces.top.on === false, 'Top is off');
  assert(result2.outfit.pieces.top.itemId === undefined, 'Item ID cleared');
  
  // Test: Apply item - replace
  console.log('\n=== Apply Item - Replace ===');
  const outfit5 = createEmptyOutfit();
  const wear1 = applyItem(outfit5, 'item-1', 'bottom', 'blue', 'Blue Pants');
  const wear2 = applyItem(wear1.outfit, 'item-2', 'bottom', 'black', 'Black Pants');
  
  assert(wear2.action === 'replaced', 'Action is replaced');
  assert(wear2.message.includes('Replaced'), 'Message includes Replaced');
  assert(wear2.outfit.pieces.bottom.on === true, 'Bottom still on');
  assert(wear2.outfit.pieces.bottom.itemId === 'item-2', 'New item ID');
  assert(wear2.outfit.pieces.bottom.color === '#000000', 'Black color applied');
  
  // Test: Apply item - no slot (unknown category)
  console.log('\n=== Apply Item - Unknown Category ===');
  const outfit6 = createEmptyOutfit();
  const result3 = applyItem(outfit6, 'item-3', 'fabric', 'red', 'Red Fabric');
  
  assert(result3.action === 'no-slot', 'Action is no-slot');
  assert(result3.message.includes('No 3D piece'), 'Message about no slot');
  assert(result3.outfit.pieces.top.on === false, 'No changes to outfit');
  
  // Test: Apply item - unknown color defaults to slot default
  console.log('\n=== Apply Item - Unknown Color ===');
  const outfit7 = createEmptyOutfit();
  const result4 = applyItem(outfit7, 'item-4', 'top', 'unknown-color', 'Mystery Shirt');
  
  assert(result4.outfit.pieces.top.color === '#3B82F6', 'Falls back to slot default');
  
  // Test: Apply item - unclear color defaults to slot default
  const result5 = applyItem(outfit7, 'item-5', 'bottom', 'unclear', 'Unclear Pants');
  assert(result5.outfit.pieces.bottom.color === '#1E293B', 'Unclear falls back to slot default');
  
  // Test: Wear full costume
  console.log('\n=== Wear Full Costume ===');
  const outfit8 = createEmptyOutfit();
  const full = wearFullCostume(outfit8);
  
  assert(full.pieces.top.on === true, 'Top on');
  assert(full.pieces.bottom.on === true, 'Bottom on');
  assert(full.pieces.shoes.on === true, 'Shoes on');
  assert(full.pieces.gloves.on === true, 'Gloves on');
  assert(full.pieces.wig.on === true, 'Wig on');
  assert(full.pieces.belt.on === true, 'Belt on');
  assert(full.pieces.top.source === 'user', 'Source is user');
  
  // Test: Wear full costume doesn't lock
  console.log('\n=== Wear Full Costume - Not Locked ===');
  const toggled2 = togglePiece(full, 'top', false);
  assert(toggled2.pieces.top.on === false, 'Can toggle off after wear full');
  
  const colored2 = setPieceColor(full, 'bottom', '#FFFFFF');
  assert(colored2.pieces.bottom.color === '#FFFFFF', 'Can change color after wear full');
  
  // Test: Remove all
  console.log('\n=== Remove All ===');
  const removed = removeAllPieces(full);
  
  assert(removed.pieces.top.on === false, 'Top off');
  assert(removed.pieces.bottom.on === false, 'Bottom off');
  assert(removed.pieces.shoes.on === false, 'Shoes off');
  
  // Test: Wrong version -> empty outfit
  console.log('\n=== Wrong Version ===');
  storage.clear();
  await storage.setItem('@forgemind:outfit:body:female', JSON.stringify({
    version: 999,
    pieces: { invalid: 'data' }
  }));
  
  const loadedWrongVersion = await loadOutfit(storage, { type: 'body', bodyType: 'female' });
  assert(loadedWrongVersion.version === 1, 'Returns version 1 outfit');
  assert(loadedWrongVersion.pieces.top.on === false, 'Returns empty outfit');
  
  // Test: Invalid JSON -> empty outfit
  console.log('\n=== Invalid JSON ===');
  await storage.setItem('@forgemind:outfit:body:female', 'invalid json');
  const loadedInvalid = await loadOutfit(storage, { type: 'body', bodyType: 'female' });
  assert(loadedInvalid.version === 1, 'Returns version 1 on parse error');
  
  // Summary
  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  
  if (testsFailed > 0) {
    console.error('\nTESTS FAILED');
    process.exit(1);
  } else {
    console.log('\nALL TESTS PASSED');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
