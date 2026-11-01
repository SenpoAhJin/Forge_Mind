import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateTasks, countdown, manilaToday, componentLabel, SOURCE_LABELS, difficultyLabel } from '../src/utils/componentPlanning.ts';
import { priceRange, generateBudget, budgetSummary, expenseLine, ESTIMATE_LABEL } from '../src/utils/componentBudget.ts';
import { shoppingTerms } from '../src/utils/componentShopping.ts';
import { computeReadiness, READINESS_FORMULA } from '../src/utils/readiness.ts';
import { computeEventReadinessAggregate } from '../src/utils/readinessAggregate.ts';

const now = '2026-11-01T00:00:00.000Z';
const project = { project_id: 'p', user_id: 'a', stated_skill_level: 'beginner', target_completion_date: '2026-12-01', stated_budget: 500, created_at: now, updated_at: now };
const component = (type, plan = 'buy', material = '', id = type) => ({ id, value: { type, plan, material, name: type, colors: ['#FFFFFF'], style: type === 'top' ? 'long-sleeve' : '', notes: '' }, originalAI: null, source: 'user', userCorrections: [] });
const review = (...components) => ({ confirmed: true, components });
const score = (r, tasks = [], p = project, lines = []) => computeReadiness({ project: p, review: r, projectTasks: tasks, projectBudget: lines }).readiness_score;

