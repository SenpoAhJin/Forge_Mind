import type { ComponentType, ReferenceReview, ReviewedComponent } from '../types/referenceExtraction';
import type { Project, Task } from '../types/projects';

export const SOURCE_LABELS = { own: 'Own it', buy: 'Buy it', make: 'Make it' } as const;
export const SLOT_LABELS: Record<ComponentType, string> = { wig: 'Wig', top: 'Top', gloves: 'Gloves', bottom: 'Bottom', shoes: 'Shoes', accessory: 'Accessory' };
export const confirmedComponents = (review?: ReferenceReview | null) => review?.confirmed ? review.components : [];
export const componentLabel = (component: ReviewedComponent) => component.value.type === 'accessory' ? component.value.name : SLOT_LABELS[component.value.type];
export const LEAD_DAYS = { buy: 21, make: 28, style: 7, 'break-in': 7 } as const;
export const DIFFICULTY = {
  buy: { beginner: 1, intermediate: 1, advanced: 1, expert: 1 },
  make: { beginner: 3, intermediate: 2, advanced: 1, expert: 1 },
  style: { beginner: 2, intermediate: 1, advanced: 1, expert: 1 },
  'break-in': { beginner: 1, intermediate: 1, advanced: 1, expert: 1 },
} as const;
export const difficultyLabel = (rating?: number | null) => rating === 3 ? 'Hard' : rating === 2 ? 'Medium' : 'Easy';
export function dateDay(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use a valid YYYY-MM-DD date.');
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error('Use a valid YYYY-MM-DD date.');
  return time;
}
export function manilaToday(now = new Date()): string {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
export function countdown(target?: string | null, today = manilaToday()): string {
  if (!target) return 'No target date set.';
  const days = Math.round((dateDay(target) - dateDay(today)) / 86400000);
  return days < 0 ? `Target date has passed (${target}).` : days === 0 ? 'Target date is today.' : `${days} days until target date.`;
}
/** Only generated tasks belonging to this project are replaced; manual tasks survive. */
export function generateTasks(project: Project, review: ReferenceReview | null, existing: Task[], now: string): Task[] {
  const generated = confirmedComponents(review).flatMap(component => {
    const types: NonNullable<Task['task_type']>[] = component.value.plan === 'own' ? [] : [component.value.plan];
    if (component.value.type === 'wig') types.push('style');
    if (component.value.type === 'shoes') types.push('break-in');
    return types.map(type => {
      const id = `generated:${project.project_id}:${component.id}:${type}`;
      const previous = existing.find(task => task.task_id === id && task.project_id === project.project_id && task.generated);
      return { task_id: id, project_id: project.project_id, generated: true, component_id: component.id, task_type: type,
        task_description: type === 'style' ? 'Style wig' : type === 'break-in' ? 'Break in shoes' : `${type === 'buy' ? 'Buy' : 'Make/dye'} ${componentLabel(component)}`,
        due_date: project.target_completion_date ? new Date(dateDay(project.target_completion_date) - LEAD_DAYS[type] * 86400000).toISOString().slice(0, 10) : null,
        difficulty_rating: DIFFICULTY[type][project.stated_skill_level], task_order: 0,
        status: previous?.status ?? 'pending', actual_completion_date: previous?.actual_completion_date ?? null,
        created_at: previous?.created_at ?? now, updated_at: now } satisfies Task;
    });
  }).sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || a.task_id.localeCompare(b.task_id))
    .map((task, index) => ({ ...task, task_order: index + 1 }));
  return [...existing.filter(task => task.project_id !== project.project_id || !task.generated), ...generated];
}
