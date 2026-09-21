/**
 * FE-7 Step 2: Logistics Tracker (Correction Pass C1)
 * Types for tracking participant logistics (arrival, parking, entourage, stage time)
 */

export type ParticipantKind = 'confirmed_guest' | 'sponsor' | 'performer';

export type ParkingNeeds = 'none' | 'standard' | 'accessible';

export type LogisticsStatus = 'active' | 'withdrawn';

export interface LogisticsEntry {
  id: string;
  
  // CORE fields (lock after creation)
  event_id: string;
  participant_kind: ParticipantKind;
  participant_name: string;
  submission_deadline: string; // YYYY-MM-DD, >= today, <= event start_date

  // Optional participant email (excluded from completion)
  participant_email: string | null;

  // Tracked fields (completion criteria)
  arrival_date: string | null; // YYYY-MM-DD
  arrival_time: string | null; // HH:MM (24-hour)
  parking_needs: ParkingNeeds;
  plate_number: string | null; // null when parking_needs === 'none'
  entourage_size: number | null; // 0 means answered (no entourage), null means unanswered
  stage_time_preference: string | null; // performers only, required for completion

  // Assignment (Head Organizer assigns to Staff)
  assigned_to_email: string | null; // Staff email, null = unassigned

  // Status
  status: LogisticsStatus;
  withdrawn_at: string | null; // ISO 8601
  withdrawn_by_email: string | null;

  // Metadata
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  created_by_email: string;
  updated_by_email: string;
}
