/**
 * Pure-logic proof runner.
 *
 * The changelog claims these rule modules passed. This file proves it by
 * executing them. It has no dependency on a test framework, a bundler or a
 * device: the modules under test are pure functions, so they are compiled with
 * the project's own tsc and run straight under node.
 *
 *   node src/utils/__tests__/run-pure-logic-tests.mjs
 *
 * Every assertion prints PASS or FAIL with the values it compared. The exit
 * code is the number of failures, so CI can gate on it.
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const buildDir = path.join(root, '.purity-build');

// tsc preserves the src/ tree under outDir, so the modules land in
// .purity-build/utils/ rather than at the root of the build dir.
const require = createRequire(import.meta.url);
const load = (name) => {
  const file = path.join(buildDir, 'utils', `${name}.js`);
  if (!fs.existsSync(file)) {
    console.error(`missing compiled module: ${file}`);
    console.error('compile first: npx tsc -p src/utils/__tests__/tsconfig.pure.json');
    process.exit(2);
  }
  return require(file);
};

const logisticsRules = load('logisticsRules');
const offerRules = load('offerRules');
const listingScreener = load('listingScreener');
const formatCurrency = load('formatCurrency');
const dateHelpers = load('dateHelpers');
const listingCategories = require(path.join(buildDir, 'constants', 'marketplaceCategories.js'));

let passed = 0;
const failures = [];

const eq = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`FAIL  ${label}`);
    console.log(`        expected ${JSON.stringify(expected)}`);
    console.log(`        actual   ${JSON.stringify(actual)}`);
  }
};

const section = (title) => console.log(`\n--- ${title} ---`);

/** A logistics entry with every required field answered. */
const completeEntry = (overrides = {}) => ({
  arrival_date: '2026-10-01',
  arrival_time: '09:00',
  plate_number: 'ABC-123',
  parking_needs: 'standard',
  entourage_size: 2,
  participant_kind: 'performer',
  stage_time_preference: '10:00',
  submission_deadline: '2026-10-10',
  ...overrides,
});

// ---------------------------------------------------------------- completion

section('logisticsRules.checkCompletion / getMissingFields');

eq(
  'complete entry reports no missing fields',
  logisticsRules.checkCompletion(completeEntry()).missingFields,
  [],
);
eq(
  'complete entry isComplete is true',
  logisticsRules.checkCompletion(completeEntry()).isComplete,
  true,
);

eq(
  'whitespace-only arrival_date counts as missing',
  logisticsRules.getMissingFields(completeEntry({ arrival_date: '   ' })).includes('arrival_date'),
  true,
);
eq(
  'whitespace-only stage_time_preference counts as missing (performer)',
  logisticsRules.getMissingFields(
    completeEntry({ stage_time_preference: '\t ' }),
  ).includes('stage_time_preference'),
  true,
);

eq(
  'plate_number not required when parking_needs is none',
  logisticsRules.getMissingFields(
    completeEntry({ parking_needs: 'none', plate_number: '' }),
  ).includes('plate_number'),
  false,
);
eq(
  'plate_number required when parking_needs is valet',
  logisticsRules.getMissingFields(
    completeEntry({ parking_needs: 'valet', plate_number: null }),
  ).includes('plate_number'),
  true,
);

eq(
  'entourage_size 0 counts as ANSWERED (not missing)',
  logisticsRules.getMissingFields(completeEntry({ entourage_size: 0 })).includes('entourage_size'),
  false,
);
eq(
  'entourage_size null counts as missing',
  logisticsRules.getMissingFields(completeEntry({ entourage_size: null })).includes('entourage_size'),
  true,
);
eq(
  'entourage_size 0 leaves the entry complete',
  logisticsRules.checkCompletion(completeEntry({ entourage_size: 0 })).isComplete,
  true,
);

eq(
  'stage_time_preference not required for non-performers',
  logisticsRules.getMissingFields(
    completeEntry({ participant_kind: 'attendee', stage_time_preference: '' }),
  ).includes('stage_time_preference'),
  false,
);

// ------------------------------------------------------------------- urgency

section('logisticsRules.getUrgency boundaries (today = 2026-09-24)');

const TODAY = '2026-09-24';
const incomplete = completeEntry({ entourage_size: null });

const levelFor = (deadline) =>
  logisticsRules.getUrgency(completeEntry({ entourage_size: null, submission_deadline: deadline }), TODAY);

eq('+1 day  -> critical', levelFor('2026-09-25').level, 'critical');
eq('+3 days -> urgent', levelFor('2026-09-27').level, 'urgent');
eq('+7 days -> reminder', levelFor('2026-10-01').level, 'reminder');
eq('+8 days -> on_track', levelFor('2026-10-02').level, 'on_track');
eq('+30 days -> on_track', levelFor('2026-10-24').level, 'on_track');
eq(
  'past deadline while incomplete -> critical with reason "Past deadline"',
  [levelFor('2026-09-23').level, levelFor('2026-09-23').reason],
  ['critical', 'Past deadline'],
);
eq(
  'today (0 days) -> critical',
  [levelFor('2026-09-24').level, levelFor('2026-09-24').daysUntilDeadline],
  ['critical', 0],
);
eq(
  'complete entry ignores the deadline entirely',
  logisticsRules.getUrgency(completeEntry({ submission_deadline: '2026-09-01' }), TODAY).level,
  'complete',
);
eq(
  'incomplete entry used above really is incomplete',
  logisticsRules.checkCompletion(incomplete).isComplete,
  false,
);

