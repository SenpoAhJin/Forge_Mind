/**
 * Commission Milestone Types
 * Based on ForgeMind Phase 0 Foundation - TransactionMilestone entity
 * 
 * Tracks discrete states in commission lifecycle:
 * payment → work-started → work-completed
 * 
 * Both parties can see progress. Milestones are created when a commission
 * offer status changes to "accepted". Users mark milestones as confirmed.
 */

export type CommissionMilestoneType =
  | 'payment-sent'
  | 'payment-received'
  | 'work-started'
  | 'work-completed';

export type MilestoneStatus = 'pending' | 'confirmed';

export interface CommissionMilestone {
  milestone_id: string;                   // UUID-style (e.g., "milestone-abc123")
  offer_id: string;                       // Links to commission offer
  milestone_type: CommissionMilestoneType;
  milestone_status: MilestoneStatus;      // Always 'pending' at creation
  confirmed_by_email: string | null;      // User who confirmed this milestone
  evidence_photo_url?: string;            // Optional photo proof (e.g., payment receipt, completed work)
  notes?: string;                         // Optional notes about this milestone
  created_at: string;                     // ISO timestamp
  confirmed_at?: string;                  // ISO timestamp, set when status → 'confirmed'
}

export interface CreateMilestoneInput {
  offer_id: string;
  milestone_type: CommissionMilestoneType;
  notes?: string;
}

/**
 * Helper to get display label for milestone type
 */
export const MILESTONE_TYPE_LABELS: Record<CommissionMilestoneType, string> = {
  'payment-sent': 'Payment Sent',
  'payment-received': 'Payment Received',
  'work-started': 'Work Started',
  'work-completed': 'Work Completed',
};

/**
 * Helper to determine which milestones are required for commission completion
 * All must be confirmed for commission to be marked as complete
 */
export const REQUIRED_MILESTONE_TYPES: CommissionMilestoneType[] = [
  'payment-sent',
  'payment-received',
  'work-started',
  'work-completed',
];

/**
 * Helper to get milestone icon name
 */
export const MILESTONE_ICONS: Record<CommissionMilestoneType, string> = {
  'payment-sent': 'card-outline',
  'payment-received': 'checkmark-circle-outline',
  'work-started': 'construct-outline',
  'work-completed': 'trophy-outline',
};
