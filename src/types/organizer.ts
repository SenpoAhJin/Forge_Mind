/**
 * FE-5.5: Organizer Hierarchy Schema
 * Real schema replacing mock fields from organizer profile redesign
 */

// Staff department options (the ONE department a staff member registers under)
export type StaffDepartment =
  | 'logistics'
  | 'programs'
  | 'sponsorship'
  | 'secretariat'
  | 'technical_production'
  | 'marketing';

// Staff department verification lifecycle (same three-value pattern as Marketplace)
export type DepartmentVerificationStatus = 'pending' | 'approved' | 'rejected';

export const STAFF_DEPARTMENTS: StaffDepartment[] = [
  'logistics',
  'programs',
  'sponsorship',
  'secretariat',
  'technical_production',
  'marketing',
];

// OrganizerAccessRequest - tracks requests from users to become Head Organizers
export interface OrganizerAccessRequest {
  request_id: string;                    // UUID, primary key
  user_id: string;                        // UUID, foreign key to User
  justification: string;                  // Text explaining why they want access
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by_holder_id: string | null;   // UUID, foreign key to User (holder who reviewed)
  reviewed_at: Date | null;              // Timestamp of review
  submitted_at: Date;                    // Timestamp of submission
}

// EventStaffMember - tracks Staff invites from Heads to help organize events
export interface EventStaffMember {
  staff_member_id: string;               // UUID, primary key
  event_id: string;                      // UUID, foreign key to Event
  head_user_id: string;                  // UUID, foreign key to User (Head who invited)
  staff_user_id: string;                 // UUID, foreign key to User (Staff member)
  department: StaffDepartment;
  invite_status: 'pending' | 'accepted' | 'declined' | 'removed';
  invited_at: Date;                      // Timestamp of invite
  responded_at: Date | null;             // Timestamp when staff responded
}

// User.organizer_role addition (replaces mock field)
export type OrganizerRole = 'head' | 'staff' | null;

// Department labels for UI
export const DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
  logistics: 'Logistics',
  programs: 'Programs',
  sponsorship: 'Sponsorship',
  secretariat: 'Secretariat',
  technical_production: 'Technical Production',
  marketing: 'Marketing',
};
