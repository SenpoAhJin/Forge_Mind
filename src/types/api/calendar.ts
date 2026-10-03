/**
 * Public Event Calendar API Types
 * Matches backend /calendar endpoints
 */

export type CalendarListingStatus = 'pending' | 'approved' | 'rejected';

export interface CalendarListing {
  id: string;
  title: string;
  organizer_name: string;
  venue_name: string;
  city: string;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD or null
  description: string | null;
  external_link: string | null;
  submitted_by_user_id: string;
  submitted_by_name: string; // Joined from users table
  submitted_by_department: string | null;
  status: CalendarListingStatus;
  reviewed_by_user_id: string | null;
  reviewed_by_name: string | null; // Joined from users table
  reviewed_at: string | null; // ISO timestamp
  rejection_reason: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface CreateCalendarListingInput {
  title: string;
  organizer_name: string;
  venue_name: string;
  city: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  description?: string | null;
  external_link?: string | null;
}

export interface UpdateCalendarListingInput {
  title?: string;
  organizer_name?: string;
  venue_name?: string;
  city?: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  description?: string | null;
  external_link?: string | null;
}

export interface ReviewCalendarListingInput {
  decision: 'approve' | 'reject';
  rejection_reason?: string;
}

// API Response shapes
export interface CalendarListingsResponse {
  listings: CalendarListing[];
}

export interface CalendarListingResponse {
  listing: CalendarListing;
}
