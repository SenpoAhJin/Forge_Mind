/**
 * FE-7 Step 1: Event Types
 * Organizer-confirmed event details (draft/confirmed/cancelled)
 * Mock data with AsyncStorage persistence - no backend yet
 */

export type EventStatus = 'draft' | 'confirmed' | 'cancelled';

export interface Event {
  id: string;                          // event-<slug> for seeds, event-<timestamp>-<rand> for created
  name: string;                        // 3-80 chars required
  description?: string | null;         // <= 500 chars optional
  venue_name: string;                  // 2-80 chars required
  city?: string | null;                // Optional city
  start_date: string;                  // ISO date string YYYY-MM-DD, required, not in past for new events
  end_date?: string | null;            // ISO date string YYYY-MM-DD, optional, >= start_date
  has_contest: boolean;                // Default false
  status: EventStatus;                 // draft | confirmed | cancelled
  created_by_email: string;            // Email of Head Organizer who created this
  created_at: string;                  // ISO timestamp
  updated_at: string;                  // ISO timestamp
  confirmed_at?: string | null;        // ISO timestamp when confirmed
  confirmed_by_email?: string | null;  // Email of Head Organizer who confirmed
  cancelled_at?: string | null;        // ISO timestamp when cancelled
  cancelled_by_email?: string | null;  // Email of Head Organizer who cancelled
}
