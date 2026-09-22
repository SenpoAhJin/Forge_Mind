/**
 * FE-7 Step 2: Logistics Rules & Completion Logic (Correction Pass C2)
 * 
 * Completion rules:
 * - plate_number: n/a when parking_needs === 'none', otherwise required
 * - arrival: needs both date AND time to count as complete
 * - entourage_size: 0 counts as answered
 * - stage_time_preference: required for performers only
 * - participant_email: EXCLUDED from completion (optional field)
 * 
 * Urgency rules (days until submission_deadline):
 * - COMPLETE: all tracked fields answered
 * - ON_TRACK: >7 days to deadline
 * - REMINDER: ≤7 days to deadline
 * - URGENT: ≤3 days to deadline
 * - CRITICAL: ≤1 day to deadline OR past deadline while incomplete
 */

import { LogisticsEntry, ParkingNeeds, LogisticsStatus } from '../types/logistics';
import { Event } from '../types/events';
import { daysBetween, compareDateStrings } from './dateHelpers';

// Rule constants - used everywhere, no hard-coded ranges elsewhere
export const REMINDER_DAYS = 7;
export const URGENT_DAYS = 3;
export const CRITICAL_DAYS = 1;

export type UrgencyLevel = 'complete' | 'on_track' | 'reminder' | 'urgent' | 'critical';

export interface CompletionStatus {
  isComplete: boolean;
  missingFields: string[];
}

export interface UrgencyStatus {
  level: UrgencyLevel;
  daysUntilDeadline: number;
  reason: string;
}

/**
 * Get missing fields for a logistics entry
 */
export const getMissingFields = (entry: LogisticsEntry): string[] => {
  const missing: string[] = [];

  // Helper: check if string field is empty (null, undefined, or whitespace-only)
  const isEmpty = (val: string | null | undefined): boolean => {
    return !val || val.trim() === '';
  };

  // Rule 1: Arrival needs BOTH date and time
  if (isEmpty(entry.arrival_date)) missing.push('arrival_date');
  if (isEmpty(entry.arrival_time)) missing.push('arrival_time');

  // Rule 2: Plate number required UNLESS parking is 'none'
  if (entry.parking_needs !== 'none' && isEmpty(entry.plate_number)) {
    missing.push('plate_number');
  }

  // Rule 3: Entourage size - 0 counts as answered, null means unanswered
  if (entry.entourage_size === null || entry.entourage_size === undefined) {
    missing.push('entourage_size');
  }

  // Rule 4: Stage time required for performers only
  if (entry.participant_kind === 'performer' && isEmpty(entry.stage_time_preference)) {
    missing.push('stage_time_preference');
  }

  return missing;
};

/**
 * Check if a logistics entry is complete according to rules
 */
export const checkCompletion = (entry: LogisticsEntry): CompletionStatus => {
  const missing = getMissingFields(entry);
  
  return {
    isComplete: missing.length === 0,
    missingFields: missing,
  };
};

/**
 * Calculate urgency level based on days until submission_deadline
 */
export const getUrgency = (
  entry: LogisticsEntry,
  todayLocal: string
): UrgencyStatus => {
  const completion = checkCompletion(entry);

  // Complete entries have no urgency
  if (completion.isComplete) {
    return {
      level: 'complete',
      daysUntilDeadline: daysBetween(todayLocal, entry.submission_deadline),
      reason: 'Complete',
    };
  }

  const days = daysBetween(todayLocal, entry.submission_deadline);

  // Past deadline while incomplete = CRITICAL
  if (days < 0) {
    return {
      level: 'critical',
      daysUntilDeadline: days,
      reason: 'Past deadline',
    };
  }

  // ≤1 day = CRITICAL
  if (days <= CRITICAL_DAYS) {
    return {
      level: 'critical',
      daysUntilDeadline: days,
      reason: `${days} day${days === 1 ? '' : 's'} left`,
    };
  }

  // ≤3 days = URGENT
  if (days <= URGENT_DAYS) {
    return {
      level: 'urgent',
      daysUntilDeadline: days,
      reason: `${days} days left`,
    };
  }

  // ≤7 days = REMINDER
  if (days <= REMINDER_DAYS) {
    return {
      level: 'reminder',
      daysUntilDeadline: days,
      reason: `${days} days left`,
    };
  }

  // >7 days = ON_TRACK
  return {
    level: 'on_track',
    daysUntilDeadline: days,
    reason: `${days} days left`,
  };
};

/**
 * Sort logistics entries by criticality
 * - Incomplete first
 * - Earliest deadline
 * - More missing fields
 * - Earlier event start
 */
export const sortByCriticality = (
  entries: LogisticsEntry[],
  events: Event[],
  todayLocal: string
): LogisticsEntry[] => {
  const eventMap = new Map(events.map(e => [e.id, e]));

  return [...entries].sort((a, b) => {
    const eventA = eventMap.get(a.event_id);
    const eventB = eventMap.get(b.event_id);

    if (!eventA || !eventB) return 0;

    const urgencyA = getUrgency(a, todayLocal);
    const urgencyB = getUrgency(b, todayLocal);

    // Complete entries go last
    if (urgencyA.level === 'complete' && urgencyB.level !== 'complete') return 1;
    if (urgencyA.level !== 'complete' && urgencyB.level === 'complete') return -1;

    // Both incomplete: sort by deadline (earliest first)
    if (urgencyA.level !== 'complete' && urgencyB.level !== 'complete') {
      const deadlineDiff = compareDateStrings(a.submission_deadline, b.submission_deadline);
      if (deadlineDiff !== 0) return deadlineDiff;

      // Same deadline: more missing fields first
      const missingA = getMissingFields(a).length;
      const missingB = getMissingFields(b).length;
      if (missingA !== missingB) return missingB - missingA;

      // Same missing count: earlier event start first
      const eventDateDiff = compareDateStrings(eventA.start_date, eventB.start_date);
      if (eventDateDiff !== 0) return eventDateDiff;
    }

    // Both complete or same priority: sort by event date
    const eventDateDiff = compareDateStrings(eventA.start_date, eventB.start_date);
    if (eventDateDiff !== 0) return eventDateDiff;

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
      return 'Guest';
    case 'sponsor':
      return 'Sponsor';
    case 'performer':
      return 'Performer';
    default:
      return kind;
  }
};

/**
 * Format time from 24-hour to 12-hour with AM/PM
 * Used everywhere arrival time shows
 */
export const formatTime12h = (time24: string): string => {
  const [hourStr, minuteStr] = time24.split(':');
  const hour24 = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  
  if (hour24 === 0) return `12:${minute} AM`;
  if (hour24 < 12) return `${hour24}:${minute} AM`;
  if (hour24 === 12) return `12:${minute} PM`;
  return `${hour24 - 12}:${minute} PM`;
};

/**
 * Format event date range for display
 * C7: Used in event cards/headers
 */
export const formatEventDateRange = (startDate: string, endDate: string): string => {
  if (startDate === endDate) {
    return startDate;
  }
  return `${startDate} to ${endDate}`;
};

/**
 * Format missing field names for user-friendly display
 */
export const formatMissingFieldName = (fieldName: string): string => {
  switch (fieldName) {
    case 'arrival_date':
      return 'Arrival date';
    case 'arrival_time':
      return 'Arrival time';
    case 'plate_number':
      return 'Plate number';
    case 'entourage_size':
      return 'Entourage size';
    case 'stage_time_preference':
      return 'Stage time preference';
    default:
      return fieldName;
  }
};
