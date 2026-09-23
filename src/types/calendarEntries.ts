/**
 * Public Event Calendar Types
 * Community-submitted event listings (cosplay.ph-style public directory)
 * Separate from organizer-only EventsContext (draft/confirmed/logistics/contest system)
 */

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
  created_at: string;               // ISO timestamp
  updated_at: string;               // ISO timestamp
}