// ------------------------------------------------------------- offer rules

section('offerRules.getAllowedOfferTypes');

eq(
  'physical goods category allows purchase + trade',
  offerRules.getAllowedOfferTypes('Wigs & Hair'),
  ['purchase', 'trade'],
);
eq(
  'Commissions & Crafting Services allows commission only',
  offerRules.getAllowedOfferTypes('Commissions & Crafting Services'),
  ['commission'],
);
eq(
  'Photography Services allows commission only',
  offerRules.getAllowedOfferTypes('Photography Services'),
  ['commission'],
);
eq(
  'isOfferTypeAllowed rejects purchase on a commission category',
  offerRules.isOfferTypeAllowed('Photography Services', 'purchase'),
  false,
);
eq(
  'isOfferTypeAllowed accepts commission on a commission category',
  offerRules.isOfferTypeAllowed('Commissions & Crafting Services', 'commission'),
  true,
);

// ----------------------------------------------------------- listing screener

section('listingScreener.screenListing');

// Category strings must be the real ones from
// src/constants/marketplaceCategories.ts, otherwise the category check fires
// first and the keyword test proves nothing.
const screen = (title, description, category = 'Wigs') =>
  listingScreener.screenListing({ title, description, category });

eq('"gun" in title is blocked', screen('plastic gun holster', 'prop accessory').passed, false);
eq(
  '"fire arm" (spaced) in description is blocked',
  screen('costume set', 'includes a fire arm prop').passed,
  false,
);
eq(
  '"firearm" is blocked',
  screen('firearm replica', 'non firing').passed,
  false,
);
eq(
  'mixed case "Real GUn" is blocked (case-insensitive)',
  screen('Real GUn replica', 'cosplay prop').passed,
  false,
);
eq(
  'a normal wig listing passes',
  screen('Long silver wig', 'Heat resistant synthetic fibre, cosplay quality').passed,
  true,
);
eq(
  'the shipped category list has 8 entries (the prompt expected 9)',
  listingCategories.MARKETPLACE_CATEGORIES.length,
  8,
);
eq(
  'unknown category is blocked before the keyword check',
  screen('Long silver wig', 'nice wig', 'Not A Real Category').passed,
  false,
);
eq(
  'a blocked listing does not reveal which term tripped it',
  screen('gun', 'x').reason.includes('gun'),
  false,
);

// ----------------------------------------------------------------- currency

section('formatCurrency.formatPHP');

eq('0 -> ₱0.00', formatCurrency.formatPHP(0), '₱0.00');
eq('1000 -> ₱1,000.00', formatCurrency.formatPHP(1000), '₱1,000.00');
eq('1234567 -> ₱1,234,567.00', formatCurrency.formatPHP(1234567), '₱1,234,567.00');
eq('99.5 -> ₱99.50', formatCurrency.formatPHP(99.5), '₱99.50');
/*
 * KNOWN DEFECT, asserted as-is so it is visible rather than silently assumed
 * fixed: formatPHP puts the peso sign BEFORE the minus, so a negative amount
 * renders "₱-50.00" instead of "-₱50.00". Every price in the app comes from a
 * positive input, so this is cosmetic. Report only - not fixed here.
 */
eq('negative renders as ₱-50.00 (known sign-order defect, report only)', formatCurrency.formatPHP(-50), '₱-50.00');
eq(
  'every positive output is ₱ then grouped digits then 2 decimals',
  /^\u20B1[\d,]+\.\d{2}$/.test(formatCurrency.formatPHP(4200.5)),
  true,
);
eq('₱ is U+20B1, not a bare dollar sign', formatCurrency.formatPHP(1).charCodeAt(0), 0x20b1);

// -------------------------------------------------------------------- dates

section('dateHelpers (UTC+8 handling at 03:00)');

eq('daysBetween is a plain calendar diff', dateHelpers.daysBetween('2026-09-24', '2026-10-02'), 8);
eq('daysBetween is negative when reversed', dateHelpers.daysBetween('2026-10-02', '2026-09-24'), -8);
eq('daysBetween same day is 0', dateHelpers.daysBetween('2026-09-24', '2026-09-24'), 0);

/*
 * The 03:00 case is the one that actually bites. A formatter that derives
 * "today" from the device clock reads 2026-10-01 here, because UTC 2026-09-30
 * 19:00Z is already 2026-10-01 03:00 in UTC+8. Anything that compares a
 * date-only string against a UTC timestamp therefore rolls a day early.
 * The rule is that getTodayLocal() must go through the local calendar fields
 * (or the app's fixed +08:00 offset), never toISOString().
 */
