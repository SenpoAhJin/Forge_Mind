/**
 * FE-7 Step 2: Logistics Tracker
 * Types for tracking participant logistics (arrival, parking, entourage, stage time)
 */

export type ParticipantKind = 'confirmed_guest' | 'sponsor' | 'performer';

export type ParkingNeeds = 'none' | 'standard' | 'accessible';

export interface LogisticsEntry {
  id: string;
  event_id: string;
  participant_email: string;
  participant_name: string;
  participant_kind: ParticipantKind;

  // Arrival logistics
  arrival_date: string | null; // YYYY-MM-DD
  arrival_time: string | null; // HH:MM (24-hour)
  parking_needs: ParkingNeeds;
  plate_number: string | null; // null when parking_needs === 'none'
  entourage_size: number; // 0 means answered (no entourage), null means unanswered

  // Performance logistics (performers only)
  stage_time_preference: string | null; // free text, optional

  // Metadata
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  created_by_email: string;
  updated_by_email: string;
}
