/**
 * Public Event Calendar Types
 * Community-submitted event listings (cosplay.ph-style public directory)
 * Separate from organizer-only EventsContext (draft/confirmed/logistics/contest system)
 */

export type CalendarEntryStatus = 'pending' | 'approved' | 'rejected';

export interface CalendarEntry {
  id: string;
  title: string;                    // 3-100 chars, required
  organizer_name: string;           // Free text (e.g. "Cosplay.ph", "AnimeCon 2026") - not validated
  venue_name: string;               // Required
  city: string;                     // Required
  start_date: string;               // YYYY-MM-DD, required
  end_date?: string | null;         // YYYY-MM-DD, optional, >= start_date if present
  description?: string | null;      // Optional, max 500 chars
  external_link?: string | null;    // Optional URL (website/social link)
  submitted_by_email: string;       // Submitter's email
  submitted_by_name: string;        // Snapshot of submitter's name (survives account deletion)
  submitted_by_department?: string | null;  // Department of staff submitter (for routing approval to correct Head)
  status: CalendarEntryStatus;      // pending (staff) / approved (after Head review or direct Head submission) / rejected
  reviewed_by_email?: string | null;  // Head who approved/rejected
  reviewed_at?: string | null;      // Timestamp of approval/rejection
  rejection_reason?: string | null; // Optional reason if rejected
  created_at: string;               // ISO timestamp
  updated_at: string;               // ISO timestamp
}
