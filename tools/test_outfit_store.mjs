import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createEmptyOutfit, getAvailableSlots, getStorageKey, loadOutfit, saveOutfit,
  getSlotForItem, getColorFromName, applyItem, togglePiece, setPieceColor,
  wearFullCostume, removeAllPieces, reconcileInventory,
} from '../src/utils/outfitStore.ts';

const scope = (accountId = 'alice', projectId = 'project-1') => ({ type: 'project', accountId, projectId });
const item = (attire_id, auto_categorized_type, auto_categorized_color, original_input_text = attire_id) => ({ attire_id, auto_categorized_type, auto_categorized_color, original_input_text, auto_categorized_style: '' });
const inventory = [item('white shirt', 'top', 'white'), item('black pants', 'bottom', 'black'), item('black boots', 'footwear', 'black'), item('silver wig', 'wig', 'silver'), item('red wig', 'wig', 'red')];
const wear = (outfit, owned) => applyItem(outfit, owned.attire_id, owned.auto_categorized_type, owned.auto_categorized_color, owned.original_input_text).outfit;
const memory = () => {
  const values = new Map();
  return { values, async getItem(key) { return values.get(key) ?? null; }, async setItem(key, value) { values.set(key, value); }, async removeItem(key) { values.delete(key); } };
};

test('five data-defined slots; no accessory/belt is supported', () => {
  assert.deepEqual(new Set(getAvailableSlots()), new Set(['wig', 'top', 'bottom', 'gloves', 'shoes']));
  assert.equal(getSlotForItem(item('blindfold', 'accessory', 'black')), null);
  assert.equal(getSlotForItem(item('ear cuff', 'accessory', 'silver')), null);
  assert.equal(getSlotForItem(item('Black gloves', 'accessory', 'black')), 'gloves');
});
test('new outfit and wear-full with empty inventory remain bare', () => {
  const outfit = wearFullCostume(createEmptyOutfit(), []);
  assert.ok(Object.values(outfit.pieces).every(piece => !piece.on && !piece.itemId));
  assert.equal(togglePiece(outfit, 'top', true).pieces.top.on, false);
});
test('white shirt, black pants, boots and silver wig all wear together', () => {
  const outfit = inventory.slice(0, 4).reduce(wear, createEmptyOutfit());
  for (const slot of ['top', 'bottom', 'shoes', 'wig']) assert.equal(outfit.pieces[slot].on, true);
  assert.equal(outfit.pieces.top.color, '#FFFFFF');
  assert.equal(outfit.pieces.wig.color, '#C0C0C0');
});
test('red wig replaces silver wig in exactly one slot', () => {
  const before = inventory.slice(0, 4).reduce(wear, createEmptyOutfit());
  const after = wear(before, inventory[4]);
  assert.equal(after.pieces.wig.itemId, 'red wig');
  assert.equal(after.pieces.wig.color, '#EF4444');
  assert.deepEqual(after.pieces.top, before.pieces.top);
  assert.deepEqual(after.pieces.bottom, before.pieces.bottom);
});
test('tapping same item removes only its slot', () => {
  const before = inventory.slice(0, 4).reduce(wear, createEmptyOutfit());
  const after = wear(before, inventory[0]);
  assert.equal(after.pieces.top.on, false);
  assert.equal(after.pieces.top.itemId, undefined);
  assert.deepEqual(after.pieces.wig, before.pieces.wig);
});
test('wear-full preserves assigned items/colors; toggles and colors stay editable', () => {
  let outfit = wear(createEmptyOutfit(), inventory[4]);
  outfit = setPieceColor(outfit, 'wig', '#00FF00');
  outfit = wearFullCostume(outfit, inventory);
  assert.equal(outfit.pieces.wig.itemId, 'red wig');
  assert.equal(outfit.pieces.wig.color, '#00FF00');
  assert.equal(outfit.pieces.gloves.on, false);
  outfit = togglePiece(outfit, 'top', false);
  outfit = setPieceColor(outfit, 'shoes', '#123456');
  assert.equal(outfit.pieces.top.on, false);
  assert.equal(outfit.pieces.shoes.on, true);
  assert.equal(outfit.pieces.shoes.color, '#123456');
});
test('remove-all leaves no visible piece', () => {
  const outfit = removeAllPieces(wearFullCostume(createEmptyOutfit(), inventory));
  assert.ok(Object.values(outfit.pieces).every(piece => !piece.on));
});
test('names, silver, palette IDs and arbitrary hex colors normalize consistently', () => {
  assert.equal(getColorFromName('silver'), '#C0C0C0');
  assert.equal(getColorFromName('#fff'), '#FFFFFF');
  assert.equal(getColorFromName('red-dark'), '#991B1B');
  assert.equal(getColorFromName('#Aa12B4'), '#AA12B4');
  assert.equal(getColorFromName('not-a-color'), null);
});
test('account/project keys differ; body switch uses the same wardrobe key', () => {
  assert.notEqual(getStorageKey(scope()), getStorageKey(scope('bob')));
  assert.notEqual(getStorageKey(scope()), getStorageKey(scope('alice', 'project-2')));
  assert.equal(getStorageKey({ type: 'body', bodyType: 'male', accountId: 'alice' }), getStorageKey({ type: 'body', bodyType: 'female', accountId: 'alice' }));
  assert.throws(() => getStorageKey({ type: 'project', projectId: 'x' }), /Sign in/);
});
test('restart restores worn IDs, hidden flags, colors and styles only for the account/project', async () => {
  const storage = memory();
  const outfit = setPieceColor(wearFullCostume(createEmptyOutfit(), inventory), 'top', '#123456');
  await saveOutfit(storage, scope(), outfit);
  assert.deepEqual(await loadOutfit(storage, scope()), JSON.parse(JSON.stringify(outfit)));
  assert.equal((await loadOutfit(storage, scope('bob'))).pieces.top.on, false);
  assert.equal((await loadOutfit(storage, scope('alice', 'other'))).pieces.top.on, false);
});
test('old unscoped data is not silently adopted by a new account', async () => {
  const storage = memory();
  storage.values.set('@forgemind:outfit:project:project-1', JSON.stringify(wearFullCostume(createEmptyOutfit(), inventory)));
  assert.equal((await loadOutfit(storage, scope())).pieces.top.on, false);
});
test('deleted/transferred items are no longer shown', () => {
  const outfit = reconcileInventory(wearFullCostume(createEmptyOutfit(), inventory), []);
  assert.ok(Object.values(outfit.pieces).every(piece => !piece.on && !piece.itemId));
});
test('read/write failures propagate; corrupt data is not overwritten', async () => {
  const storage = memory();
  storage.values.set(getStorageKey(scope()), 'invalid json');
  await assert.rejects(loadOutfit(storage, scope()));
  assert.equal(storage.values.get(getStorageKey(scope())), 'invalid json');
  await assert.rejects(saveOutfit({ ...storage, async setItem() { throw new Error('Storage full'); } }, scope(), createEmptyOutfit()), /Storage full/);
});
