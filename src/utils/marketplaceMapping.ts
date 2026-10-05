/**
 * ForgeMind - Marketplace server -> phone mapping
 *
 * ONE function turns a server listing into the phone's `Listing` shape, with a
 * safe default for every field. Nothing in this file touches React, React
 * Native or AsyncStorage, so the same code the app runs can be exercised by a
 * plain node script (see the marketplace verification runs).
 *
 * `seller_email` is deliberately absent from the phone shape. The server never
 * returns another user's email, and no screen may derive a name or an
 * ownership answer from an email any more.
 */

import { formatPHP } from './formatCurrency';
import type {
  AppealStatus,
  Listing,
  ListingStatus,
  RemovedReason,
  ScreeningResult,
  ServerPostType,
} from '../types/marketplace';

/** Shown when the server sends no seller name at all. */
export const FALLBACK_SELLER_NAME = 'Cosplayer';

const POST_TYPES: readonly ServerPostType[] = ['sell', 'trade', 'commission'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** A number, or null when the field is absent, null, blank or not a number. */
function money(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** A whole-number field that is nullable (rental_period_days). */
function count(value: unknown): number | null {
  const parsed = money(value);
  if (parsed === null) return null;
  return Number.isInteger(parsed) ? parsed : null;
}

function flag(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1) return true;
  if (value === 'false' || value === 0) return false;
  return fallback;
}

/** An array of strings. Anything else (null, a string, an object) becomes []. */
function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
}

function postType(value: unknown): ServerPostType {
  return POST_TYPES.includes(value as ServerPostType) ? (value as ServerPostType) : 'sell';
}

function listingStatus(value: unknown): ListingStatus {
  return value === 'active' || value === 'blocked' || value === 'cancelled' || value === 'sold'
    ? value
    : 'active';
}

function screeningResult(value: unknown): ScreeningResult {
  return value === 'blocked' ? 'blocked' : 'passed';
}

function appealStatus(value: unknown): AppealStatus {
  return value === 'pending' || value === 'upheld' || value === 'overturned' ? value : 'none';
}

function removedReason(value: unknown): RemovedReason | null {
  return value === 'sold_elsewhere' ||
    value === 'no_longer_available' ||
    value === 'posted_by_mistake' ||
    value === 'other'
    ? value
    : null;
}

/** A date as a string the app can hand to `new Date()`. Never undefined. */
function dateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  return new Date(0).toISOString();
}

/**
 * Turn one server listing into the phone's Listing.
 *
 * Safe for any input, including undefined and a string: an unusable input
 * becomes an empty listing rather than a crash.
 */
export function mapServerListing(raw: unknown): Listing {
  const row = isRecord(raw) ? raw : {};

  const price = money(row.price);
  const rate = money(row.rate);

  return {
    id: text(row.id),
    title: text(row.title),
    description: text(row.description),
    category: text(row.category, 'Uncategorized'),

    post_type: postType(row.post_type),
    transaction_type: postType(row.post_type),

    condition: text(row.condition, 'unspecified'),
    photos: stringList(row.photos),

    price,
    budget: money(row.budget),
    rate,
    rental_fee: money(row.rental_fee),
    trade_estimated_value: money(row.trade_estimated_value),
    rental_period_days: count(row.rental_period_days),
    deposit_note: textOrNull(row.deposit_note),
    trade_offered_item: textOrNull(row.trade_offered_item),
    trade_wanted_item: textOrNull(row.trade_wanted_item),
    request_deadline: textOrNull(row.request_deadline),
    handoff_method: textOrNull(row.handoff_method),
    open_to_trade: flag(row.open_to_trade),

    status: listingStatus(row.status),

    screening_result: screeningResult(row.screening_result),
    screening_reason: textOrNull(row.screening_reason),
    appeal_status: appealStatus(row.appeal_status),
    appeal_message: textOrNull(row.appeal_message),
    removed_at: textOrNull(row.removed_at),
    removed_reason: removedReason(row.removed_reason),

    seller_user_id: textOrNull(row.seller_user_id),
    seller_name: text(row.seller_name, FALLBACK_SELLER_NAME),
    seller_verified: flag(row.seller_verified),
    // Only the server can say this. Without the field it is false, never a guess.
    is_owner: flag(row.is_owner, false),

    created_at: dateString(row.created_at),
    updated_at: dateString(row.updated_at),
  };
}

/** Map a list, dropping any entry that is not a usable server listing. */
export function mapServerListings(raw: unknown): Listing[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map(mapServerListing);
}

/**
 * Read the offline cache. Anything that is not an array of listing-shaped rows
 * (missing, null, empty, unparsable, or the old local object shape) is ignored
 * and reported as an empty list, so a bad cache can never reach a screen.
 */
export function parseCachedListings(raw: string | null | undefined): Listing[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    return mapServerListings(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** What a listing costs, in words. Never throws, never shows a raw null. */
export function getListingPriceLabel(listing: Partial<Listing> | null | undefined): string {
  const postType = listing?.post_type ?? listing?.transaction_type ?? 'sell';

  if (postType === 'commission') {
    const rate = listing?.rate;
    return rate === null || rate === undefined ? 'From —' : `From ${formatPHP(rate)}`;
  }

  if (postType === 'trade') {
    const estimate = listing?.trade_estimated_value;
    if (estimate !== null && estimate !== undefined) {
      return `Trade (est. ${formatPHP(estimate)})`;
    }
    return 'Trade';
  }

  return formatPHP(listing?.price);
}

/** The name to show for the seller of a listing. Never an email. */
export function getListingSellerName(listing: Partial<Listing> | null | undefined): string {
  return listing?.seller_name || FALLBACK_SELLER_NAME;
}
