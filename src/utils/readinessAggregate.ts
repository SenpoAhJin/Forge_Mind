/**
 * FE-7 Step 5: Event Readiness Aggregate
 *
 * Organizer-facing rollup of cosplayer readiness for one confirmed event.
 *
 * PRIVACY CONTRACT (the whole point of this file):
 * - Only projects that explicitly opted in (Project.opted_in_readiness_sharing)
 *   are ever read. Non-opted-in projects are invisible here, not just hidden.
 * - The result contains NO cosplayer identity: no emails, no display names, no
 *   project names, no per-cosplayer breakdown. Only counts, one average, and
 *   component tallies.
 * - Below MIN_OPTED_IN cosplayers the aggregate is withheld entirely, because
 *   an average over 1-2 people is functionally individual data.
 *
 * Computed on demand from ProjectsContext data - deliberately NOT a persisted
 * table, so it can never drift out of sync with the underlying opt-ins.
 *
 * `grep -rn "aggregate" src/contexts/ src/types/` returned nothing before this
 * file, confirming no parallel implementation existed.
 */

import { Project, Task, BudgetLineItem } from '../types/projects';
import { computeReadiness } from './readiness';

/**
 * Minimum opted-in cosplayers before any aggregate is shown.
 *
 * THRESHOLD DECISION (flagged explicitly): 3.
 * With 3+ participants a single average no longer identifies an individual,
 * and it is the smallest cohort that still gives an organizer an actionable
 * signal. Below 3 we withhold rather than round, because "average 62%" across
 * 2 people is trivially reversible to one person's score.
 */
export const MIN_OPTED_IN = 3;

export interface MissingComponentTally {
  component_id: string;
  count: number;
}

export interface EventReadinessAggregate {
  event_id: string;
  /** True when opted_in_count >= MIN_OPTED_IN and numbers may be shown. */
  isPublishable: boolean;
  opted_in_count: number;
  /** Null whenever isPublishable is false. */
  average_readiness: number | null;
  /** Descending by count. Empty whenever isPublishable is false. */
  common_missing_components: MissingComponentTally[];
  /** Always present so the UI can explain a withheld aggregate. */
  threshold_note: string;
}

export interface AggregateInputs {
  eventId: string;
  projects: Project[];
  getTasksForProject: (projectId: string) => Task[];
  getBudgetForProject: (projectId: string) => BudgetLineItem[];
}

export const computeEventReadinessAggregate = ({
  eventId,
  projects,
  getTasksForProject,
  getBudgetForProject,
}: AggregateInputs): EventReadinessAggregate => {
  // Step 1: narrow to opted-in projects linked to THIS event. Everything
  // downstream reads only this list, so non-opted-in data cannot leak in.
  const optedIn = projects.filter(
    (project) => project.linked_event_id === eventId && project.opted_in_readiness_sharing === true
  );

  const optedInCount = optedIn.length;

  if (optedInCount < MIN_OPTED_IN) {
    return {
      event_id: eventId,
      isPublishable: false,
      opted_in_count: optedInCount,
      average_readiness: null,
      common_missing_components: [],
      threshold_note: `Needs at least ${MIN_OPTED_IN} opted-in cosplayers to show a group signal.`,
    };
  }

  // Step 2: score each opted-in project. Results stay local to this function;
  // only the aggregate is returned.
  const readinessList = optedIn.map((project) =>
    computeReadiness({
      project,
      projectTasks: getTasksForProject(project.project_id),
      projectBudget: getBudgetForProject(project.project_id),
    })
  );

  const average =
    readinessList.reduce((sum, readiness) => sum + readiness.readiness_score, 0) /
    readinessList.length;

  // Step 3: tally missing component types across the opted-in cohort only.
  const componentCounts = new Map<string, number>();
  for (const readiness of readinessList) {
    for (const componentId of readiness.missing_components) {
      componentCounts.set(componentId, (componentCounts.get(componentId) ?? 0) + 1);
    }
  }

  const commonMissingComponents: MissingComponentTally[] = [...componentCounts.entries()]
    .map(([componentId, count]) => ({ component_id: componentId, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.component_id.localeCompare(b.component_id)))
    .slice(0, 3);

  return {
    event_id: eventId,
    isPublishable: true,
    opted_in_count: optedInCount,
    average_readiness: Math.round(average * 100) / 100,
    common_missing_components: commonMissingComponents,
    threshold_note: '',
  };
};
