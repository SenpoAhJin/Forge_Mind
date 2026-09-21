// Test traces for FE-7 Step 2 verification

// Helper to calculate days between dates
const daysBetween = (from, to) => {
  const d1 = new Date(from);
  const d2 = new Date(to);
  const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  return diff;
};

// getUrgency implementation
const getUrgency = (entry, todayLocal) => {
  const missingFields = getMissingFields(entry);
  const isComplete = missingFields.length === 0;

  if (isComplete) {
    return {
      level: 'complete',
      daysUntilDeadline: daysBetween(todayLocal, entry.submission_deadline),
      reason: 'Complete'
    };
  }

  const days = daysBetween(todayLocal, entry.submission_deadline);

  if (days < 0) {
    return {
      level: 'critical',
      daysUntilDeadline: days,
      reason: 'Past deadline'
    };
  }

  if (days <= 1) {
    return {
      level: 'critical',
      daysUntilDeadline: days,
      reason: `${days} day${days === 1 ? '' : 's'} left`
    };
  }

  if (days <= 3) {
    return {
      level: 'urgent',
      daysUntilDeadline: days,
      reason: `${days} days left`
    };
  }

  if (days <= 7) {
    return {
      level: 'reminder',
      daysUntilDeadline: days,
      reason: `${days} days left`
    };
  }

  return {
    level: 'on_track',
    daysUntilDeadline: days,
    reason: `${days} days left`
  };
};

// getMissingFields implementation
const getMissingFields = (entry) => {
  const missing = [];

  if (!entry.arrival_date) missing.push('arrival_date');
  if (!entry.arrival_time) missing.push('arrival_time');

  if (entry.parking_needs !== 'none' && !entry.plate_number) {
    missing.push('plate_number');
  }

  if (entry.entourage_size === null || entry.entourage_size === undefined) {
    missing.push('entourage_size');
  }

  if (entry.participant_kind === 'performer' && !entry.stage_time_preference) {
    missing.push('stage_time_preference');
  }

  return missing;
};

// Today's date
const today = '2026-09-21';

console.log('=== getUrgency Traces at Various Days to Deadline ===\n');

[20, 8, 7, 4, 3, 2, 1, 0, -1].forEach(days => {
  const deadlineDate = new Date(today);
  deadlineDate.setDate(deadlineDate.getDate() + days);
  const deadline = deadlineDate.toISOString().split('T')[0];
  
  const entry = {
    submission_deadline: deadline,
    arrival_date: null, // incomplete
    arrival_time: null,
    parking_needs: 'standard',
    plate_number: null,
    entourage_size: null,
    participant_kind: 'sponsor',
    stage_time_preference: null
  };

  const result = getUrgency(entry, today);
  console.log(`Days to deadline: ${days} (${deadline})`);
  console.log(`  → level: ${result.level}, daysUntilDeadline: ${result.daysUntilDeadline}, reason: "${result.reason}"\n`);
});

console.log('\n=== getMissingFields Cases ===\n');

// Case 1: Entourage size = 0 (valid, answered)
console.log('Case 1: entourage_size = 0 (valid, answered)');
let entry = {
  arrival_date: '2026-10-15',
  arrival_time: '14:30',
  parking_needs: 'none',
  plate_number: null,
  entourage_size: 0, // Zero counts as answered
  participant_kind: 'sponsor',
  stage_time_preference: null
};
console.log(`  Missing fields: ${JSON.stringify(getMissingFields(entry))}\n`);

// Case 2: Plate N/A with parking='none'
console.log('Case 2: plate_number=null with parking_needs="none" (valid)');
entry = {
  arrival_date: '2026-10-15',
  arrival_time: '14:30',
  parking_needs: 'none',
  plate_number: null, // Not required when parking=none
  entourage_size: 1,
  participant_kind: 'sponsor',
  stage_time_preference: null
};
console.log(`  Missing fields: ${JSON.stringify(getMissingFields(entry))}\n`);

