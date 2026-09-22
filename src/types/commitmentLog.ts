/**
 * FE-7 Step 3: Commitment Log Types
 * Tracks changes to confirmed events and logistics tracked fields
 */

export interface CommitmentLogEntry {
  id: string;
  entity_type: 'event' | 'logistics_entry';
  entity_id: string;
  field_name: string;
  old_value: string; // Stored as string, format at render
  new_value: string; // Stored as string, format at render
  changed_by_email: string;
  changed_by_name: string; // Snapshot, account could be deleted later
  changed_at: string; // ISO timestamp
  department_routed_to: string | null; // Staff department for logistics, null for events
}
