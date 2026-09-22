/**
 * Project Milestone Types
 * Countdown checkpoints tied to a project's linked event
 */

export interface ProjectMilestone {
  milestone_id: string;
  project_id: string;
  label: string;
  target_date: string; // YYYY-MM-DD, must be <= linked event's start_date
  is_complete: boolean;
  created_at: string;
}
