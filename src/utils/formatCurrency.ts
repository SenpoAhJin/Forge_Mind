/**
 * ForgeMind — display formatting for currency.
 *
 * Display-layer ONLY (same pattern as formatStatus.ts): the stored `price`
 * on a Listing is a plain number; it is formatted as Philippine pesos at
 * render time. The raw stored value is NEVER changed by these helpers.
 *
 * Existing inline peso formatting elsewhere (Card.tsx, ProjectDashboardScreen,
 * OwnedItemDetail) can migrate to this helper later; this file exists so
 * marketplace pricing is centralized in one place.
 */

/** Shown instead of an amount when a listing has none (a dash, never "null"). */
export const NO_AMOUNT = '—';

/**
 * Format a numeric amount as Philippine pesos, e.g. 1000 -> "₱1,000.00".
 * Thousands separator + two decimal places, no Intl dependency (works the
 * same on Hermes / RN Web).
 *
 * A missing amount is normal, not an error: a commission listing has a rate and
 * no price, and a trade listing has no price at all. null, undefined and
 * anything non-numeric return the dash, so a card or a detail screen can call
 * this on a nullable field without a guard and without throwing.
 */
export const formatPHP = (amount: number | null | undefined): string => {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return NO_AMOUNT;
  }
  const fixed = amount.toFixed(2);
  const [whole, decimals] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₱${withCommas}.${decimals}`;
};