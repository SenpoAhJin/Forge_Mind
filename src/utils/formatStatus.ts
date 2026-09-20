/**
 * ForgeMind — display formatting for stored enum values.
 *
 * Display-layer ONLY: these map a stored snake_case enum value to a
 * human-, display-ready label ("Not Submitted", "Pending", "Verified",
 * "Rejected", "Approved", ...). The stored value on the account record is
 * NEVER changed — only the text shown to the user is reformatted.
 *
 * Every site that renders verification_status or
 * department_verification_status must go through these helpers so users
 * never see raw snake_case enums.
 */

import { DepartmentVerificationStatus } from '../types/organizer';

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  not_submitted: 'Not Submitted',
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  revoked: 'Revoked',
};

const DEPARTMENT_VERIFICATION_STATUS_LABELS: Record<DepartmentVerificationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const toTitleCase = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * Format a stored marketplace verification_status for display.
 * e.g. 'not_submitted' -> 'Not Submitted', 'pending' -> 'Pending',
 *      'verified' -> 'Verified'. Unknown/undefined values fall back to a
 *      title-cased version of whatever was stored (never raw snake_case).
 */
export const formatVerificationStatus = (
  status?: string | null
): string => {
  if (!status) return '';
  return VERIFICATION_STATUS_LABELS[status] ?? toTitleCase(status);
};

/**
 * Format a stored department_verification_status for display.
 * e.g. 'pending' -> 'Pending', 'approved' -> 'Approved',
 *      'rejected' -> 'Rejected'. Same display-only mapping as above.
 */
export const formatDepartmentVerificationStatus = (
  status?: DepartmentVerificationStatus | null
): string => {
  if (!status) return '';
  return DEPARTMENT_VERIFICATION_STATUS_LABELS[status] ?? toTitleCase(status);
};

// ----- Offers (FE-6 Step 3) ------------------------------------------------

const OFFER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

const OFFER_TYPE_LABELS: Record<string, string> = {
  purchase: 'Purchase Offer',
  trade: 'Trade Offer',
  commission: 'Commission',
};

/**
 * Format a stored offer status for display.
 * e.g. 'pending' -> 'Pending', 'accepted' -> 'Accepted'. Never raw snake_case.
 */
export const formatOfferStatus = (status?: string | null): string => {
  if (!status) return '';
  return OFFER_STATUS_LABELS[status] ?? toTitleCase(status);
};

/**
 * Format a stored offer type for display.
 * e.g. 'purchase' -> 'Purchase Offer', 'commission' -> 'Commission'.
 */
export const formatOfferType = (offerType?: string | null): string => {
  if (!offerType) return '';
  return OFFER_TYPE_LABELS[offerType] ?? toTitleCase(offerType);
};

// ----- Chat Threads (FE-6 Step 4) ------------------------------------------

type ThreadStatus = 'open' | 'closed';
type ThreadClosedReason = 'closed_by_participant' | 'listing_unavailable';

const THREAD_STATUS_LABELS: Record<ThreadStatus, string> = {
  open: 'Open',
  closed: 'Closed',
};

const THREAD_CLOSED_REASON_LABELS: Record<ThreadClosedReason, string> = {
  closed_by_participant: 'Closed',
  listing_unavailable: 'Listing Unavailable',
};

/**
 * Format a stored thread status for display.
 * e.g. 'open' -> 'Open', 'closed' -> 'Closed'.
 * If closed with a reason, returns the formatted reason instead.
 */
export const formatThreadStatus = (
  status: ThreadStatus,
  closedReason?: ThreadClosedReason | null
): string => {
  if (status === 'closed' && closedReason) {
    return THREAD_CLOSED_REASON_LABELS[closedReason] ?? toTitleCase(closedReason);
  }
  return THREAD_STATUS_LABELS[status] ?? toTitleCase(status);
};
