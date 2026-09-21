/**
 * FE-7 Step 2: Logistics Rules & Completion Logic
 * 
 * Completion rules:
 * - plate_number: n/a when parking_needs === 'none', otherwise required
 * - arrival: needs both date AND time to count as complete
 * - entourage_size: 0 counts as answered
 * 
 * Urgency rules (days until event start_date):
 * - REMINDER: 7+ days (grey)
 * - URGENT: 3-6 days (amber)
 * - CRITICAL: 0-2 days (red)
 */

import { LogisticsEntry, ParkingNeeds } from '../types/logistics';
import { Event } from '../types/events';
import { daysBetween, compareDateStrings } from './dateHelpers';

// Rule constants
export const REMINDER_DAYS = 7;
export const URGENT_DAYS = 3;
export const CRITICAL_DAYS = 1;

export type UrgencyLevel = 'none' | 'reminder' | 'urgent' | 'critical';

export interface CompletionStatus {
  isComplete: boolean;
  missingFields: string[];
}

export interface UrgencyStatus {
  level: UrgencyLevel;
  daysUntilEvent: number;
  reason: string;
}

/**
 * Check if a logistics entry is complete according to rules
 */
export const checkCompletion = (entry: LogisticsEntry): CompletionStatus => {
  const missing: string[] = [];

  // Rule 1: Arrival needs BOTH date and time
  if (!entry.arrival_date || !entry.arrival_time) {
    if (!entry.arrival_date) missing.push('arrival_date');
    if (!entry.arrival_time) missing.push('arrival_time');
  }

  // Rule 2: Plate number required UNLESS parking is 'none'
  if (entry.parking_needs !== 'none' && !entry.plate_number) {
    missing.push('plate_number');
  }

  // Rule 3: Entourage size - 0 counts as answered, null means unanswered
  if (entry.entourage_size === null || entry.entourage_size === undefined) {
    missing.push('entourage_size');
  }

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
  };
};

/**
 * Calculate urgency level based on days until event
 */
export const checkUrgency = (
  entry: LogisticsEntry,
  event: Event,
  todayLocal: string
): UrgencyStatus => {
  const completion = checkCompletion(entry);

  // Complete entries have no urgency
  if (completion.isComplete) {
    return {
      level: 'none',
      daysUntilEvent: daysBetween(todayLocal, event.start_date),
      reason: 'Complete',
    };
  }

  // Past events have no urgency
  if (compareDateStrings(event.start_date, todayLocal) < 0) {
    return {
      level: 'none',
      daysUntilEvent: daysBetween(todayLocal, event.start_date),
      reason: 'Event has passed',
    };
  }

  const days = daysBetween(todayLocal, event.start_date);

  if (days <= CRITICAL_DAYS) {
    return {
      level: 'critical',
      daysUntilEvent: days,
      reason: `${days} day${days === 1 ? '' : 's'} until event`,
    };
  }

  if (days <= URGENT_DAYS) {
    return {
      level: 'urgent',
      daysUntilEvent: days,
      reason: `${days} days until event`,
    };
  }

  if (days < REMINDER_DAYS) {
    return {
      level: 'urgent',
      daysUntilEvent: days,
      reason: `${days} days until event`,
    };
  }

  return {
    level: 'reminder',
    daysUntilEvent: days,
    reason: `${days} days until event`,
  };
};

/**
 * Sort logistics entries by urgency (critical first), then by event date, then by name
 */
export const sortByUrgency = (
  entries: LogisticsEntry[],
  events: Event[],
  todayLocal: string
): LogisticsEntry[] => {
  const eventMap = new Map(events.map(e => [e.id, e]));

  return [...entries].sort((a, b) => {
    const eventA = eventMap.get(a.event_id);
    const eventB = eventMap.get(b.event_id);

    if (!eventA || !eventB) return 0;

    const urgencyA = checkUrgency(a, eventA, todayLocal);
    const urgencyB = checkUrgency(b, eventB, todayLocal);

    // Sort by urgency level (critical > urgent > reminder > none)
    const urgencyOrder = { critical: 0, urgent: 1, reminder: 2, none: 3 };
    const urgencyDiff = urgencyOrder[urgencyA.level] - urgencyOrder[urgencyB.level];
    if (urgencyDiff !== 0) return urgencyDiff;

    // Same urgency: sort by event date (soonest first)
    const dateDiff = compareDateStrings(eventA.start_date, eventB.start_date);
    if (dateDiff !== 0) return dateDiff;

    // Same event date: sort by participant name
    return a.participant_name.localeCompare(b.participant_name);
  });
};

/**
 * Format parking needs for display
 */
export const formatParkingNeeds = (needs: ParkingNeeds): string => {
  switch (needs) {
    case 'none':
      return 'None';
    case 'standard':
      return 'Standard';
    case 'accessible':
      return 'Accessible';
  }
};

/**
 * Format participant kind for display
 */
export const formatParticipantKind = (kind: string): string => {
  switch (kind) {
    case 'confirmed_guest':
      return 'Confirmed Guest';
    case 'sponsor':
      return 'Sponsor';
    case 'performer':
      return 'Performer';
    default:
      return kind;
  }
};
