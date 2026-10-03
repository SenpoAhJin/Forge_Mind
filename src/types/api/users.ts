/**
 * User Management API Types
 * Shared between mobile app and backend
 */

import type { MarketplaceRegistration } from './marketplace';

export interface UserListItem {
  user_id: string;
  email: string;
  display_name: string;
  is_cosplayer: boolean;
  is_organizer: boolean;
  verification_status: 'pending' | 'verified' | 'rejected' | 'revoked' | 'not_submitted';
  verified_by_user_id: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  organizer_role: 'head' | 'staff' | null;
  head_organizer_department: string | null;
  department: string | null;
  department_verification_status: 'pending' | 'approved' | 'rejected' | null;
  department_rejection_reason: string | null;
  marketplace_role: 'buyer' | 'seller' | 'both' | null;
  seller_display_name: string | null;
  /**
   * The cosplayer's submitted marketplace registration, or null when they have
   * never submitted one. `payout_account_masked` is the only payout form the
   * server returns, so a review card cannot show a full account number.
   */
  registration: MarketplaceRegistration | null;
  created_at: string;
  updated_at: string;
}

export interface GetUsersParams {
  role?: 'cosplayer' | 'staff' | 'head';
  verification_status?: 'pending' | 'verified' | 'rejected' | 'revoked' | 'not_submitted';
  department_verification_status?: 'pending' | 'approved' | 'rejected';
  department?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface VerificationDecision {
  decision: 'approve' | 'reject';
  rejection_reason?: string;
}

export interface UsersResponse {
  users: UserListItem[];
}
