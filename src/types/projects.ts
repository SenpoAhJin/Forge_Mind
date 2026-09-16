/**
 * ForgeMind Project Types
 *
 * Project and Task exactly mirror the schemas in ForgeMind_Phase0_Foundation.md (v0.2.1 / Correction #5/#6).
 * Field names/types are kept identical so a real dataset (CSV/JSON dump) can be swapped in without renaming.
 *
 * BudgetLineItem is an ASSUMED structure: no Budget table exists in the foundation spec.
 * ProjectReadiness mirrors the computed ProjectReadiness entry (not a static table) in the same doc.
 */

export type ProjectStatus = 'planning' | 'in-progress' | 'completed' | 'abandoned';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'skipped';

export interface Project {
  project_id: string;
  user_id: string;
  character_id: string;
  variant_id: string;
  project_name: string;
  stated_budget?: number | null;
  stated_skill_level: SkillLevel;
  start_date: string;
  target_completion_date?: string | null;
  linked_event_id?: string | null;
  opted_in_readiness_sharing: boolean;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  task_id: string;
  project_id: string;
  task_description: string;
  task_order: number;
  difficulty_rating?: number | null;
  technique_tags?: string[] | null;
  estimated_time_hours?: number | null;
  actual_completion_date?: string | null;
  actual_time_spent_hours?: number | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export type BudgetCategory = 'material' | 'labor' | 'tool' | 'other';

export interface BudgetLineItem {
  budget_line_item_id: string;
  project_id: string;
  item_name: string;
  category: BudgetCategory;
  planned_amount: number;
  actual_amount: number;
  created_at: string;
  updated_at: string;
}

export type MatchQuality = 'exact' | 'close' | 'loose';

export interface MatchComponent {
  component_id: string;
  component_label: string;
  match_quality: MatchQuality;
  note: string;
}

export interface ProjectReadiness {
  project_id: string;
  readiness_score: number;
  missing_components: string[];
  matched_components: { component_id: string; attire_id: string; match_quality: MatchQuality }[];
  budget_utilization: number;
  skill_gap_details: { technique: string; component_id: string; required_skill_level: SkillLevel }[];
  calculation_timestamp: string;
}