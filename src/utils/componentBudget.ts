import type { ComponentType, ReferenceReview, ReviewedComponent } from '../types/referenceExtraction';
import type { BudgetLineItem, Project } from '../types/projects';
import { componentLabel, confirmedComponents } from './componentPlanning';

export const ESTIMATE_LABEL = 'Rule-based estimate, not live prices';
export const PRICE_TABLE: Record<ComponentType, readonly [number, number]> = {
  wig: [400, 1200], top: [300, 900], bottom: [300, 800], gloves: [100, 400], shoes: [500, 1500], accessory: [100, 500],
};
export const MATERIAL_FACTORS: Record<string, number> = { fabric: 1, cotton: 1, polyester: 1, leather: 2, foam: 1.2, metal: 2.5, synthetic: 1 };
export function priceRange(component: ReviewedComponent): readonly [number, number] {
  if (component.value.plan === 'own') return [0, 0];
  const factor = MATERIAL_FACTORS[component.value.material.trim().toLowerCase()] ?? 1;
  return PRICE_TABLE[component.value.type].map(amount => Math.round(amount * factor)) as [number, number];
}
/** Existing line items carry estimates and expenses; generated estimate actual=0. */
export function generateBudget(project: Project, review: ReferenceReview | null, existing: BudgetLineItem[], now: string): BudgetLineItem[] {
  return [...existing.filter(line => line.project_id !== project.project_id || !line.generated),
    ...confirmedComponents(review).map(component => {
      const [min, max] = priceRange(component);
      return { budget_line_item_id: `estimate:${project.project_id}:${component.id}`, project_id: project.project_id,
        component_id: component.id, generated: true, item_name: componentLabel(component), category: 'material' as const,
        estimate_min: min, planned_amount: max, actual_amount: 0, created_at: now, updated_at: now };
    })];
}
export const ALTERNATIVES = [{ slot: 'gloves', material: 'leather', replacement: 'fabric gloves', saving: 300 }] as const;
export function budgetSummary(project: Project, review: ReferenceReview | null, lines: BudgetLineItem[]) {
  const estimates = confirmedComponents(review).filter(component => component.value.plan !== 'own').map(component => ({ component, range: priceRange(component) }));
  const estimateMin = estimates.reduce((sum, item) => sum + item.range[0], 0);
  const estimateTotal = estimates.reduce((sum, item) => sum + item.range[1], 0);
  const spent = lines.filter(line => line.project_id === project.project_id).reduce((sum, line) => sum + line.actual_amount, 0);
  const budget = project.stated_budget;
  const overrun = budget == null ? 0 : Math.max(0, Math.max(estimateTotal, spent) - budget);
  const culprit = estimates.sort((a, b) => b.range[1] - a.range[1] || a.component.id.localeCompare(b.component.id))[0]?.component ?? null;
  const option = culprit ? ALTERNATIVES.find(item => item.slot === culprit.value.type && item.material === culprit.value.material.trim().toLowerCase()) : undefined;
  return { budget, estimateMin, estimateTotal, spent, overrun, overBudget: overrun > 0, culprit,
    cheaper: option ? { ...option, remaining: Math.max(0, overrun - option.saving),
      description: `${option.replacement}: approximate saving ₱${option.saving}.${overrun > option.saving ? ` Remaining overrun ₱${overrun - option.saving}.` : ''}` } : null };
}
export function expenseLine(projectId: string, name: string, amount: string, id: string, now: string): BudgetLineItem {
  const number = Number(amount);
  if (!name.trim()) throw new Error('Enter an expense name.');
  if (!amount.trim() || !Number.isFinite(number) || number <= 0) throw new Error('Enter a positive expense amount.');
  return { budget_line_item_id: id, project_id: projectId, item_name: name.trim(), category: 'other', planned_amount: 0,
    actual_amount: number, created_at: now, updated_at: now };
}