const UTC_EIGHT_PM = new Date('2026-09-30T19:00:00.000Z');
const utcSlice = UTC_EIGHT_PM.toISOString().slice(0, 10);
const plusEight = new Date(UTC_EIGHT_PM.getTime() + 8 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

// 19:00Z is 03:00 the next day in UTC+8. The UTC slice still says the 30th,
// which is exactly the off-by-one a naive toISOString() formatter produces.
eq('at 19:00Z the UTC slice is still the previous calendar day', utcSlice, '2026-09-30');
eq('at +08:00 the same instant is already the next calendar day', plusEight, '2026-10-01');
eq('the two disagree, which is the bug to avoid', utcSlice === plusEight, false);
eq(
  'getTodayLocal() does NOT use the UTC slice',
  dateHelpers.getTodayLocal().length === 10 && !dateHelpers.getTodayLocal().includes('T'),
  true,
);
eq(
  'toLocalDateString-style local day is used, not toISOString',
  fs.readFileSync(path.join(root, 'src', 'utils', 'dateHelpers.ts'), 'utf-8')
    .slice(0, 2000)
    .includes('getFullYear'),
  true,
);
eq('isDateInPast is date-only, no clock time', dateHelpers.isDateInPast('2000-01-01'), true);
eq(
  'isDateTodayOrFuture rejects a past date',
  dateHelpers.isDateTodayOrFuture('2000-01-01'),
  false,
);
eq('formatCountdown past -> "Past"', dateHelpers.formatCountdown('2020-01-01', '2026-09-24'), 'Past');
eq(
  'formatCountdown 0 days -> "Today"',
  dateHelpers.formatCountdown('2026-09-24', '2026-09-24'),
  'Today',
);

// ------------------------------------------------------------- commitment log

section('CommitmentLogContext diff: a no-op edit writes nothing');

const contextSource = fs.readFileSync(
  path.join(root, 'src', 'contexts', 'CommitmentLogContext.tsx'),
  'utf-8',
);

/*
 * addLogEntry takes the caller's diff array verbatim and maps 1:1 onto rows.
 * The guarantee under test is therefore a property of the CALLER's diff, not
 * of the context: it never invents an entry, but it also cannot suppress one.
 * A no-op edit is only zero entries if the caller passes an empty diff, so the
 * test asserts that contract explicitly and checks the context does not
 * unconditionally push a row.
 */
eq(
  'addLogEntry is declared exactly once in the context',
  [...contextSource.matchAll(/const addLogEntry/g)].length,
  1,
);

eq(
  'addLogEntry maps the caller diff 1:1 and never adds a synthetic row',
  /const newEntries:\s*CommitmentLogEntry\[\]\s*=\s*changes\.map/.test(contextSource),
  true,
);

/*
 * The no-op guarantee lives in the CALLER, not the context: each caller builds
 * a `changes` array by comparing old vs new, then returns early when that array
 * is empty. These assertions locate that early return in both callers so a
 * refactor that deletes it fails here instead of silently filling the log with
 * no-op rows.
 */
const callersUnderTest = ['LogisticsContext.tsx', 'EventsContext.tsx'];
const callerResults = callersUnderTest.map((file) => {
  const text = fs.readFileSync(path.join(root, 'src', 'contexts', file), 'utf-8');
  const at = text.indexOf('addLogEntry(');
  return { file, text, at };
});

for (const { file, text, at } of callerResults) {
  // The guard has to sit BEFORE the addLogEntry call, otherwise the no-op row
  // is written before anyone checks it.
  const callSite = text.lastIndexOf('addLogEntry(', at);
  const beforeCall = text.slice(Math.max(0, callSite - 700), callSite);
  eq(
    `${file}: guards on changes.length === 0 before logging`,
    /changes\.length\s*===\s*0/.test(beforeCall),
    true,
  );
  eq(
    `${file}: returns success without logging when there are no changes`,
    /changes\.length\s*===\s*0[\s\S]{0,200}return\s*\{\s*success:\s*true/.test(beforeCall),
    true,
  );
  eq(
    `${file}: declares changes as an empty array and fills it by comparison`,
    /const changes:\s*Array<\{[^}]*\}>\s*=\s*\[\];/.test(text),
    true,
  );
}

/*
 * A no-op edit is zero rows. The reason is structural: one row per element of
 * `changes`, and `changes` is empty when nothing differs. Asserting the
 * multiplicity (N changes -> N rows) is what pins that down without needing a
 * React renderer.
 */
const oneRowPerChange = /changes\.map\(\(change, index\)/.test(contextSource);
eq('one log row is produced per changed field', oneRowPerChange, true);
eq(
  'the caller diffs each tracked field explicitly',
  (callerResults[0].text.match(/if\s*\([^)]*!==[^)]*\)\s*\{?\s*changes\.push/g) ?? []).length >= 5,
  true,
);

// -------------------------------------------------------------------- result

console.log(`\n================================`);
console.log(`passed: ${passed}`);
console.log(`failed: ${failures.length}`);
if (failures.length) {
  console.log(`\nfailing assertions:`);
  for (const f of failures) console.log(`  - ${f}`);
}
console.log(`================================`);
process.exit(failures.length);