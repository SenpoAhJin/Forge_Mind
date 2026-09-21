"use strict";
/**
 * FE-7 Step 2 Part A2: Local Date Helpers
 * Prevents UTC shift issues for date-only comparisons and YYYY-MM-DD derivation
 * App runs at UTC+8 (Philippines time zone)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.daysBetween = exports.isDateTodayOrFuture = exports.isDateInPast = exports.compareDateStrings = exports.getNowISO = exports.getTodayLocal = void 0;
/**
 * Get today's date as YYYY-MM-DD string in local timezone
 * Avoids UTC shift (e.g., at 03:00 UTC+8, toISOString would give yesterday)
 */
const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
exports.getTodayLocal = getTodayLocal;
/**
 * Get current timestamp as ISO string (for created_at/updated_at)
 * This DOES use UTC and is correct for timestamps
 */
const getNowISO = () => {
    return new Date().toISOString();
};
exports.getNowISO = getNowISO;
/**
 * Compare two YYYY-MM-DD date strings
 * Returns: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
const compareDateStrings = (date1, date2) => {
    if (date1 < date2)
        return -1;
    if (date1 > date2)
        return 1;
    return 0;
};
exports.compareDateStrings = compareDateStrings;
/**
 * Check if a YYYY-MM-DD date is in the past (before today)
 */
const isDateInPast = (dateStr) => {
    const today = (0, exports.getTodayLocal)();
    return (0, exports.compareDateStrings)(dateStr, today) < 0;
};
exports.isDateInPast = isDateInPast;
/**
 * Check if a YYYY-MM-DD date is today or in the future
 */
const isDateTodayOrFuture = (dateStr) => {
    const today = (0, exports.getTodayLocal)();
    return (0, exports.compareDateStrings)(dateStr, today) >= 0;
};
exports.isDateTodayOrFuture = isDateTodayOrFuture;
/**
 * Calculate days between two YYYY-MM-DD dates
 * Positive if date2 is after date1
 */
const daysBetween = (date1, date2) => {
    const d1 = new Date(date1 + 'T00:00:00');
    const d2 = new Date(date2 + 'T00:00:00');
    const diffMs = d2.getTime() - d1.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};
exports.daysBetween = daysBetween;
/**
 * PROOF TRACE (simulated at 03:00 UTC+8 on 2026-09-21)
 *
 * Local time: 2026-09-21 03:00:00 UTC+8
 * UTC time:   2026-09-20 19:00:00 UTC
 *
 * OLD (broken):
 *   new Date().toISOString() → "2026-09-20T19:00:00.000Z"
 *   .slice(0,10) → "2026-09-20" ❌ WRONG (yesterday in UTC)
 *
 * NEW (correct):
 *   new Date() → local Date object (2026-09-21 03:00)
 *   getFullYear() → 2026
 *   getMonth() → 8 (0-indexed, so +1 = 9)
 *   getDate() → 21
 *   Result: "2026-09-21" ✅ CORRECT
 */