// Case 3: Arrival with only date (invalid)
console.log('Case 3: arrival_date present, arrival_time missing (invalid)');
entry = {
  arrival_date: '2026-10-15',
  arrival_time: null, // MISSING
  parking_needs: 'none',
  plate_number: null,
  entourage_size: 1,
  participant_kind: 'sponsor',
  stage_time_preference: null
};
console.log(`  Missing fields: ${JSON.stringify(getMissingFields(entry))}\n`);

// Case 4: Performer missing stage_time (invalid)
console.log('Case 4: Performer without stage_time_preference (invalid)');
entry = {
  arrival_date: '2026-10-15',
  arrival_time: '14:30',
  parking_needs: 'none',
  plate_number: null,
  entourage_size: 1,
  participant_kind: 'performer',
  stage_time_preference: null // MISSING for performers
};
console.log(`  Missing fields: ${JSON.stringify(getMissingFields(entry))}\n`);

// Case 5: Non-performer without stage_time (valid)
console.log('Case 5: Sponsor without stage_time_preference (valid)');
entry = {
  arrival_date: '2026-10-15',
  arrival_time: '14:30',
  parking_needs: 'none',
  plate_number: null,
  entourage_size: 1,
  participant_kind: 'sponsor',
  stage_time_preference: null // OK for non-performers
};
console.log(`  Missing fields: ${JSON.stringify(getMissingFields(entry))}\n`);

console.log('\n=== Seed Data Entries ===\n');

// Simulate seed data
const getRelativeDate = (daysOffset) => {
  const date = new Date(today);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

const seeds = [
  {
    id: 'log-001',
    name: 'TechCorp Inc.',
    submission_deadline: getRelativeDate(17),
    arrival_date: getRelativeDate(24),
    arrival_time: '09:00',
    parking_needs: 'accessible',
    plate_number: 'ABC123',
    entourage_size: 2,
    participant_kind: 'sponsor',
    stage_time_preference: null
  },
  {
    id: 'log-002',
    name: 'Maria Santos',
    submission_deadline: getRelativeDate(20),
    arrival_date: getRelativeDate(24),
    arrival_time: null, // MISSING
    parking_needs: 'standard',
    plate_number: 'XYZ789',
    entourage_size: 1,
    participant_kind: 'confirmed_guest',
    stage_time_preference: null
  },
  {
    id: 'log-003',
    name: 'John Reyes',
    submission_deadline: getRelativeDate(6),
    arrival_date: getRelativeDate(24),
    arrival_time: '10:30',
    parking_needs: 'standard',
    plate_number: null, // MISSING
    entourage_size: 0,
    participant_kind: 'confirmed_guest',
    stage_time_preference: null
  },
  {
    id: 'log-004',
    name: 'Cosplay Band',
    submission_deadline: getRelativeDate(2),
    arrival_date: getRelativeDate(24),
    arrival_time: '12:00',
    parking_needs: 'none',
    plate_number: null,
    entourage_size: null, // MISSING
    participant_kind: 'performer',
    stage_time_preference: 'Afternoon preferred'
  },
  {
    id: 'log-005',
    name: 'Local Store',
    submission_deadline: getRelativeDate(-1), // YESTERDAY
    arrival_date: null, // MISSING
    arrival_time: null, // MISSING
    parking_needs: 'standard',
    plate_number: 'DEF456',
    entourage_size: 1,
    participant_kind: 'sponsor',
    stage_time_preference: null
  }
];

seeds.forEach((seed, i) => {
  const urgency = getUrgency(seed, today);
  const missing = getMissingFields(seed);
  const daysToDeadline = daysBetween(today, seed.submission_deadline);
  
  console.log(`Entry ${i + 1}: ${seed.name}`);
  console.log(`  Deadline: ${seed.submission_deadline} (${daysToDeadline} days from today)`);
  console.log(`  Urgency: ${urgency.level} - "${urgency.reason}"`);
  console.log(`  Missing: ${missing.length === 0 ? 'none' : missing.join(', ')}\n`);
});
