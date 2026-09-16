/**
 * ForgeMind - Readiness Score Computation (Mock)
 * Deterministic derivation from Project + Tasks + Budget + matched components.
 * Formula (explicit, not a black box):
 *   taskCompletion = mean(task status score)   weight 40%
 *     - completed = 1.0, in-progress = 0.5, pending/skipped = 0
 *   itemMatch      = mean(match quality score) weight 30%
 *     - exact = 1.0, close = 0.5, loose = 0.25
 *   budgetHealth   = 1 - min(1, spent / stated_budget), or 1 when no budget   weight 30%
 *   readiness_score = clamp(taskCompletion*0.4 + itemMatch*0.3 + budgetHealth*0.3, 0, 1)
 * Real AI-driven readiness forecasting is a later backend phase.
 */

import { Project, Task, BudgetLineItem, ProjectReadiness, SkillLevel, MatchQuality } from '../types/projects';
import { matchComponents } from '../data';

const TASK_STATUS_SCORE: Record<Task['status'], number> = {
  completed: 1.0,
  'in-progress': 0.5,
  pending: 0,
  skipped: 0,
};

const MATCH_QUALITY_SCORE: Record<MatchQuality, number> = {
  exact: 1.0,
  close: 0.5,
  loose: 0.25,
};

const SKILL_RANK: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface ReadinessInputs {
  project: Project;
  projectTasks: Task[];
  projectBudget: BudgetLineItem[];
}

export const computeReadiness = ({ project, projectTasks, projectBudget }: ReadinessInputs): ProjectReadiness => {
  const tasks = projectTasks.length > 0 ? projectTasks : [{ status: 'pending' as const }];
  const taskCompletion =
    tasks.reduce((sum, t) => sum + TASK_STATUS_SCORE[t.status], 0) / tasks.length;

  const itemScores = matchComponents.length > 0
    ? matchComponents.map((c) => MATCH_QUALITY_SCORE[c.match_quality])
    : [0];
  const itemMatch = itemScores.reduce((a, b) => a + b, 0) / itemScores.length;

  const spent = projectBudget.reduce((sum, b) => sum + b.actual_amount, 0);
  const planned = projectBudget.reduce((sum, b) => sum + b.planned_amount, 0);
  const statedBudget = project.stated_budget ?? planned;
  const budgetHealth = statedBudget > 0 ? 1 - Math.min(1, spent / statedBudget) : 1;

  const readinessScore = round2(clamp(taskCompletion * 0.4 + itemMatch * 0.3 + budgetHealth * 0.3, 0, 1));

  const matchedComponents = matchComponents
    .filter((c) => c.match_quality === 'exact' || c.match_quality === 'close')
    .map((c) => ({ component_id: c.component_id, attire_id: `owned-item-${c.component_id}`, match_quality: c.match_quality }));

  const missingComponents = matchComponents
    .filter((c) => c.match_quality === 'loose')
    .map((c) => c.component_id);

  const userSkillRank = SKILL_RANK[project.stated_skill_level];
  const skillGapDetails = projectTasks
    .filter((t) => (t.difficulty_rating ?? 1) > userSkillRank)
    .flatMap((t) =>
      (t.technique_tags ?? []).map((technique) => ({
        technique,
        component_id: t.task_id,
        required_skill_level: project.stated_skill_level,
      }))
    );

  return {
    project_id: project.project_id,
    readiness_score: readinessScore,
    missing_components: missingComponents,
    matched_components: matchedComponents,
    budget_utilization: statedBudget > 0 ? round2((spent / statedBudget) * 100) : round2((spent / Math.max(1, planned)) * 100),
    skill_gap_details: skillGapDetails,
    calculation_timestamp: new Date().toISOString(),
  };
};