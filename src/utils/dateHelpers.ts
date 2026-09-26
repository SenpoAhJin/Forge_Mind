/**
 * FE-7 Step 2 Part A2: Local Date Helpers
 * Prevents UTC shift issues for date-only comparisons and YYYY-MM-DD derivation
 * App runs at UTC+8 (Philippines time zone)
 */

/**
 * Convert a Date to a YYYY-MM-DD string using its LOCAL date parts
 */
const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 * Avoids UTC shift (e.g., at 03:00 UTC+8, toISOString would give yesterday)
 */
export const getTodayLocal = (): string => toLocalDateString(new Date());

/**
 * Get current timestamp as ISO string (for created_at/updated_at)
 * This DOES use UTC and is correct for timestamps
 */
export const getNowISO = (): string => {
  return new Date().toISOString();
};

/**
 * Compare two YYYY-MM-DD date strings
 * Returns: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export const compareDateStrings = (date1: string, date2: string): number => {
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
};

/**
 * Check if a YYYY-MM-DD date is in the past (before today)
 */
export const isDateInPast = (dateStr: string): boolean => {
  const today = getTodayLocal();
  return compareDateStrings(dateStr, today) < 0;
};

/**
 * Check if a YYYY-MM-DD date is today or in the future
 */
export const isDateTodayOrFuture = (dateStr: string): boolean => {
  const today = getTodayLocal();
  return compareDateStrings(dateStr, today) >= 0;
};

/**
 * Calculate days between two YYYY-MM-DD dates
 * Positive if date2 is after date1
 */
export const daysBetween = (date1: string, date2: string): number => {
  const d1 = new Date(date1 + 'T00:00:00');
  const d2 = new Date(date2 + 'T00:00:00');
  const diffMs = d2.getTime() - d1.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Number of days in a calendar month. monthIndex is 0-based (same as Date#getMonth).
 */
const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

/**
 * "1 day" / "3 days" - never "1 days"
 */
const pluralize = (count: number, unit: string): string =>
  `${count} ${unit}${count === 1 ? '' : 's'}`;

/**
 * Human-readable countdown for display only ("1 month and 20 days").
 *
 * DISPLAY LAYER ONLY. Every urgency/criticality threshold (CRITICAL_DAYS,
 * URGENT_DAYS, ...) still keys off the raw number from daysBetween() so the
 * red/yellow/green colour logic is unaffected by the phrasing chosen here.
 *
 * Uses REAL calendar months (28-31 days) rather than dividing by 30, so
 * "today -> 2026-11-15" is 1 month and 20 days, not a flat 30-day remainder.
 *
 * Output rules:
 *   past date        -> "Past"
 *   0 days           -> "Today"
 *   1-29 days        -> "5 days"          (days, never weeks, so units stay consistent)
 *   30+ days         -> "2 months" / "1 month and 20 days"
 *   12+ months       -> "1 year" / "1 year and 1 month"
 */
export const formatCountdown = (targetDateStr: string, todayStr: string): string => {
  const totalDays = daysBetween(todayStr, targetDateStr);

  if (totalDays < 0) return 'Past';
  if (totalDays === 0) return 'Today';
  if (totalDays < 30) return pluralize(totalDays, 'day');

  const today = new Date(`${todayStr}T00:00:00`);
  const target = new Date(`${targetDateStr}T00:00:00`);

  // Whole calendar months between the two dates, before any day remainder.
  let months =
    (target.getFullYear() - today.getFullYear()) * 12
    + (target.getMonth() - today.getMonth());

  // Clamp the anchor day to the target month so short months do not roll
  // forward (Jan 31 + 1 month is Feb 28, not Mar 3).
  let anchorDay = Math.min(
    today.getDate(),
    daysInMonth(today.getFullYear(), today.getMonth() + months)
  );
  let anchor = new Date(today.getFullYear(), today.getMonth() + months, anchorDay);

  // If that many whole months overshoots the target, give the month back and
  // recompute. This keeps remainders honest for short lead times.
  if (anchor.getTime() > target.getTime()) {
    months -= 1;
    anchorDay = Math.min(
      today.getDate(),
      daysInMonth(today.getFullYear(), today.getMonth() + months)
    );
    anchor = new Date(today.getFullYear(), today.getMonth() + months, anchorDay);
  }

  // Same calendar month can still be 30 days apart in a 31-day month, which
  // would otherwise render as "0 months and 30 days".
  if (months < 1) return pluralize(totalDays, 'day');

  const remainingDays = daysBetween(toLocalDateString(anchor), targetDateStr);

  if (months >= 12) {
    const years = Math.floor(months / 12);
    const extraMonths = months % 12;
    return extraMonths === 0
      ? pluralize(years, 'year')
      : `${pluralize(years, 'year')} and ${pluralize(extraMonths, 'month')}`;
  }

  return remainingDays === 0
    ? pluralize(months, 'month')
    : `${pluralize(months, 'month')} and ${pluralize(remainingDays, 'day')}`;
};

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