test('existing sourcing values and Bottom label; confirmed review only', () => {
  assert.deepEqual(SOURCE_LABELS, { own: 'Own it', buy: 'Buy it', make: 'Make it' });
  assert.equal(componentLabel(component('bottom')), 'Bottom');
  assert.equal(componentLabel({ ...component('accessory'), value: { ...component('accessory').value, name: 'Belt' } }), 'Belt');
  assert.deepEqual(generateTasks(project, { ...review(component('top')), confirmed: false }, [], now), []);
  assert.deepEqual(shoppingTerms(null), []);
});
test('fixed price ranges, owned zero, known and unknown materials', () => {
  assert.equal(ESTIMATE_LABEL, 'Rule-based estimate, not live prices');
  assert.deepEqual(priceRange(component('gloves', 'buy', 'leather')), [200, 800]);
  assert.deepEqual(priceRange(component('gloves', 'make', ' FABRIC ')), [100, 400]);
  assert.deepEqual(priceRange(component('gloves', 'own', 'leather')), [0, 0]);
  assert.deepEqual(priceRange(component('top', 'buy', 'unknown')), [300, 900]);
  for (const slot of ['wig', 'top', 'bottom', 'gloves', 'shoes', 'accessory']) assert.equal(priceRange(component(slot)).length, 2);
});
test('generated tasks use existing Task fields, stable IDs, lead times, difficulty and due ordering', () => {
  const result = generateTasks(project, review(component('top', 'make'), component('wig'), component('shoes')), [], now);
  assert.equal(result.length, 5);
  assert.equal(result[0].task_description, 'Make/dye Top');
  assert.equal(result[0].due_date, '2026-11-03');
  assert.equal(difficultyLabel(result[0].difficulty_rating), 'Hard');
  assert.equal(result.find(t => t.task_description === 'Buy Wig').due_date, '2026-11-10');
  assert.equal(result.find(t => t.task_description === 'Style wig').due_date, '2026-11-24');
  assert.equal(result.find(t => t.task_description === 'Break in shoes').due_date, '2026-11-24');
  assert.ok(result.every(t => t.generated && t.project_id === 'p' && t.component_id && t.status === 'pending'));
  const advanced = generateTasks({ ...project, stated_skill_level: 'advanced' }, review(component('top', 'make')), [], now);
  assert.equal(difficultyLabel(advanced[0].difficulty_rating), 'Easy');
  assert.equal(difficultyLabel(generateTasks({ ...project, stated_skill_level: 'intermediate' }, review(component('top', 'make')), [], now)[0].difficulty_rating), 'Medium');
});
test('regeneration preserves manual tasks, other projects and user-controlled completion', () => {
  const manual = { task_id: 'manual', project_id: 'p', status: 'completed' };
  const other = { task_id: 'other', generated: true, project_id: 'other', status: 'pending' };
  const first = generateTasks(project, review(component('wig')), [manual, other], now);
  first.find(t => t.task_type === 'buy').status = 'completed';
  const second = generateTasks(project, review(component('wig')), first, now);
  assert.equal(second.find(t => t.task_type === 'buy').status, 'completed');
  assert.ok(second.includes(manual)); assert.ok(second.includes(other));
  assert.deepEqual(generateTasks(project, null, second, now), [manual, other]);
  assert.equal(generateTasks(project, review(component('top', 'own')), [], now).length, 0);
  assert.equal(generateTasks(project, review(component('wig', 'own'), component('shoes', 'own')), [], now).length, 2);
});
test('countdown uses Manila calendar date; past, today, leap dates, missing and invalid dates', () => {
  assert.equal(manilaToday(new Date('2026-10-31T17:00:00Z')), '2026-11-01');
  assert.equal(countdown('2026-11-02', '2026-11-01'), '1 days until target date.');
  assert.equal(countdown('2026-11-01', '2026-11-01'), 'Target date is today.');
  assert.match(countdown('2026-10-31', '2026-11-01'), /has passed/);
  assert.equal(countdown(null), 'No target date set.');
  assert.match(countdown('2028-03-01', '2028-02-28'), /2 days/);
  assert.throws(() => countdown('2026-02-30'), /valid/);
  assert.throws(() => countdown('not-a-date'), /valid/);
});
test('single readiness formula: average components, owned=1, task fraction, no tasks=0, rounded', () => {
  const r = review(component('top', 'own'), component('wig'), component('bottom'));
  const tasks = generateTasks(project, r, [], now);
  tasks.find(t => t.task_type === 'buy' && t.component_id === 'wig').status = 'completed';
  assert.equal(score(r, tasks), 0.5); // (1 + 1/2 + 0)/3
  assert.equal(score(r), 0.33);
  assert.equal(score(review(component('top', 'own'), component('wig', 'own'))), 1);
  assert.equal(score(review()), 0); assert.equal(score(null), 0);
  assert.equal(score({ ...r, confirmed: false }, tasks), 0);
  assert.equal(score(r, tasks, { ...project, stated_budget: 0 }, [{ project_id: 'p', actual_amount: 999999 }]), 0.5);
  assert.equal(score(review(component('top')), [{ project_id: 'other', component_id: 'top', status: 'completed' }]), 0);
  assert.match(READINESS_FORMULA, /Average every component/);
});
test('budget estimates include accessories and owned zero, preserve manual budget/expenses on regeneration', () => {
  const r = review(component('top', 'own'), component('bottom'), component('accessory'));
  const expense = expenseLine('p', ' Fabric ', '200.50', 'e', now);
  const other = { budget_line_item_id: 'other', project_id: 'other', generated: true, actual_amount: 9999 };
  const result = generateBudget(project, r, [expense, other], now);
  assert.equal(result.length, 5); assert.ok(result.includes(expense)); assert.ok(result.includes(other));
  assert.equal(result.find(line => line.component_id === 'top').planned_amount, 0);
  assert.equal(result.find(line => line.component_id === 'bottom').planned_amount, 800);
  assert.equal(result.find(line => line.component_id === 'bottom').estimate_min, 300);
  const summary = budgetSummary(project, r, result);
  assert.equal(summary.estimateTotal, 1300); assert.equal(summary.estimateMin, 400);
  assert.equal(summary.spent, 200.5); assert.equal(summary.overrun, 800);
  assert.equal(summary.culprit.id, 'bottom'); assert.equal(summary.cheaper, null);
  assert.equal(generateBudget(project, r, result, now).length, result.length);
});
test('budget edges: zero, unset, empty/all owned, spent greater than estimate, alternatives remaining', () => {
  const r = review(component('gloves', 'buy', 'leather'));
  const summary = budgetSummary({ ...project, stated_budget: 0 }, r, []);
  assert.equal(summary.spent, 0); assert.equal(summary.overrun, 800);
  assert.equal(summary.cheaper.saving, 300); assert.equal(summary.cheaper.remaining, 500);
  assert.match(summary.cheaper.description, /Remaining overrun ₱500/);
  assert.equal(budgetSummary({ ...project, stated_budget: 600 }, r, []).cheaper.remaining, 0);
  assert.equal(budgetSummary({ ...project, stated_budget: null }, r, []).overBudget, false);
  assert.equal(budgetSummary({ ...project, stated_budget: 800 }, r, []).overBudget, false);
  assert.equal(budgetSummary(project, review(), []).estimateTotal, 0);
  const allOwned = budgetSummary(project, review(component('top', 'own')), [expenseLine('p', 'Old cost', '800', 'e', now)]);
  assert.equal(allOwned.estimateTotal, 0); assert.equal(allOwned.overrun, 300); assert.equal(allOwned.culprit, null); assert.equal(allOwned.cheaper, null);
  assert.equal(budgetSummary(project, null, []).spent, 0);
});
test('expense validation rejects empty names, zero, negatives, NaN, infinity; uses existing actual_amount', () => {
  for (const amount of ['', ' ', '0', '-1', 'abc', 'Infinity']) assert.throws(() => expenseLine('p', 'Fabric', amount, 'e', now));
  assert.throws(() => expenseLine('p', ' ', '1', 'e', now));
  assert.equal(expenseLine('p', ' Test ', '1.25', 'e', now).actual_amount, 1.25);
  assert.equal(expenseLine('p', 'Test', '1', 'e', now).planned_amount, 0);
});
test('shopping phrases use closed vocabulary, exclude owned, unknown material is explicit, Bottom label', () => {
  const r = review(component('top', 'buy', 'fabric'), component('wig', 'own'), component('bottom', 'make', 'unobtainium'));
  const cards = shoppingTerms(r);
  assert.equal(cards.length, 2); assert.equal(cards[0].phrase, 'white long sleeve top cosplay');
  assert.equal(cards[0].spec, 'white · long sleeve · fabric');
  assert.equal(cards[1].label, 'Bottom'); assert.equal(cards[1].materialFallback, true);
  assert.match(cards[1].spec, /unspecified material/);
  const unknown = component('top'); unknown.value.style = 'untrusted'; unknown.value.colors = ['#123456'];
  assert.equal(shoppingTerms(review(unknown))[0].phrase, 'unspecified color top cosplay');
  assert.deepEqual(shoppingTerms(review(component('top', 'own'))), []);
});
test('event aggregate uses same component formula and preserves opt-in privacy threshold', () => {
  const projects = [1,2,3].map(id => ({ ...project, project_id: String(id), linked_event_id: 'event', opted_in_readiness_sharing: true }));
  const inputs = { eventId: 'event', projects, getTasksForProject: () => [], getBudgetForProject: () => [], getReviewForProject: () => review(component('top', 'own'), component('wig')) };
  assert.equal(computeEventReadinessAggregate(inputs).average_readiness, 0.5);
  assert.equal(computeEventReadinessAggregate({ ...inputs, projects: projects.slice(0, 2) }).average_readiness, null);
  assert.equal(computeEventReadinessAggregate({ ...inputs, getReviewForProject: () => null }).average_readiness, 0);
});
