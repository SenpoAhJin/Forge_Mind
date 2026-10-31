// Node 24's built-in TypeScript stripping runs this without Expo or a device.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PlanningBriefRepository, parsePlanningBudget, validatePlanningBrief } from '../src/utils/planningBriefs.ts';

const today = '2026-10-31';
const input = (overrides = {}) => ({
  character_name: 'Gojo — Season 2', reference_image: 'data:image/jpeg;base64,/9j/2Q==',
  skill_level: 'intermediate', budget: 5000, target_date: '2026-12-01', ...overrides,
});
const memoryStorage = () => {
  const values = new Map();
  return {
    values,
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
};

test('budget accepts zero and centavos and rejects partial or invalid numbers', () => {
  for (const value of ['', '-1', 'NaN', 'Infinity', '5000abc', '1e3', '1,000', '10.999', '10000000000']) {
    assert.equal(parsePlanningBudget(value), null, value);
  }
  assert.equal(parsePlanningBudget('0'), 0);
  assert.equal(parsePlanningBudget(' 1234.50 '), 1234.5);
});

test('brief requires all five inputs and a real date that has not passed', () => {
  for (const override of [
    { character_name: ' ' }, { reference_image: '' }, { reference_image: 'blob:expired' },
    { reference_image: 'data:image/jpeg;base64,xyz' },
    { reference_image: `data:image/jpeg;base64,${'A'.repeat(1400000)}` },
    { skill_level: 'expert' }, { budget: NaN }, { budget: -1 }, { budget: 10.999 },
    { target_date: '2026-02-29' }, { target_date: '2026-10-30' },
  ]) assert.throws(() => validatePlanningBrief(input(override), today));
  assert.doesNotThrow(() => validatePlanningBrief(input({ budget: 0, target_date: today }), today));
  assert.doesNotThrow(() => validatePlanningBrief(input({ target_date: '2028-02-29' }), today));
});

test('brief and reference survive reopening; records are isolated by account', async () => {
  const storage = memoryStorage();
  const first = new PlanningBriefRepository(storage);
  const saved = await first.save('alice@example.com', input(), today);
  const reopened = new PlanningBriefRepository(storage);
  assert.deepEqual(await reopened.list('alice@example.com'), [saved]);
  assert.equal((await reopened.list(' ALICE@example.com '))[0].brief_id, saved.brief_id);
  assert.deepEqual(await reopened.list('bob@example.com'), []);
  assert.throws(() => reopened.save('', input(), today), /Sign in/);
});

test('updating a brief preserves identity and creation date without duplicates', async () => {
  const repository = new PlanningBriefRepository(memoryStorage());
  const before = await repository.save('alice', input(), today);
  const after = await repository.save('alice', input({ budget: 4200 }), today, before.brief_id);
  assert.equal(after.brief_id, before.brief_id);
  assert.equal(after.created_at, before.created_at);
  assert.equal(after.budget, 4200);
  assert.equal((await repository.list('alice')).length, 1);
  await assert.rejects(repository.save('bob', input(), today, before.brief_id), /could not be found/);
});

test('concurrent saves do not overwrite each other', async () => {
  const repository = new PlanningBriefRepository(memoryStorage());
  await Promise.all(Array.from({ length: 6 }, (_, i) => repository.save('alice', input({ character_name: `Look ${i}` }), today)));
  assert.equal((await repository.list('alice')).length, 6);
});

test('corrupt or unknown saved data fails visibly and is not overwritten', async () => {
  for (const raw of ['{bad json', '{"version":2,"briefs":[]}', '{"version":1,"briefs":[{}]}']) {
    const storage = memoryStorage();
    const key = '@forgemind:planning-briefs:v1:alice';
    storage.values.set(key, raw);
    const repository = new PlanningBriefRepository(storage);
    await assert.rejects(repository.list('alice'));
    await assert.rejects(repository.save('alice', input(), today));
    assert.equal(storage.values.get(key), raw);
  }
});

test('failed storage writes report failure and allow a subsequent retry', async () => {
  const storage = memoryStorage();
  let fail = true;
  const repository = new PlanningBriefRepository({
    getItem: storage.getItem,
    async setItem(key, value) {
      if (fail) throw new Error('Storage full');
      await storage.setItem(key, value);
    },
  });
  await assert.rejects(repository.save('alice', input(), today), /Storage full/);
  assert.deepEqual(await repository.list('alice'), []);
  fail = false;
  await repository.save('alice', input(), today);
  assert.equal((await repository.list('alice')).length, 1);
});

test('expired briefs remain readable but need a new target date before saving', async () => {
  const repository = new PlanningBriefRepository(memoryStorage());
  const saved = await repository.save('alice', input({ target_date: today }), today);
  assert.equal((await repository.list('alice')).length, 1);
  await assert.rejects(repository.save('alice', saved, '2026-11-01', saved.brief_id), /today or later/);
});

test('references use separate bounded entries and a failed list commit preserves the old brief', async () => {
  const storage = memoryStorage();
  let failIndex = false;
  const repository = new PlanningBriefRepository({
    ...storage,
    async setItem(key, value) {
      if (failIndex && !key.includes(':image:')) throw new Error('List commit failed');
      await storage.setItem(key, value);
    },
  });
  const first = await repository.save('alice', input(), today);
  const index = storage.values.get('@forgemind:planning-briefs:v1:alice');
  assert.equal(index.includes('data:image'), false);
  failIndex = true;
  await assert.rejects(repository.save('alice', input({ reference_image: 'data:image/png;base64,AAAA', budget: 2000 }), today, first.brief_id), /List commit failed/);
  assert.deepEqual(await repository.list('alice'), [first]);
  assert.equal(storage.values.size, 2); // Failed replacement image was removed.
  failIndex = false;
  const updated = await repository.save('alice', input({ reference_image: 'data:image/png;base64,AAAA' }), today, first.brief_id);
  assert.equal((await repository.list('alice'))[0].reference_image, updated.reference_image);
  assert.equal(storage.values.size, 2); // Superseded image was removed.
});
