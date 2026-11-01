import type { Project, Task, BudgetLineItem, ProjectReadiness } from '../types/projects';
import type { ReferenceReview } from '../types/referenceExtraction';
import { confirmedComponents } from './componentPlanning';

export const READINESS_FORMULA = 'Each Own it component scores 1. Each other component scores its Done tasks divided by all its tasks (0 if none). Average every component and round to a whole percent.';
export interface ReadinessInputs {
  project: Project;
  projectTasks: Task[];
  projectBudget: BudgetLineItem[];
  review?: ReferenceReview | null;
}
/** Sole project readiness formula. No review means 0, never a fixture match. */
export function computeReadiness({ project, projectTasks, projectBudget, review }: ReadinessInputs): ProjectReadiness {
  const components = confirmedComponents(review);
  const scores = components.map(component => {
    const tasks = projectTasks.filter(task => task.project_id === project.project_id && task.component_id === component.id);
    return { id: component.id, score: component.value.plan === 'own' ? 1 : tasks.length ? tasks.filter(task => task.status === 'completed').length / tasks.length : 0 };
  });
  const percent = scores.length ? Math.round(scores.reduce((sum, value) => sum + value.score, 0) / scores.length * 100) : 0;
  const spent = projectBudget.filter(line => line.project_id === project.project_id).reduce((sum, line) => sum + line.actual_amount, 0);
  return { project_id: project.project_id, readiness_score: percent / 100,
    missing_components: scores.filter(value => value.score < 1).map(value => value.id),
    matched_components: [], // Sourcing does not assert an owned inventory ID.
    budget_utilization: project.stated_budget && project.stated_budget > 0 ? spent / project.stated_budget * 100 : 0,
    skill_gap_details: [], calculation_timestamp: new Date().toISOString() };
}
