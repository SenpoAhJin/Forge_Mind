"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatEventDateRange = exports.formatTime12h = exports.formatParticipantKind = exports.formatParkingNeeds = exports.sortByCriticality = exports.getUrgency = exports.checkCompletion = exports.getMissingFields = exports.CRITICAL_DAYS = exports.URGENT_DAYS = exports.REMINDER_DAYS = void 0;
const dateHelpers_1 = require("./dateHelpers");
// Rule constants - used everywhere, no hard-coded ranges elsewhere
exports.REMINDER_DAYS = 7;
exports.URGENT_DAYS = 3;
exports.CRITICAL_DAYS = 1;
/**
 * Get missing fields for a logistics entry
 */
const getMissingFields = (entry) => {
    const missing = [];
    // Rule 1: Arrival needs BOTH date and time
    if (!entry.arrival_date)
        missing.push('arrival_date');
    if (!entry.arrival_time)
        missing.push('arrival_time');
    // Rule 2: Plate number required UNLESS parking is 'none'
    if (entry.parking_needs !== 'none' && !entry.plate_number) {
        missing.push('plate_number');
    }
    // Rule 3: Entourage size - 0 counts as answered, null means unanswered
    if (entry.entourage_size === null || entry.entourage_size === undefined) {
        missing.push('entourage_size');
    }
    // Rule 4: Stage time required for performers only
    if (entry.participant_kind === 'performer' && !entry.stage_time_preference) {
        missing.push('stage_time_preference');
    }
    return missing;
};
exports.getMissingFields = getMissingFields;
/**
 * Check if a logistics entry is complete according to rules
 */
const checkCompletion = (entry) => {
    const missing = (0, exports.getMissingFields)(entry);
    return {
        isComplete: missing.length === 0,
        missingFields: missing,
    };
};
exports.checkCompletion = checkCompletion;
/**
 * Calculate urgency level based on days until submission_deadline
 */
const getUrgency = (entry, todayLocal) => {
    const completion = (0, exports.checkCompletion)(entry);
    // Complete entries have no urgency
    if (completion.isComplete) {
        return {
            level: 'complete',
            daysUntilDeadline: (0, dateHelpers_1.daysBetween)(todayLocal, entry.submission_deadline),
            reason: 'Complete',
        };
    }
    const days = (0, dateHelpers_1.daysBetween)(todayLocal, entry.submission_deadline);
    // Past deadline while incomplete = CRITICAL
    if (days < 0) {
        return {
            level: 'critical',
            daysUntilDeadline: days,
            reason: 'Past deadline',
        };
    }
    // ≤1 day = CRITICAL
    if (days <= exports.CRITICAL_DAYS) {
        return {
            level: 'critical',
            daysUntilDeadline: days,
            reason: `${days} day${days === 1 ? '' : 's'} left`,
        };
    }
    // ≤3 days = URGENT
    if (days <= exports.URGENT_DAYS) {
        return {
            level: 'urgent',
            daysUntilDeadline: days,
            reason: `${days} days left`,
        };
    }
    // ≤7 days = REMINDER
    if (days <= exports.REMINDER_DAYS) {
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
exports.getUrgency = getUrgency;
/**
 * Sort logistics entries by criticality
 * - Incomplete first
 * - Earliest deadline
 * - More missing fields
 * - Earlier event start
 */
const sortByCriticality = (entries, events, todayLocal) => {
    const eventMap = new Map(events.map(e => [e.id, e]));
    return [...entries].sort((a, b) => {
        const eventA = eventMap.get(a.event_id);
        const eventB = eventMap.get(b.event_id);
        if (!eventA || !eventB)
            return 0;
        const urgencyA = (0, exports.getUrgency)(a, todayLocal);
        const urgencyB = (0, exports.getUrgency)(b, todayLocal);
        // Complete entries go last
        if (urgencyA.level === 'complete' && urgencyB.level !== 'complete')
            return 1;
        if (urgencyA.level !== 'complete' && urgencyB.level === 'complete')
            return -1;
        // Both incomplete: sort by deadline (earliest first)
        if (urgencyA.level !== 'complete' && urgencyB.level !== 'complete') {
            const deadlineDiff = (0, dateHelpers_1.compareDateStrings)(a.submission_deadline, b.submission_deadline);
            if (deadlineDiff !== 0)
                return deadlineDiff;
            // Same deadline: more missing fields first
            const missingA = (0, exports.getMissingFields)(a).length;
            const missingB = (0, exports.getMissingFields)(b).length;
            if (missingA !== missingB)
                return missingB - missingA;
            // Same missing count: earlier event start first
            const eventDateDiff = (0, dateHelpers_1.compareDateStrings)(eventA.start_date, eventB.start_date);
            if (eventDateDiff !== 0)
                return eventDateDiff;
        }
        // Both complete or same priority: sort by event date
        const eventDateDiff = (0, dateHelpers_1.compareDateStrings)(eventA.start_date, eventB.start_date);
        if (eventDateDiff !== 0)
            return eventDateDiff;
        // Same event date: sort by participant name
        return a.participant_name.localeCompare(b.participant_name);
    });
};
exports.sortByCriticality = sortByCriticality;
/**
 * Format parking needs for display
 */
const formatParkingNeeds = (needs) => {
    switch (needs) {
        case 'none':
            return 'None';
        case 'standard':
            return 'Standard';
        case 'accessible':
            return 'Accessible';
    }
};
exports.formatParkingNeeds = formatParkingNeeds;
/**
 * Format participant kind for display
 */
const formatParticipantKind = (kind) => {
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
exports.formatParticipantKind = formatParticipantKind;
/**
 * Format time from 24-hour to 12-hour with AM/PM
 * Used everywhere arrival time shows
 */
const formatTime12h = (time24) => {
    const [hourStr, minuteStr] = time24.split(':');
    const hour24 = parseInt(hourStr, 10);
    const minute = minuteStr || '00';
    if (hour24 === 0)
        return `12:${minute} AM`;
    if (hour24 < 12)
        return `${hour24}:${minute} AM`;
    if (hour24 === 12)
        return `12:${minute} PM`;
    return `${hour24 - 12}:${minute} PM`;
};
exports.formatTime12h = formatTime12h;
/**
 * Format event date range for display
 * C7: Used in event cards/headers
 */
const formatEventDateRange = (startDate, endDate) => {
    if (startDate === endDate) {
        return startDate;
    }
    return `${startDate} to ${endDate}`;
};
exports.formatEventDateRange = formatEventDateRange;
