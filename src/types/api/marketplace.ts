/**
 * Marketplace Registration API Types
 * Shared with forgemind-backend/src/marketplace/registration.ts
 */

export type MarketplaceRole = 'buyer' | 'seller' | 'both';

/**
 * A registration as the server returns it.
 * `payout_account_masked` is the ONLY payout representation any client gets:
 * the full number never leaves the server, so there is no field for it here.
 */
export interface MarketplaceRegistration {
  marketplace_role: MarketplaceRole | null;
  seller_display_name: string;
  contact_email: string;
  contact_phone: string | null;
  payout_method: string | null;
  payout_account_masked: string | null;
  agreed_to_marketplace_terms: boolean;
  terms_accepted_at: string | null;
  submitted_at: string | null;
  rejection_reason: string | null;
}

/** Request body for POST /marketplace/registration. */
export interface MarketplaceRegistrationInput {
  marketplace_role: MarketplaceRole;
  seller_display_name: string;
  marketplace_contact_email: string;
  marketplace_contact_phone?: string;
  payout_method_label?: string;
  payout_method_number?: string;
  agreed_to_marketplace_terms: boolean;
}

export interface SubmitRegistrationResponse {
  registration: MarketplaceRegistration;
  verification_status: string;
}

export interface GetMyRegistrationResponse {
  registration: MarketplaceRegistration | null;
  verification_status: string;
}

/**
 * A 400 from the server. `fields` keys match MarketplaceRegistrationInput keys,
 * so the screen can attach each message to the input that caused it.
 */
export interface RegistrationValidationError {
  kind: 'validation';
  fields: Record<string, string>;
  message: string;
}

/** 401: no or expired session. */
export interface RegistrationAuthError {
  kind: 'auth';
  message: string;
}

/** 409: already verified or revoked, so the registration cannot change. */
export interface RegistrationConflictError {
  kind: 'conflict';
  message: string;
}

/** The request never reached the server, or the server did not answer. */
export interface RegistrationNetworkError {
  kind: 'network';
  message: string;
}

/** Any other non-2xx response. */
export interface RegistrationServerError {
  kind: 'server';
  message: string;
}

export type SubmitRegistrationError =
  | RegistrationValidationError
  | RegistrationAuthError
  | RegistrationConflictError
  | RegistrationNetworkError
  | RegistrationServerError;

/** Length limits, kept in step with the backend constants. */
export const PAYOUT_NUMBER_MIN_LENGTH = 7;
export const PAYOUT_NUMBER_MAX_LENGTH = 20;
export const CONTACT_PHONE_MIN_LENGTH = 7;
export const CONTACT_PHONE_MAX_LENGTH = 15;
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 40;
export const PAYOUT_METHOD_MIN_LENGTH = 2;
export const PAYOUT_METHOD_MAX_LENGTH = 40;

/** Request body for POST /marketplace/listings/check. */
export interface CheckListingInput {
  title: string;
  description: string;
  category: string;
}

/** Violation from the moderation endpoint. */
export interface ModerationViolation {
  field: 'title' | 'description';
  code: 'VULGAR' | 'ADULT' | 'HATE' | 'PROHIBITED_ITEM' | 'UNRELATED';
  message: string;
}

/** Response from POST /marketplace/listings/check. */
export interface CheckListingResponse {
  allowed: boolean;
  violations: ModerationViolation[];
}

/** Error from checkListing. Reuses the registration error shape. */
export type CheckListingError =
  | RegistrationValidationError
  | RegistrationAuthError
  | RegistrationNetworkError
  | RegistrationServerError
  | { kind: 'rate_limit'; message: string };
