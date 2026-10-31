/** Step 1 of the Complete Guide. A brief is not yet an analyzed project. */
export type PlanningSkill = 'beginner' | 'intermediate' | 'advanced';

export interface PlanningBriefInput {
  character_name: string;
  reference_image: string;
  skill_level: PlanningSkill;
  budget: number;
  target_date: string;
}

export interface PlanningBrief extends PlanningBriefInput {
  brief_id: string;
  status: 'brief';
  created_at: string;
  updated_at: string;
}
