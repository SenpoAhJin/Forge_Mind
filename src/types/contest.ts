/**
 * FE-7 Step 4: Contest Types
 * Contest opt-in + criteria + tier assignment
 */

export type ContestOptInStatus = 'pending' | 'confirmed' | 'declined';

export interface ContestCriterion {
  id: string;
  event_id: string;
  label: string;
  description: string;
  created_at: string; // ISO timestamp
}

export interface ContestOptIn {
  id: string;
  event_id: string;
  cosplayer_email: string;
  cosplayer_display_name: string; // Snapshot, survives account deletion
  status: ContestOptInStatus;
  assigned_tier_id: string | null; // Points to ContestCriterion.id
  assigned_at: string | null; // ISO timestamp
  confirmed_by_email: string | null;
  confirmed_at: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
}
