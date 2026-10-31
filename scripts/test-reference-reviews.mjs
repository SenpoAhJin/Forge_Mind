import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ReferenceReviewRepository, correctComponent, newComponent, newReview, reviewTargets, targetColorsBySlot } from '../src/utils/referenceReviews.ts';
const memory = () => ({ values: new Map(), async getItem(k) { return this.values.get(k) ?? null; }, async setItem(k,v) { this.values.set(k,v); } });
test('confirmed components survive restart and remain isolated by account and brief', async () => {
  const storage = memory(), repo = new ReferenceReviewRepository(storage);
  const review = newReview('brief-one', 'image', null);
  review.components.push(newComponent('wig')); review.confirmed = true;
  await repo.save('A@EXAMPLE.TEST', review);
  assert.deepEqual(await new ReferenceReviewRepository(storage).load('a@example.test', 'brief-one'), review);
  assert.equal(await repo.load('b@example.test', 'brief-one'), null);
  assert.equal(await repo.load('a@example.test', 'brief-two'), null);
});
test('edits retain immutable AI values and every prior user value', () => {
  const ai = { type: 'wig', zone: [0,0,1,1], colors: [{ hex: '#FFFFFF', share: 1, palette_id: 'white' }], style: 'spiky', candidates: [], band: 'low', warnings: [] };
  const original = newComponent('wig', ai);
  const edited = correctComponent(original, { ...original.value, colors: ['#000000'], style: 'curly', plan: 'make' });
  assert.deepEqual(edited.originalAI, ai); assert.equal(edited.source, 'user');
  assert.deepEqual(edited.userCorrections[0].previous, original.value);
  assert.deepEqual(original.value.colors, ['#FFFFFF']);
  assert.deepEqual(correctComponent(edited, { ...edited.value, plan: 'own' }).userCorrections.length, 2);
});
test('failed writes preserve previous data; corrupt data cannot be silently replaced', async () => {
  const storage = memory(), repo = new ReferenceReviewRepository(storage), review = newReview('brief', 'image', null);
  await repo.save('a', review);
  storage.setItem = async () => { throw new Error('Disk full'); };
  await assert.rejects(repo.save('a', { ...review, confirmed: true }), /Disk full/);
  assert.equal((await repo.load('a', 'brief')).confirmed, false);
  storage.values.set([...storage.values.keys()][0], '{broken');
  await assert.rejects(repo.load('a', 'brief'));
  await assert.rejects(repo.save('a', review));
});
test('only confirmed values become targets; plans never assign owned item IDs', () => {
  const review = newReview('brief', 'image', null);
  const wig = newComponent('wig'); wig.value.colors = ['#000000', '#FFFFFF']; wig.value.plan = 'own';
  review.components = [wig];
  assert.equal(reviewTargets(review).slots.wig.present, false);
  review.confirmed = true;
  assert.deepEqual(targetColorsBySlot(review).wig, ['#000000', '#FFFFFF']);
  assert.equal(reviewTargets(review).slots.wig.color, '#000000');
  assert.equal(JSON.stringify(reviewTargets(review)).includes('itemId'), false);
});
test('deletion retains original component in audit history and removes its targets', async () => {
  const review = newReview('brief', 'image', null), removed = newComponent('top');
  review.deletedComponents.push(removed); review.confirmed = true;
  assert.equal(reviewTargets(review).slots.top.present, false);
  const repo = new ReferenceReviewRepository(memory()); await repo.save('a', review);
  assert.deepEqual((await repo.load('a', 'brief')).deletedComponents, [removed]);
});
